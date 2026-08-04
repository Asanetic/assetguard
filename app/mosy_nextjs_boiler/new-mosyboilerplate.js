#!/usr/bin/env node
/**
 * Installs the Mosy Next.js boilerplate into an existing project folder.
 * Lives in mainapps/ (shared) instead of being duplicated into each app.
 *
 * Usage (run from mainapps/, project folder must already exist):
 *   node setup-boilerplate.js supershipping
 *   -> installs into mainapps/supershipping/app
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const appName = process.argv[2];
const zipUrl = 'https://github.com/Asanetic/nextjs_lightpeed/blob/main/mosy_nextjs_boiler.zip?raw=true';

/* ================= VALIDATION ================= */

if (!appName || appName.trim() === '') {
  console.error('❌ Please provide an app name.');
  console.error('   Usage: node setup-boilerplate.js <app-name>');
  process.exit(1);
}

if (!/^[a-zA-Z0-9-_]+$/.test(appName)) {
  console.error(`❌ Invalid app name "${appName}". Use only letters, numbers, hyphens, underscores.`);
  process.exit(1);
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
if (WINDOWS_RESERVED.test(appName)) {
  console.error(`❌ "${appName}" is a reserved name on Windows and can't be used as a folder name.`);
  process.exit(1);
}

if (/[. ]$/.test(appName)) {
  console.error(`❌ App name can't end with a dot or space.`);
  process.exit(1);
}

const projectRoot = path.join(__dirname, appName);
const appFolder = path.join(projectRoot, 'app');
const zipPath = path.join(appFolder, 'mosy_nextjs_boiler.zip');

// The target project should already exist (e.g. created via scaffold-project.js).
// This script installs the boilerplate INTO it, it doesn't create the project itself.
if (!fs.existsSync(projectRoot)) {
  console.error(`❌ Project folder not found: ${projectRoot}`);
  console.error(`   Run scaffold-project.js first to create "${appName}", then re-run this script.`);
  process.exit(1);
}

/* ================= HELPERS ================= */

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

function removeIfExists(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function moveContentsUp(sourceDir, destDir) {
  for (const file of fs.readdirSync(sourceDir)) {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    removeIfExists(destPath); // overwrite mode, matches original PHP behavior
    fs.renameSync(srcPath, destPath);
  }
  fs.rmdirSync(sourceDir);
}

/* ================= MAIN ================= */

(async () => {
  console.log(`📁 Installing boilerplate into ${appFolder}`);
  fs.mkdirSync(appFolder, { recursive: true });

  console.log('⬇️  Downloading boilerplate...');
  await download(zipUrl, zipPath);

  if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 1000) {
    console.error('❌ Download failed or incomplete');
    removeIfExists(zipPath);
    process.exit(1);
  }

  console.log('📦 Extracting...');
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(appFolder, true);

  const extracted = path.join(appFolder, 'mosy_nextjs_boiler');
  if (!fs.existsSync(extracted)) {
    console.error('❌ Extracted folder "mosy_nextjs_boiler" not found — check the zip contents.');
    process.exit(1);
  }

  console.log('🚚 Moving files into app/...');
  moveContentsUp(extracted, appFolder);
  fs.unlinkSync(zipPath);

  // 🔁 rename frontend demo -> appname
  const frontendDemo = path.join(appFolder, 'demo');
  const frontendTarget = path.join(appFolder, appName);

  if (fs.existsSync(frontendDemo)) {
    removeIfExists(frontendTarget);
    fs.renameSync(frontendDemo, frontendTarget);
    console.log('✅ Frontend route renamed (app/demo -> app/' + appName + ')');
  } else {
    console.warn('⚠️  Frontend demo folder missing — skipped rename.');
  }

  // 🔁 rename api/demo -> api/appname
  const apiDemo = path.join(appFolder, 'api', 'demo');
  const apiTarget = path.join(appFolder, 'api', appName);

  if (fs.existsSync(apiDemo)) {
    removeIfExists(apiTarget);
    fs.renameSync(apiDemo, apiTarget);
    console.log('✅ API route renamed (app/api/demo -> app/api/' + appName + ')');
  } else {
    console.warn('⚠️  API demo folder missing — skipped rename.');
  }

  // 📝 write package.json
  const packageJson = {
    name: appName,
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      mysql2: '^3.14.1',
      next: '15.3.3',
      nprogress: '^0.2.0',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      'react-icons': '^5.5.0',
      recharts: '^2.15.3',
      xlsx: '^0.18.5',
    },
  };

  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log('📝 package.json written');

  // 📝 write starter app/page.js
  const starterPage = `import AuthPage from "./auth/login/page";
import mosyThemeConfigs from "./appConfigs/mosyTheme";

export async function generateMetadata() {
  const appName = mosyThemeConfigs.mosyAppName || "Mosy";

  return {
    title: \`Welcome to \${appName}\`,
    description: \`\${appName}\`,
    icons: {
      icon: "/logo.png"
    },
  };
}

export default function Home() {
  return (
    <>
      <AuthPage baseRoot="auth/" />
    </>
  );
}
`;

  fs.writeFileSync(path.join(appFolder, 'page.js'), starterPage);
  console.log('📝 app/page.js written');

  console.log(`✅ Boilerplate installed for: ${appName}`);
})();