const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory() && !file.includes('node_modules')) { 
        results = results.concat(walk(file));
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    });
  } catch (e) {
    // ignore
  }
  return results;
}

const dirsToCheck = ['./app', './components'];
let files = [];
dirsToCheck.forEach(d => {
  files = files.concat(walk(d));
});

let updatedCount = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('@/constants/Theme')) {
    content = content.replace(/@\/constants\/Theme/g, '@/constants/theme');
    fs.writeFileSync(f, content);
    console.log('Fixed:', f);
    updatedCount++;
  }
});
console.log('Fixed ' + updatedCount + ' files.');
