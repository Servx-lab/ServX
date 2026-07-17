const fs = require('fs');
const path = require('path');
const pkgs = new Set();
const nativeModules = ['crypto', 'path', 'fs', 'http', 'https', 'stream', 'util', 'events', 'zlib', 'url'];

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  if (fs.statSync(dir).isFile()) {
    processFile(dir);
    return;
  }
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) scan(p);
    else processFile(p);
  });
}

function processFile(p) {
  if (p.endsWith('.ts') || p.endsWith('.js')) {
    const txt = fs.readFileSync(p, 'utf8');
    const matches = [...txt.matchAll(/(?:import|require)\s*\(\s*['"]([^'"]+)['"]/g), ...txt.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g), ...txt.matchAll(/require\(['"]([^'"]+)['"]\)/g)];
    matches.forEach(m => {
      const imp = m[1];
      if (!imp.startsWith('.') && !imp.startsWith('@servx') && !nativeModules.includes(imp)) {
        let pkgName = imp.startsWith('@') ? imp.split('/')[0] + '/' + imp.split('/')[1] : imp.split('/')[0];
        pkgs.add(pkgName);
      }
    });
  }
}

scan('C:/PROJECTS/main projects/servx/apps/api/src');
scan('C:/PROJECTS/main projects/servx/apps/api/services');
scan('C:/PROJECTS/main projects/servx/apps/api/server.js');

const pkgJson = JSON.parse(fs.readFileSync('C:/PROJECTS/main projects/servx/apps/api/package.json'));
const deps = Object.keys(pkgJson.dependencies || {});
const devDeps = Object.keys(pkgJson.devDependencies || {});

const missing = [...pkgs].filter(p => !deps.includes(p) && !devDeps.includes(p) && !p.startsWith('node:'));
console.log('Missing dependencies:', missing);
