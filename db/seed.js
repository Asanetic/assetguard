// db/seed.js
// Seeds a super-admin login + a few sample PENDING registrations so you can
// exercise the full registration -> login -> approval loop immediately.
//
// Run AFTER schema.sql:   npm run db:seed   (or: node db/seed.js)

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// --- load .env.local (a plain `node` script doesn't do this automatically) ---
function loadEnvLocal() {
  if (process.env.DATABASE_URL) return; // already set (e.g. inline)
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const text = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      let val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* no .env.local — fall back to whatever is in the environment */
  }
}
loadEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Add it to .env.local, or run:\n" +
      '  $env:DATABASE_URL="postgres://postgres:PASSWORD@localhost:5432/assetguard"; node db/seed.js'
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function companyId(client, name) {
  const { rows } = await client.query(
    "SELECT id FROM companies WHERE name = $1",
    [name]
  );
  return rows[0] ? rows[0].id : null;
}

async function main() {
  const client = await pool.connect();
  try {
    // ---- Super admin (can log in immediately) ----
    const adminPw = "Admin1234";
    const adminHash = await bcrypt.hash(adminPw, 10);
    const symphony = await companyId(client, "Symphony Technologies Limited");

    const adminEmail = "admin@symphony.co.ke";
    await client.query(
      `INSERT INTO users (name, email, phone, company_id, role, status, password,
                          email_verified, phone_verified, approved_at)
       VALUES ($1,$2,$3,$4,'superadmin','Active',$5,true,true,now())
       ON CONFLICT (email) DO UPDATE
         SET password = EXCLUDED.password, role = 'superadmin', status = 'Active'`,
      ["Grace Wambui", adminEmail, "+254 700 777 888", symphony, adminHash]
    );

    // ---- Sample pending registrations (awaiting approval) ----
    const falcon = await companyId(client, "Falcon Guard Ltd");
    const pending = [
      ["Caroline Wanjiru", "c.wanjiru@symphony.co.ke", "+254 720 884 512", symphony, "Wanjiru2026"],
      ["Kevin Otieno",     "k.otieno@falconguard.co.ke", "+254 719 220 703", falcon, "Otieno2026"],
      ["Nancy Chebet",     "n.chebet@falconguard.co.ke", "+254 726 551 048", falcon, "Chebet2026"],
    ];
    for (const [name, email, phone, cid, pw] of pending) {
      const hash = await bcrypt.hash(pw, 10);
      await client.query(
        `INSERT INTO users (name, email, phone, company_id, status, password,
                            email_verified, phone_verified)
         VALUES ($1,$2,$3,$4,'Pending',$5,true,true)
         ON CONFLICT (email) DO NOTHING`,
        [name, email, phone, cid, hash]
      );
    }

    console.log("Seeded:");
    console.log(`  Super admin -> ${adminEmail} / ${adminPw}`);
    console.log("  3 pending registrations for you to approve in the admin Users screen");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
