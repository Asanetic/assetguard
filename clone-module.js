#!/usr/bin/env node
/**
 * Clones the module template into a new module, renaming every
 * case-variant of the entity word (PascalCase, lowercase, UPPERCASE)
 * in both filenames and file contents.
 *
 * Run from the PROJECT ROOT (e.g. C:\xampp\htdocs\nextv2\mainapps\superpos>) — no need to cd in.
 *
 *   node clone-module.js Template Clients --app=superpos --source=_mosy_template
 *   -> clones  app/superpos/_mosy_template        -> app/superpos/clients
 *              app/api/superpos/_mosy_template     -> app/api/superpos/clients
 *
 * If your project has no app-namespace folder (module lives directly under app/),
 * omit --app:
 *   node clone-module.js Template Clients
 *   -> clones  app/_mosy_module_template -> app/clients  (and api/ counterpart)
 *
 * SAFE TO RE-RUN: if the destination folder already exists, cloning proceeds
 * into it (files are merged in). If an individual destination FILE already
 * exists, it's moved into a "_recycled" folder inside that module (with a
 * timestamp appended for uniqueness) before the new file is written — so
 * nothing is ever silently overwritten or lost.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const [FromEntity, ToEntity] = args.filter((a) => !a.startsWith('--'));
const sourceArg = args.find((a) => a.startsWith('--source='))?.split('=')[1];
const appArg = args.find((a) => a.startsWith('--app='))?.split('=')[1];

if (!FromEntity || !ToEntity) {
  console.error('❌ Usage: node clone-module.js <FromEntity> <ToEntity> [--app=namespace] [--source=folderName]');
  console.error('   Example: node clone-module.js Template Clients --app=superpos --source=_mosy_template');
  process.exit(1);
}

if (!/^[A-Z][a-zA-Z0-9]*$/.test(FromEntity) || !/^[A-Z][a-zA-Z0-9]*$/.test(ToEntity)) {
  console.error('❌ Both entity names must be PascalCase, e.g. "Staff", "Client", "CreditNote".');
  process.exit(1);
}

const fromLower = FromEntity.toLowerCase();
const toLower = ToEntity.toLowerCase();
const fromUpper = FromEntity.toUpperCase();
const toUpper = ToEntity.toUpperCase();

const sourceFolderName = sourceArg || (FromEntity === 'Template' ? '_mosy_module_template' : fromLower);

// Run from project root always. --app inserts the namespace folder
// (e.g. "superpos") between app/ and the module, matching your real layout.
const projectRoot = process.cwd();
const frontendBase = appArg
  ? path.join(projectRoot, 'app', appArg)
  : path.join(projectRoot, 'app');
const backendBase = appArg
  ? path.join(projectRoot, 'app', 'api', appArg)
  : path.join(projectRoot, 'app', 'api');

const PAIRS = [
  { src: path.join(frontendBase, sourceFolderName), dest: path.join(frontendBase, toLower) },
  { src: path.join(backendBase, sourceFolderName), dest: path.join(backendBase, toLower) },
];

const existingPairs = PAIRS.filter((p) => fs.existsSync(p.src));

if (existingPairs.length === 0) {
  console.error(`❌ No source folder found. Looked for:`);
  PAIRS.forEach((p) => console.error(`   ${p.src}`));
  process.exit(1);
}

// Destination folders are allowed to already exist — we merge into them.
// Individual files that already exist get backed up (see backupExistingFile).
for (const { dest } of existingPairs) {
  if (fs.existsSync(dest)) {
    console.log(`ℹ️  Target folder already exists, merging into it: ${path.relative(projectRoot, dest)}`);
  }
}

// Text file extensions safe to search/replace inside. Everything else (images, fonts) copies as-is.
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss', '.md', '.html']);

function renameTokens(str) {
  return str
    .split(FromEntity).join(ToEntity)   // Staff -> Client
    .split(fromLower).join(toLower)      // staff -> client
    .split(fromUpper).join(toUpper);     // STAFF -> CLIENT
}

// One timestamp per run, shared by every backup made during this invocation —
// makes it easy to tell which files got recycled together. Includes
// milliseconds so two runs seconds (or less) apart never collide.
function buildRunTimestamp() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`;
}
const RUN_TIMESTAMP = buildRunTimestamp();

// Moves an existing destination file into "<destRoot>/_recycled/<same relative
// path>", with the run timestamp appended to the filename for uniqueness.
// Falls back to an incrementing suffix in the rare case that path is somehow
// still taken (e.g. clock skew) — a backup is NEVER silently overwritten.
function backupExistingFile(destPath, destRoot) {
  const relPath = path.relative(destRoot, destPath);
  const ext = path.extname(relPath);
  const withoutExt = relPath.slice(0, relPath.length - ext.length);

  let backupPath = path.join(destRoot, '_recycled', `${withoutExt}.${RUN_TIMESTAMP}${ext}`);
  let attempt = 1;
  while (fs.existsSync(backupPath)) {
    attempt += 1;
    backupPath = path.join(destRoot, '_recycled', `${withoutExt}.${RUN_TIMESTAMP}-${attempt}${ext}`);
  }

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.renameSync(destPath, backupPath);
  console.log(`   ♻️  existing file backed up -> ${path.relative(projectRoot, backupPath)}`);
}

function cloneDir(src, dest, destRoot) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destName = renameTokens(entry.name);
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      cloneDir(srcPath, destPath, destRoot);
    } else {
      if (fs.existsSync(destPath)) {
        backupExistingFile(destPath, destRoot);
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) {
        const content = fs.readFileSync(srcPath, 'utf8');
        fs.writeFileSync(destPath, renameTokens(content));
      } else {
        fs.copyFileSync(srcPath, destPath); // binary — copy untouched
      }
    }
  }
}

console.log(`📁 Cloning module "${fromLower}" -> "${toLower}"`);
console.log(`   ${FromEntity} -> ${ToEntity}`);
console.log(`   ${fromLower} -> ${toLower}`);
console.log(`   ${fromUpper} -> ${toUpper}\n`);

for (const { src, dest } of existingPairs) {
  // dest is also the recycled-backup root for everything under it, so
  // backups land at <dest>/_recycled/... mirroring the real folder structure.
  cloneDir(src, dest, dest);
  console.log(`✅ ${path.relative(projectRoot, src)} -> ${path.relative(projectRoot, dest)}`);
}

const schemaPath = appArg ? `app/${appArg}/${toLower}/schema.js` : `app/${toLower}/schema.js`;
console.log(`\n👉 Now edit ${schemaPath} — that's the only file that needs changing.`);
console.log(`👉 Then run db-cli.js to create the "${toLower}" table.`);