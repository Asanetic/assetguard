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
 * NESTED BUNDLES: --nest=<parentFolder> groups the module under an extra
 * parent folder (e.g. a "sales" bucket holding several sub-modules), and
 * --split-list-profile pulls the list/ and profile/ page folders OUT of
 * the module root so they become their own sibling folders next to it,
 * named "<module><suffix>" (suffix defaults to "list"/"profile", override
 * with --list-suffix= / --profile-suffix=). dataControl/uiControl/
 * logicControl stay put inside the normal module folder either way.
 *
 *   node clone-module.js Template DailySales --app=superpos --nest=sales --split-list-profile
 *   -> clones  app/superpos/sales/dailysales/          (dataControl, uiControl, logicControl)
 *              app/superpos/sales/dailysaleslist/       (was list/)
 *              app/superpos/sales/dailysalesprofile/    (was profile/)
 *              app/api/superpos/sales/dailysales/ ...same split applied on the API side
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
const nestArg = args.find((a) => a.startsWith('--nest='))?.split('=')[1];
const splitListProfile = args.includes('--split-list-profile');
const listSuffix = args.find((a) => a.startsWith('--list-suffix='))?.split('=')[1] || 'list';
const profileSuffix = args.find((a) => a.startsWith('--profile-suffix='))?.split('=')[1] || 'profile';

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
// --nest inserts an additional grouping folder (e.g. "sales") for the
// DESTINATION only: app/<app>/<nest>/<module>. The template source is NOT
// expected to live inside the nest folder — it's a shared golden copy that
// sits at the normal app/<app>/ level regardless of where clones land.
const projectRoot = process.cwd();
const frontendSourceBase = path.join(projectRoot, 'app', ...(appArg ? [appArg] : []));
const backendSourceBase = path.join(projectRoot, 'app', 'api', ...(appArg ? [appArg] : []));
const frontendDestBase = path.join(frontendSourceBase, ...(nestArg ? [nestArg] : []));
const backendDestBase = path.join(backendSourceBase, ...(nestArg ? [nestArg] : []));

const PAIRS = [
  { src: path.join(frontendSourceBase, sourceFolderName), dest: path.join(frontendDestBase, toLower) },
  { src: path.join(backendSourceBase, sourceFolderName), dest: path.join(backendDestBase, toLower) },
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

// Folder names eligible for --split-list-profile pull-out. Matched
// case-insensitively against the SOURCE folder name (before renameTokens),
// since "list" and "profile" are fixed Mosy conventions, not entity words.
const SPLIT_FOLDER_NAMES = new Set(['list', 'profile']);

// isRoot is true only for the very first call per module (frontend or
// backend base) — split-out only ever applies to list/profile sitting
// directly under the module root, never to nested folders that happen to
// be named "list" or "profile" deeper in the tree.
function cloneDir(src, dest, destRoot, isRoot = false, splitOpts = null) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (isRoot && splitOpts && entry.isDirectory() && SPLIT_FOLDER_NAMES.has(entry.name.toLowerCase())) {
      const suffix = entry.name.toLowerCase() === 'list' ? splitOpts.listSuffix : splitOpts.profileSuffix;
      const siblingDest = path.join(path.dirname(dest), `${toLower}${suffix}`);
      console.log(`   ↳ splitting "${entry.name}/" out -> ${path.relative(projectRoot, siblingDest)}`);
      // Fresh recycle root for the split-out folder — its own "_recycled"
      // lives inside itself, same convention as every other module folder.
      cloneDir(path.join(src, entry.name), siblingDest, siblingDest, false, null);
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destName = renameTokens(entry.name);
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      cloneDir(srcPath, destPath, destRoot, false, null);
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

const splitOpts = splitListProfile ? { listSuffix, profileSuffix } : null;

for (const { src, dest } of existingPairs) {
  // dest is also the recycled-backup root for everything under it, so
  // backups land at <dest>/_recycled/... mirroring the real folder structure.
  cloneDir(src, dest, dest, true, splitOpts);
  console.log(`✅ ${path.relative(projectRoot, src)} -> ${path.relative(projectRoot, dest)}`);
}

const schemaPath = path.join('app', ...(appArg ? [appArg] : []), ...(nestArg ? [nestArg] : []), toLower, 'schema.js').split(path.sep).join('/');
console.log(`\n👉 Now edit ${schemaPath} — that's the only file that needs changing.`);
console.log(`👉 Then run db-cli.js to create the "${toLower}" table.`);
if (splitListProfile) {
  const listPath = path.join('app', ...(appArg ? [appArg] : []), ...(nestArg ? [nestArg] : []), `${toLower}${listSuffix}`).split(path.sep).join('/');
  const profilePath = path.join('app', ...(appArg ? [appArg] : []), ...(nestArg ? [nestArg] : []), `${toLower}${profileSuffix}`).split(path.sep).join('/');
  console.log(`👉 List page split out to ${listPath}, profile page split out to ${profilePath} — point their internal imports/links at ${schemaPath.replace('/schema.js', '')} if they don't already.`);
}