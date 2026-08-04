#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const { spawnSync } = require('child_process');
const AdmZip = require('adm-zip');

const appName = process.argv[2];
const zipUrl = 'https://github.com/Asanetic/nextjs_lightpeed/blob/main/next_js_terminal.zip?raw=true';

/* ================= VALIDATION ================= */

// 1. Empty / missing folder name
if (!appName || appName.trim() === '') {
  console.error('❌ Please provide an app name.');
  console.error('   Usage: node scaffold-project.js <app-name>');
  process.exit(1);
}

// Guard against path-breaking characters (slashes, spaces, etc.)
if (!/^[a-zA-Z0-9-_]+$/.test(appName)) {
  console.error(`❌ Invalid app name "${appName}". Use only letters, numbers, hyphens, underscores.`);
  process.exit(1);
}

// Windows reserved device names (illegal as folder names on Windows)
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
if (WINDOWS_RESERVED.test(appName)) {
  console.error(`❌ "${appName}" is a reserved name on Windows and can't be used as a folder name.`);
  process.exit(1);
}

// Trailing dot or space is silently stripped by Windows and can cause mismatches
if (/[. ]$/.test(appName)) {
  console.error(`❌ App name can't end with a dot or space.`);
  process.exit(1);
}

const projectFolder = path.join(__dirname, appName);

// 2. Similar/duplicate folder name check on destination (mainapps/)
function normalize(name) {
  return name.toLowerCase().replace(/[-_]/g, '');
}

const existingFolders = fs
  .readdirSync(__dirname, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const targetNormalized = normalize(appName);
const conflict = existingFolders.find((folder) => normalize(folder) === targetNormalized);

if (conflict) {
  console.error(`❌ A similarly named app already exists: "${conflict}"`);
  console.error(`   Requested: "${appName}" -> normalized: "${targetNormalized}"`);
  console.error('   Choose a more distinct name to avoid confusion.');
  process.exit(1);
}

// Exact existence check (belt and braces, in case normalize misses an edge case)
if (fs.existsSync(projectFolder)) {
  console.error(`❌ ${projectFolder} already exists.`);
  process.exit(1);
}

/* ================= DOWNLOAD HELPER ================= */

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

/* ================= PROMPT HELPER ================= */

function askYesNo(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^(y|yes)$/i.test(answer.trim()));
    });
  });
}

/* ================= MAIN ================= */

(async () => {
  console.log(`📁 Creating ${projectFolder}`);
  fs.mkdirSync(projectFolder, { recursive: true });

  const zipPath = path.join(projectFolder, 'terminal.zip');

  console.log('⬇️  Downloading template...');
  await download(zipUrl, zipPath);

  if (fs.statSync(zipPath).size < 1000) {
    console.error('❌ Download failed or incomplete');
    fs.rmSync(projectFolder, { recursive: true, force: true });
    process.exit(1);
  }

  console.log('📦 Extracting...');
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(projectFolder, true);

  console.log('🚚 Moving files up...');
  const extracted = path.join(projectFolder, 'next_js_terminal');
  for (const file of fs.readdirSync(extracted)) {
    fs.renameSync(path.join(extracted, file), path.join(projectFolder, file));
  }
  fs.rmdirSync(extracted);
  fs.unlinkSync(zipPath);

  console.log('🧬 Writing blueprint...');
  fs.mkdirSync(path.join(projectFolder, 'appdna'), { recursive: true });
  fs.writeFileSync(
    path.join(projectFolder, 'appdna/blueprint.php'),
    '<?php\n// blueprint content here (snippet 1168 equivalent)\n'
  );

  console.log(`✅ Project '${appName}' ready at ${projectFolder}`);

  const runNext = await askYesNo('\n👉 SET UP the Next.js boilerplate? (y/n) ');

  if (runNext) {
    const boilerplateScript = path.join(__dirname, 'new-mosyboilerplate.js');

    if (!fs.existsSync(boilerplateScript)) {
      console.error(`❌ setup-boilerplate.js not found at ${boilerplateScript}`);
      process.exit(1);
    }

    console.log(`\n🚀 Running: node setup-boilerplate.js ${appName}\n`);
    const result = spawnSync('node', [boilerplateScript, appName], { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error('❌ setup-boilerplate.js exited with an error.');
      process.exit(result.status || 1);
    }
  } else {
    console.log(`\nℹ️  Skipped. Run it later with: node new-mosyboilerplate.js ${appName}`);
  }
})();