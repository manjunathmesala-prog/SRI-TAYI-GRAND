const fs = require('fs');
const path = require('path');

function searchFiles(dir, keywords) {
  let matches = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      matches = matches.concat(searchFiles(fullPath, keywords));
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const kw of keywords) {
          if (line.toLowerCase().includes(kw) && !line.includes('// ignore-audit')) {
            matches.push({
              file: path.relative('src', fullPath).replace(/\\/g, '/'),
              line: idx + 1,
              keyword: kw,
              snippet: line.trim().slice(0, 100)
            });
            break;
          }
        }
      });
    }
  }
  return matches;
}

const keywords = ['mock_', 'mockdata', 'dummy', 'fake_', 'sample_booking', 'test_booking', 'hardcoded'];
const results = searchFiles(path.resolve('src/lib'), keywords);
console.log(`Found ${results.length} occurrences in src/lib:`);
results.forEach(r => console.log(`${r.file}:${r.line} [${r.keyword}] ${r.snippet}`));
