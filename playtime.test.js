'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {addPlaytime,getPlaytimeMs,readLibrary,writeLibrary,normalizeGame} = require('../src/library');
test('new games begin with zero playtime', () => {
  const game = normalizeGame({name:'Test',type:'web',target:'https://example.com'});
  assert.equal(game.playtimeMs,0);
});
test('elapsed milliseconds accumulate across sessions', () => {
  const game = {playtimeMs:0};
  addPlaytime(game,123456); addPlaytime(game,98765);
  assert.equal(game.playtimeMs,222221);
});
test('old saved libraries missing playtime are safely upgraded in memory', () => {
  const game = {plays:99};
  assert.equal(getPlaytimeMs(game),0);
  assert.equal(addPlaytime(game,15000),15000);
  assert.equal(game.plays,99);
});
test('invalid negative time never reduces playtime', () => {
  const game = {playtimeMs:5000};
  addPlaytime(game,-100000); addPlaytime(game,NaN);
  assert.equal(game.playtimeMs,5000);
});
test('time is persisted across file reload', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'nova-playtime-'));
  try {
    const file = path.join(dir,'games.json');
    const game = normalizeGame({name:'Test',type:'web',target:'https://example.com'});
    addPlaytime(game,143000); writeLibrary(file,[game]);
    assert.equal(readLibrary(file)[0].playtimeMs,143000);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
