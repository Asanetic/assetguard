const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'assetguard', 'app/assetguard');

const folders = fs.readdirSync(targetDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const routes = {};

for (const name of folders) {
  routes[name] = {
    base: `/api/assetguard/${name}/${name}`,
    delete: `/api/assetguard/${name}/delete`,
    import: `/api/assetguard/${name}/${name}/import`,
  };
}

fs.writeFileSync(
  path.join(__dirname, 'generatedRoutes.json'),
  JSON.stringify(routes, null, 4)
);

console.log(`Generated routes for ${folders.length} modules:`, folders);