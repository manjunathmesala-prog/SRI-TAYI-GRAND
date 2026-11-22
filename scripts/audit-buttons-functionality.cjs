const fs = require('fs');
const path = require('path');

const targetDirs = [
  'src/app/admin/dashboard',
  'src/app/admin/expenses',
  'src/app/admin/staff/attendance',
  'src/app/admin/night-audit',
  'src/app/admin/convention-hall',
  'src/app/admin/accounting',
  'src/app/admin/walk-in',
  'src/app/admin/front-desk',
  'src/app/admin/bookings',
  'src/app/admin/rooms/categories',
  'src/app/admin/rfid',
  'src/components/admin'
];

console.log('🔍 ACCURATE AUDIT FOR DEAD BUTTONS & EMPTY HANDLERS...\n');

let issues = [];

function checkFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  
  // 1. Check for literally empty onClick handlers like onClick={() => {}} or onClick={() => void 0}
  const emptyClickRegex = /onClick=\{?\s*\(.*?\)\s*=>\s*\{\s*\}\s*\}?/g;
  let match;
  while ((match = emptyClickRegex.exec(code)) !== null) {
    const lineNum = code.substring(0, match.index).split('\n').length;
    issues.push({
      type: 'Empty onClick Handlers',
      file: path.relative(process.cwd(), filePath),
      line: lineNum,
      snippet: match[0]
    });
  }

  // 2. Check for onClick without handler or dead href="#"
  const deadLinkRegex = /<a[^>]+href=[\"']#[\"'][^>]*>/g;
  while ((match = deadLinkRegex.exec(code)) !== null) {
    const lineNum = code.substring(0, match.index).split('\n').length;
    issues.push({
      type: 'Dead Link (href="#")',
      file: path.relative(process.cwd(), filePath),
      line: lineNum,
      snippet: match[0]
    });
  }

  // 3. Check for buttons with no onClick, no type="submit" inside form, or disabled indefinitely
  // Let's find <button ...> tags
  const buttonRegex = /<button\b([^>]*)>(.*?)<\/button>/gs;
  while ((match = buttonRegex.exec(code)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const lineNum = code.substring(0, match.index).split('\n').length;

    const hasOnClick = /onClick\s*=/.test(attrs);
    const isSubmit = /type\s*=\s*['"]submit['"]/.test(attrs);
    const isReset = /type\s*=\s*['"]reset['"]/.test(attrs);
    const hasForm = /form\s*=/.test(attrs);

    if (!hasOnClick && !isSubmit && !isReset && !hasForm) {
      issues.push({
        type: 'Button Without Handler or Submit Action',
        file: path.relative(process.cwd(), filePath),
        line: lineNum,
        snippet: `<button ${attrs.trim().slice(0, 60)}...>${inner.trim().slice(0, 30)}</button>`
      });
    }
  }

  // 4. Check for placeholder alert()
  const alertRegex = /alert\([\"'][^\"']+[\"']\)/g;
  while ((match = alertRegex.exec(code)) !== null) {
    const lineNum = code.substring(0, match.index).split('\n').length;
    issues.push({
      type: 'Browser alert() instead of UI feedback',
      file: path.relative(process.cwd(), filePath),
      line: lineNum,
      snippet: match[0]
    });
  }
}

targetDirs.forEach(dir => {
  const fullDir = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullDir)) return;

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    files.forEach(f => {
      const p = path.join(currentDir, f);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        walk(p);
      } else if (f.endsWith('.tsx') || f.endsWith('.jsx')) {
        checkFile(p);
      }
    });
  }

  walk(fullDir);
});

console.log(`Found ${issues.length} potential items:`);
issues.forEach((iss, i) => {
  console.log(`\n[${i + 1}] ${iss.type}`);
  console.log(`   File: ${iss.file}:${iss.line}`);
  console.log(`   Code: ${iss.snippet.replace(/\n\s+/g, ' ')}`);
});
