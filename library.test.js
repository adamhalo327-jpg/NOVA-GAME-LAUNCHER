'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {normalizeGame,readLibrary,writeLibrary,isWebUrl} = require('../src/library');
test('accepts HTTPS games and rejects dangerous schemes',() => {
  assert.equal(isWebUrl('https://example.com/game'), true);
  assert.equal(isWebUrl('javascript:alert(1)'), false);
  assert.equal(isWebUrl('file:///c:/game.html'), false);
  assert.throws(()=>normalizeGame({name:'Bad',type:'web',target:'javascript:alert(1)'}));
});
test('normalizes Windows executables',() => {
  const g=normalizeGame({name:' My Game ',type:'local',target:path.resolve('MyGame.exe')});
  // Windows paths need Windows host for path.isAbsolute; in CI on Windows this must pass.
  assert.equal(g.name,'My Game'); assert.equal(g.type,'local');
});
test('persists the library',() => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-test-'));
  try {const file=path.join(dir,'games.json');const games=[normalizeGame({name:'Web',type:'web',target:'https://example.org'})];writeLibrary(file,games);assert.deepEqual(readLibrary(file),games);}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
});
