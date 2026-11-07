
const fs = require('node:fs');
const path = require('node:path');

const requiredFiles = [
  'package.json',
  'src/main.js',
  'src/preload.js',
  'src/renderer.js',
  'src/library.js',
  'src/index.html',
  'src/styles.css'
];

let errors = 0;

for (const file of requiredFiles) {
  const fullPath = path.join(process.cwd(), file);

  if (fs.existsSync(fullPath)) {
    console.log(`OK: ${file}`);
  } else {
    console.error(`BRAK: ${file}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`Brakuje ${errors} plikow projektu.`);
  process.exit(1);
}

console.log('NOVA GAME LAUNCHER: wszystkie wymagane pliki istnieja.');
