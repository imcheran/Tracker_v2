const fs = require('fs');
const path = require('path');

const dir = './components';

const replacements = [
  { from: /from-orange-500 to-amber-400/g, to: 'from-indigo-500 to-purple-500' },
  { from: /from-orange-600 to-amber-500/g, to: 'from-indigo-600 to-purple-600' },
  { from: /bg-orange-500/g, to: 'bg-indigo-500' },
  { from: /bg-orange-600/g, to: 'bg-indigo-600' },
  { from: /bg-orange-50/g, to: 'bg-indigo-50' },
  { from: /bg-orange-100/g, to: 'bg-indigo-100' },
  { from: /bg-orange-900\/40/g, to: 'bg-indigo-900/40' },
  { from: /text-orange-500/g, to: 'text-indigo-500' },
  { from: /text-orange-600/g, to: 'text-indigo-600' },
  { from: /border-orange-500/g, to: 'border-indigo-500' },
  { from: /border-orange-400/g, to: 'border-indigo-400' },
  { from: /border-orange-200/g, to: 'border-indigo-200' },
  { from: /border-orange-100/g, to: 'border-indigo-100' },
  { from: /ring-orange-500/g, to: 'ring-indigo-500' },
  { from: /ring-orange-400/g, to: 'ring-indigo-400' },
  { from: /shadow-orange-500/g, to: 'shadow-indigo-500' },
  { from: /shadow-orange-400/g, to: 'shadow-indigo-400' },
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      for (const { from, to } of replacements) {
        if (from.test(content)) {
          content = content.replace(from, to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

walk(dir);
walk('./src');
if (fs.existsSync('./App.tsx')) {
    let content = fs.readFileSync('./App.tsx', 'utf8');
    let changed = false;
    for (const { from, to } of replacements) {
    if (from.test(content)) {
        content = content.replace(from, to);
        changed = true;
    }
    }
    if (changed) {
    fs.writeFileSync('./App.tsx', content, 'utf8');
    console.log(`Updated App.tsx`);
    }
}
