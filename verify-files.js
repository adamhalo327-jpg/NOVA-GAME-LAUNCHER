'use strict';
const fs = require('node:fs');
const path = require('node:path');
const files = ['package.json','src/main.js','src/preload.js','src/renderer.js','src/library.js','src/index.html','src/styles.css'];
let failed = false;
for (const file of files) {
  const p = path.resolve(__dirname,'..',file);
  const exists = fs.existsSync(p) && fs.statSync(p).size > 100;
  console.log(`${exists ? 'OK' : 'MISSING/EMPTY'}: ${file}`);
  if (!exists) failed = true;
}
const preload = fs.existsSync(path.resolve(__dirname,'../src/preload.js')) ? fs.readFileSync(path.resolve(__dirname,'../src/preload.js'),'utf8') : '';
const renderer = fs.existsSync(path.resolve(__dirname,'../src/renderer.js')) ? fs.readFileSync(path.resolve(__dirname,'../src/renderer.js'),'utf8') : '';
const main = fs.existsSync(path.resolve(__dirname,'../src/main.js')) ? fs.readFileSync(path.resolve(__dirname,'../src/main.js'),'utf8') : '';
if (!preload.includes("exposeInMainWorld('nova'") || !renderer.includes('window.nova') || !main.includes("'library:list'")) {
  console.error('IPC mismatch or placeholder file detected. Restore all src files from this ZIP.');
  failed = true;
}
if (failed) process.exit(1);
