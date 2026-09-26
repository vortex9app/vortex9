'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'web');

const FILES = [
  'index.html',
  'config.js',
  'avatars.js',
  'supabase.js',
  'human-design.js',
  'academy-curriculum.js',
  'commerce.js',
  'academy.js',
  'user-feed.js',
  'character.jpg',
  'llms.txt',
  'feed.xml',
  'atom.xml',
  'sitemap.xml',
  'robots.txt'
];

const DIRS = ['public', 'vortex9'];

function copyFile(rel) {
  const from = path.join(root, rel);
  const to = path.join(out, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(rel) {
  const from = path.join(root, rel);
  if (!fs.existsSync(from)) return;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) copyDir(child);
    else if (entry.isFile()) copyFile(child);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
FILES.forEach(copyFile);
DIRS.forEach(copyDir);

const bytes = fs.readdirSync(out, { recursive: true })
  .map((rel) => path.join(out, rel))
  .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
  .reduce((sum, file) => sum + fs.statSync(file).size, 0);

console.log('Assembled web/ (' + (bytes / 1024 / 1024).toFixed(2) + ' MB)');
