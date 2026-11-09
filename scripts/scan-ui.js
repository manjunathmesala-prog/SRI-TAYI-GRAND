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

// 1. Gather all existing routes in app directory
function getRoutes(dir, currentRoute = '') {
  const entries = fs.readdirSync(dir);
  let routes = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      // Dynamic route like [id] or group like (admin)
      const nextRoute = currentRoute + '/' + entry;
      routes = routes.concat(getRoutes(full, nextRoute));
    } else if (entry === 'page.tsx' || entry === 'page.jsx') {
      routes.push(currentRoute === '' ? '/' : currentRoute);
    }
  }
  return routes;
}

const existingRoutes = getRoutes('src/app');
console.log('--- ALL REGISTERED ROUTES (' + existingRoutes.length + ') ---');
existingRoutes.sort().forEach(r => console.log('Route:', r));

// 2. Scan for Link hrefs and router.push in all files
console.log('\n--- SCANNING LINKS & ROUTER PUSH DESTINATIONS ---');
const linksFound = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  // match href="..." or href={'...'} or href={`...`}
  const linkRegex = /href=["']([^"']+)["']/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    if (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
      linksFound.push({ file, href, type: 'Link' });
    }
  }

  // match router.push("...") or router.push('...')
  const pushRegex = /router\.push\(["']([^"']+)["']\)/g;
  while ((match = pushRegex.exec(content)) !== null) {
    const dest = match[1];
    linksFound.push({ file, href: dest, type: 'router.push' });
  }
}

console.log('Total internal navigation links extracted:', linksFound.length);

// 3. Match links against existing routes (handling dynamic params)
function routeMatches(targetHref, registeredRoutes) {
  // Strip query params and hash
  const cleanHref = targetHref.split('?')[0].split('#')[0];
  if (registeredRoutes.includes(cleanHref)) return true;
  
  // Try pattern matching for dynamic segments e.g. /rooms/[slug] or /booking/confirmation/[reference]
  for (const reg of registeredRoutes) {
    const regSegments = reg.split('/').filter(Boolean);
    const targetSegments = cleanHref.split('/').filter(Boolean);
    if (regSegments.length === targetSegments.length) {
      let match = true;
      for (let i = 0; i < regSegments.length; i++) {
        if (regSegments[i].startsWith('[') && regSegments[i].endsWith(']')) {
          continue; // dynamic match
        }
        if (regSegments[i] !== targetSegments[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }
  return false;
}

const brokenLinks = [];
for (const item of linksFound) {
  if (!routeMatches(item.href, existingRoutes)) {
    brokenLinks.push(item);
  }
}

console.log('\n--- POTENTIAL BROKEN LINKS OR 404 DESTINATIONS (' + brokenLinks.length + ') ---');
brokenLinks.forEach(b => console.log(`[BROKEN ${b.type}] In ${b.file}: ${b.href}`));
