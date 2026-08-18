// ingest/loadEnv.js
// Loads .env.local then .env from the current working directory into process.env,
// so the standalone ingest server gets the SAME database + config the Next.js app
// gets (Next auto-loads these; plain `node` does not). Zero-dependency parser.
// Imported FIRST by ingest/server.js so the DB pool sees DATABASE_URL before it
// is created. Values already set in the real environment win (so `$env:VAR=...`
// still overrides the file).
import fs from "fs";
import path from "path";

function loadFile(file) {
  try {
    if (!fs.existsSync(file)) return false;
    const txt = fs.readFileSync(file, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (val.startsWith("#")) continue;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    return true;
  } catch { return false; }
}

// Read the same env files Next.js does, PRODUCTION included (on a VPS the real
// DATABASE_URL usually lives in .env.production). First file to set a var wins,
// so the more specific / local files come first.
const root = process.cwd();
const files = [
  ".env.production.local", ".env.development.local", ".env.local",
  ".env.production", ".env.development", ".env",
];
const loaded = files.filter((f) => loadFile(path.join(root, f)));

if (loaded.length) console.log(`[ingest] loaded env from: ${loaded.join(", ")}`);
else console.warn(`[ingest] no .env* file found in ${root} — relying on the shell environment.`);
