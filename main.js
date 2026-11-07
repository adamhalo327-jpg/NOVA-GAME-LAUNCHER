'use strict';
const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {normalizeGame, readLibrary, writeLibrary, isWebUrl} = require('./library');

let win;
let file;
let games = [];

function broadcast() { if (win && !win.isDestroyed()) win.webContents.send('library:changed', games); }
function save() { writeLibrary(file, games); broadcast(); }
function createWindow() {
  win = new BrowserWindow({
    width: 1250, height: 790, minWidth: 850, minHeight: 570,
    backgroundColor: '#0b1020', title: 'NOVA GAME LAUNCHER',
    autoHideMenuBar: true,
    webPreferences: {preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true}
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
}
function safeRun(exe) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [], {cwd: path.dirname(exe), detached: true, stdio: 'ignore', windowsHide: false});
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}
app.whenReady().then(() => {
  file = path.join(app.getPath('userData'), 'games.json');
  try { games = readLibrary(file); }
  catch (error) {
    dialog.showErrorBox('Błąd biblioteki', 'Nie można odczytać games.json: ' + error.message);
    games = [];
  }
  ipcMain.handle('library:list', () => games);
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
      await safeRun(game.target);
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
    fs.writeFileSync(result.filePath, JSON.stringify({version:1, games}, null, 2), 'utf8');
    return true;
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
