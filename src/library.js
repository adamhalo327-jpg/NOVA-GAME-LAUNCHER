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
  if (!name) throw new Error('Podaj nazwę gry.');
  if (target.length > 2048) throw new Error('Ścieżka lub adres są za długie.');
  if (type === 'web' && !isWebUrl(target)) throw new Error('Podaj poprawny adres HTTP lub HTTPS.');
  if (type === 'local' && (!path.isAbsolute(target) || path.extname(target).toLowerCase() !== '.exe')) {
    throw new Error('Wskaż poprawny plik EXE.');
  }
  return {id: crypto.randomUUID(), name, target, type, favorite: false, plays: 0, lastPlayed: null, addedAt: new Date().toISOString()};
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
module.exports = {isWebUrl, normalizeGame, readLibrary, writeLibrary};
