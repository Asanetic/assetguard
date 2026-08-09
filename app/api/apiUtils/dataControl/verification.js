// app/api/apiUtils/dataControl/verification.js
// Create + check OTP codes for email/phone verification.

import crypto from "node:crypto";
import { query } from "../s_env/db.js";

const TTL_MIN = Number(process.env.OTP_TTL_MIN || 10);
const MAX_ATTEMPTS = 5;

export function genCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Normalize the target so send + confirm + register all match. */
export function normTarget(channel, target) {
  if (channel === "phone") return String(target || "").replace(/\s+/g, "");
  return String(target || "").trim().toLowerCase();
}

/** Create + store a fresh code; returns the code (to be sent, never returned to client). */
export async function createCode(channel, target) {
  const code = genCode();
  const t = normTarget(channel, target);
  await query(
    `INSERT INTO verification_codes (channel, target, code, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [channel, t, code, String(TTL_MIN)]
  );
  return code;
}

/** Check a submitted code; consumes it on success. */
export async function verifyCode(channel, target, code) {
  const t = normTarget(channel, target);
  const { rows } = await query(
    `SELECT id, code, attempts FROM verification_codes
      WHERE channel = $1 AND target = $2 AND consumed = false AND expires_at > now()
      ORDER BY created_at DESC LIMIT 1`,
    [channel, t]
  );
  const row = rows[0];
  if (!row) return { ok: false, error: "Code expired — request a new one" };
  if (row.attempts >= MAX_ATTEMPTS)
    return { ok: false, error: "Too many attempts — request a new code" };

  if (String(code || "").trim() !== row.code) {
    await query(`UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
    return { ok: false, error: "That code is not right" };
  }
  await query(`UPDATE verification_codes SET consumed = true WHERE id = $1`, [row.id]);
  return { ok: true };
}

/** True if this target was verified (consumed a code) in the last 30 minutes. */
export async function hasVerified(channel, target) {
  const t = normTarget(channel, target);
  const { rows } = await query(
    `SELECT 1 FROM verification_codes
      WHERE channel = $1 AND target = $2 AND consumed = true
        AND created_at > now() - interval '30 minutes'
      LIMIT 1`,
    [channel, t]
  );
  return rows.length > 0;
}
