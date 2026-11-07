'use strict';
const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {normalizeGame, editGame, isValidCover, readLibrary, writeLibrary, isWebUrl, addPlaytime} = require('./library');

let win;
let file;
let games = [];
let settings = {nickname:'Gracz NOVA', theme:'purple'};
let settingsFile;
const activeSessions = new Map();
const now = () => Number(process.hrtime.bigint() / 1000000n);
function flushSession(session) {
  if (session.closed) return;
  const elapsed = Math.max(0, now() - session.lastSavedAt);
  session.lastSavedAt = now();
  const game = games.find(g => g.id === session.gameId);
  if (game && elapsed > 0) {addPlaytime(game, elapsed); save();}
}
function stopSession(session) {
  if (session.closed) return;
  flushSession(session);
  session.closed = true;
  activeSessions.delete(session.gameId);
  broadcast();
}
function stopAllSessions() {
  for (const session of [...activeSessions.values()]) stopSession(session);
}


function broadcast() { if (win && !win.isDestroyed()) win.webContents.send('library:changed', games); }
function save() { writeLibrary(file, games); broadcast(); }
function createWindow() {
  win = new BrowserWindow({
    width: 1250, height: 790, minWidth: 850, minHeight: 570,
    backgroundColor: '#0b1020', title: 'NOVA GAME LAUNCHER',
    autoHideMenuBar: true,
    webPreferences: {preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true}
  });
  const htmlPath = path.join(__dirname, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    dialog.showErrorBox('NOVA GAME LAUNCHER — brak pliku', 'Brakuje src/index.html w instalacji. Przywróć kompletne pliki projektu i zbuduj EXE ponownie.');
  } else {
    win.loadFile(htmlPath).catch(error => {
      dialog.showErrorBox('NOVA GAME LAUNCHER — błąd ładowania', String(error?.message || error));
    });
  }
  win.webContents.on('render-process-gone', (_event, details) => {
    dialog.showErrorBox('NOVA GAME LAUNCHER — awaria interfejsu', 'Proces wyświetlania zakończył działanie: ' + details.reason);
  });
  if (process.env.NOVA_DEBUG === '1') win.webContents.openDevTools({mode: 'detach'});
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
}
function safeRun(exe, gameId) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [], {cwd: path.dirname(exe), detached: true, stdio: 'ignore', windowsHide: false});
    child.once('error', reject);
    child.once('spawn', () => {
      const session = {gameId, lastSavedAt: now(), closed: false};
      activeSessions.set(gameId, session);
      const onFinish = () => stopSession(session);
      child.once('exit', onFinish);
      child.once('error', onFinish);
      resolve();
    });
  });
}
app.whenReady().then(() => {
  file = path.join(app.getPath('userData'), 'games.json');
  settingsFile = path.join(app.getPath('userData'), 'settings.json');
  try {settings = {...settings, ...JSON.parse(fs.readFileSync(settingsFile, 'utf8'))};} catch(error) {if(error.code !== 'ENOENT') console.error('Settings:', error.message);}
  try { games = readLibrary(file); }
  catch (error) {
    dialog.showErrorBox('Błąd biblioteki', 'Nie można odczytać games.json: ' + error.message);
    games = [];
  }
  ipcMain.handle('library:list', () => games);
  ipcMain.handle('game:active', () => [...activeSessions.keys()]);
  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:save', (_event, value) => {
    const nickname = String(value?.nickname || '').trim().slice(0, 35) || 'Gracz NOVA';
    const theme = ['purple','blue','red','gold'].includes(value?.theme) ? value.theme : 'purple';
    settings = {nickname, theme};
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
    return settings;
  });
  ipcMain.handle('game:edit', (_event, id, changes) => {
    const game = games.find(g => g.id === id);
    if (!game) throw new Error('Nie znaleziono gry.');
    Object.assign(game, editGame(game, changes)); save(); return game;
  });
  ipcMain.handle('game:cover', async (_event, id) => {
    const game = games.find(g => g.id === id);
    if (!game) throw new Error('Nie znaleziono gry.');
    const result = await dialog.showOpenDialog(win, {title:'Wybierz okładkę (PNG, JPG lub WEBP)', properties:['openFile'], filters:[{name:'Obrazy', extensions:['png','jpg','jpeg','webp']}]});
    if (result.canceled || !result.filePaths[0]) return false;
    const selected = result.filePaths[0];
    const ext = path.extname(selected).toLowerCase();
    const mime = {'.png':'png','.jpg':'jpeg','.jpeg':'jpeg','.webp':'webp'}[ext];
    if (!mime || fs.statSync(selected).size > 1_500_000) throw new Error('Wybierz obraz PNG/JPG/WEBP o rozmiarze maks. 1,5 MB.');
    const data = `data:image/${mime};base64,${fs.readFileSync(selected).toString('base64')}`;
    if (!isValidCover(data)) throw new Error('Nieprawidłowy obraz okładki.');
    game.cover = data; save(); return true;
  });
  ipcMain.handle('game:clearCover', (_event, id) => {
    const game = games.find(g => g.id === id);
    if (!game) throw new Error('Nie znaleziono gry.');
    game.cover = null; save(); return true;
  });
  ipcMain.handle('game:chooseExe', async () => {
    const result = await dialog.showOpenDialog(win, {title: 'Wybierz plik gry EXE', properties: ['openFile'], filters: [{name: 'Programy Windows', extensions: ['exe']}]});
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('game:add', (_event, input) => {
    const game = normalizeGame(input);
    if (games.some(g => g.type === game.type && g.target.toLowerCase() === game.target.toLowerCase())) throw new Error('Ta gra jest już w bibliotece.');
    games.unshift(game); save(); return game;
  });
  ipcMain.handle('game:remove', (_event, id) => {
    if (typeof id !== 'string') return false;
    const session = activeSessions.get(id);
    if (session) stopSession(session);
    const count = games.length; games = games.filter(g => g.id !== id);
    if (games.length === count) return false;
    save(); return true;
  });
  ipcMain.handle('game:favorite', (_event, id) => {
    const game = games.find(g => g.id === id);
    if (!game) throw new Error('Nie znaleziono gry.');
    game.favorite = !game.favorite; save(); return game.favorite;
  });
  ipcMain.handle('game:launch', async (_event, id) => {
    const game = games.find(g => g.id === id);
    if (!game) throw new Error('Nie znaleziono gry.');
    if (game.type === 'local') {
      if (!fs.existsSync(game.target)) throw new Error('Plik EXE nie istnieje. Możliwe, że gra została przeniesiona.');
      if (activeSessions.has(id)) throw new Error('Ta gra jest już uruchomiona przez NOVA.');
      await safeRun(game.target, id);
    } else {
      if (!isWebUrl(game.target)) throw new Error('Nieprawidłowy adres gry.');
      await shell.openExternal(game.target);
    }
    game.plays = (Number(game.plays) || 0) + 1;
    game.lastPlayed = new Date().toISOString();
    save(); return true;
  });
  ipcMain.handle('library:export', async () => {
    const result = await dialog.showSaveDialog(win, {title: 'Eksport biblioteki', defaultPath: 'nova-games-backup.json', filters: [{name:'JSON', extensions:['json']}]});
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, JSON.stringify({version:2, games}, null, 2), 'utf8');
    return true;
  });
  setInterval(() => {for (const session of activeSessions.values()) flushSession(session);}, 5000).unref();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

app.on('before-quit', stopAllSessions);
