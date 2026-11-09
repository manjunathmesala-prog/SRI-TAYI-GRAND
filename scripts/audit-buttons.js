const fs = require('fs');
const path = require('path');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') scanDir(fullPath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = scanDir('src');

console.log('=== DETAILED BUTTON & INTERACTIVE TRIGGER AUDIT ===');

let totalButtons = 0;
let buttonsWithoutHandler = 0;
let buttonsWithoutType = 0;
let buttonsWithLoading = 0;
let buttonsDisabledHandling = 0;

const deadButtons = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all <button ... > tags
  const buttonRegex = /<button([\s\S]*?)>/g;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    totalButtons++;
    const buttonAttrs = match[1];
    const hasOnClick = /onClick\s*=/.test(buttonAttrs);
    const hasTypeSubmit = /type\s*=\s*["']submit["']/.test(buttonAttrs);
    const hasDisabled = /disabled\b/.test(buttonAttrs);
    const hasLoading = /loading|isSubmitting|isLoading|isPending|isProcessing|isGenerating|isExecuting/i.test(buttonAttrs);
    
    if (hasLoading) buttonsWithLoading++;
    if (hasDisabled) buttonsDisabledHandling++;

    // If it neither has onClick nor type="submit", check if inside a form or custom
    if (!hasOnClick && !hasTypeSubmit) {
      buttonsWithoutHandler++;
      deadButtons.push({ file, snippet: match[0].slice(0, 100).replace(/\n/g, ' ') });
    }
  }
}

console.log('Total <button> elements:', totalButtons);
console.log('Buttons with explicit loading state:', buttonsWithLoading);
console.log('Buttons with disabled state:', buttonsDisabledHandling);
console.log('Buttons without direct onClick or type="submit":', buttonsWithoutHandler);
if (deadButtons.length > 0) {
  console.log('\nButtons without direct onClick or type="submit":');
  deadButtons.forEach(b => console.log(`  ${b.file} -> ${b.snippet}`));
}
