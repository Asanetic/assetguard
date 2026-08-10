// app/api/apiUtils/authUtils/password.js
// -----------------------------------------------------------------------------
// Password hashing helpers (bcrypt). Never store or compare plaintext.
// -----------------------------------------------------------------------------

import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const ROUNDS = 10;

/** Generate a readable temp password: 2 upper, 4 lower, 3 digits (always has a number, >=8). */
export function generatePassword() {
  const U = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const L = "abcdefghijkmnopqrstuvwxyz";
  const D = "23456789";
  const pick = (set, n) =>
    Array.from({ length: n }, () => set[crypto.randomInt(0, set.length)]).join("");
  return pick(U, 2) + pick(L, 4) + pick(D, 3);
}

/** Hash a plaintext password for storage. */
export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), ROUNDS);
}

/** Compare a plaintext password against a stored hash. */
export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(String(plain), hash);
}
