const fs = require('fs');
const path = require('path');

function getFiles(dir, matchName) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, matchName));
    } else if (file === matchName) {
      results.push(fullPath);
    }
  });
  return results;
}

const appDir = path.resolve('src/app');
const pages = getFiles(appDir, 'page.tsx');
const apiRoutes = getFiles(appDir, 'route.ts');

console.log('--- ALL PAGES (' + pages.length + ') ---');
pages.forEach(p => console.log(path.relative(appDir, p).replace(/\\/g, '/')));

console.log('\n--- ALL API ROUTES (' + apiRoutes.length + ') ---');
apiRoutes.forEach(r => console.log(path.relative(appDir, r).replace(/\\/g, '/')));
