'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function isWebUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
}
function normalizeGame(value) {
  if (!value || typeof value !== 'object') throw new Error('Nieprawidłowe dane gry.');
  const name = String(value.name || '').trim().slice(0, 90);
  const target = String(value.target || '').trim();
  const type = value.type === 'web' ? 'web' : 'local';
  const category = String(value.category || 'Inne').trim().slice(0, 35) || 'Inne';
  if (!name) throw new Error('Podaj nazwę gry.');
  if (target.length > 2048) throw new Error('Ścieżka lub adres są za długie.');
  if (type === 'web' && !isWebUrl(target)) throw new Error('Podaj poprawny adres HTTP lub HTTPS.');
  if (type === 'local' && (!path.isAbsolute(target) || path.extname(target).toLowerCase() !== '.exe')) {
    throw new Error('Wskaż poprawny plik EXE.');
  }
  return {id: crypto.randomUUID(), name, target, type, category, cover: null, favorite: false, plays: 0, playtimeMs: 0, lastPlayed: null, addedAt: new Date().toISOString()};
}
function editGame(game, change) {
  if (!game || !change || typeof change !== 'object') throw new Error('Nieprawidłowa edycja.');
  const name = String(change.name || '').trim().slice(0, 90);
  if (!name) throw new Error('Nazwa gry jest wymagana.');
  const category = String(change.category || 'Inne').trim().slice(0, 35) || 'Inne';
  return {...game, name, category};
}
function isValidCover(data) {
  return typeof data === 'string' && data.length <= 2_800_000 &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data);
}
function readLibrary(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed.games)) return [];
    return parsed.games.filter(g => g && typeof g.id === 'string' && typeof g.name === 'string' && typeof g.target === 'string' && ['local','web'].includes(g.type));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
function writeLibrary(file, games) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({version: 1, games}, null, 2), {encoding: 'utf8', mode: 0o600});
  fs.renameSync(tmp, file);
}
function getPlaytimeMs(game) {
  const value = Number(game?.playtimeMs);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
function addPlaytime(game, elapsedMs) {
  const delta = Number(elapsedMs);
  if (!Number.isFinite(delta) || delta <= 0) return getPlaytimeMs(game);
  game.playtimeMs = getPlaytimeMs(game) + Math.floor(delta);
  return game.playtimeMs;
}
module.exports = {getPlaytimeMs, addPlaytime, isWebUrl, normalizeGame, editGame, isValidCover, readLibrary, writeLibrary};
