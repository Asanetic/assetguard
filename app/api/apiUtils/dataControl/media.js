// app/api/apiUtils/dataControl/media.js
// Site photos captured from the mobile app: the bytes plus the metadata that
// was imprinted on them.
//
// The image lives in Postgres as `bytea` rather than on disk. There is no file
// storage anywhere else in this app to follow, and a filesystem path is the one
// thing that does not survive a container restart or a second instance — the
// photo and the row that describes it stay together this way.
//
// Photos are capped client-side and again here, so the table grows at roughly
// 300 KB a capture.
import { query } from "../s_env/db.js";

let ensuring = null;

/**
 * Makes sure the table is there, creating it only if it genuinely is not.
 *
 * This project has no migration runner, so a route that needs a new table has
 * to cope with its absence. Prefer running site_photos.sql as the database
 * owner — then this function never issues DDL at all.
 */
export async function ensureMediaTable() {
  // Memoised PROMISE, not a boolean: two concurrent first-requests would both
  // see `false` and both run the DDL, and `CREATE TABLE IF NOT EXISTS` is
  // documented as not being race-free — concurrent runs can fail on
  // pg_type_typname_nsp_index. This way the second caller awaits the first.
  if (ensuring) return ensuring;
  ensuring = (async () => {
    // PROBE FIRST, and not with CREATE TABLE IF NOT EXISTS. That statement
    // resolves the target schema and checks CREATE permission on it BEFORE it
    // takes the "already exists" shortcut, so on Postgres 15+ — where `public`
    // no longer grants CREATE to PUBLIC — it raises 42501 for an ordinary app
    // role even when the table is sitting right there. Verified against
    // Postgres 16: the same role that INSERTs happily gets "permission denied
    // for schema public" from IF NOT EXISTS on a table it can already write.
    // A production app role should not hold DDL rights, so this asks a
    // question it is always allowed to ask.
    const probe = await query(`SELECT to_regclass('public.site_photos') AS t`);
    if (probe.rows[0]?.t) return;

    await query(`
    CREATE TABLE IF NOT EXISTS site_photos (
      id           SERIAL PRIMARY KEY,
      -- BIGINT: sites.id is bigserial (see dataControl/sites.js, which casts
      -- to bigint[]), and an int4 key would cap out at 2^31.
      site_id      BIGINT REFERENCES sites(id) ON DELETE CASCADE,
      site_code    TEXT,
      site_name    TEXT,
      photo_type   TEXT NOT NULL DEFAULT 'Before works',
      device_id    TEXT,
      technician   TEXT,
      status       TEXT NOT NULL DEFAULT 'In progress',
      lat          DOUBLE PRECISION,
      lng          DOUBLE PRECISION,
      accuracy_m   DOUBLE PRECISION,
      taken_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      imprinted    BOOLEAN NOT NULL DEFAULT TRUE,
      mime         TEXT NOT NULL DEFAULT 'image/jpeg',
      bytes        INTEGER NOT NULL DEFAULT 0,
      image        BYTEA NOT NULL,
      captured_by  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    // Every read is "this site, newest first".
    await query(
      `CREATE INDEX IF NOT EXISTS site_photos_site_taken_idx
         ON site_photos (site_id, taken_at DESC)`
    );
  })().catch((err) => {
    // Let the next request try again rather than caching the failure forever.
    ensuring = null;
    // 42501 here means the table is absent AND this role cannot create it.
    // Re-labelled so the route can say what to do about it: the raw
    // "permission denied for schema public" sends you looking at the INSERT,
    // which is the one thing that is fine.
    if (String(err?.code) === "42501") {
      const missing = new Error(
        "site_photos does not exist and this database role cannot create it — " +
          "run site_photos.sql as the database owner."
      );
      missing.code = "SITE_PHOTOS_MISSING";
      throw missing;
    }
    throw err;
  });
  return ensuring;
}

const numericOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const META = `id, site_id, site_code, site_name, photo_type, device_id, technician,
              status, lat, lng, accuracy_m, taken_at, imprinted, mime, bytes,
              captured_by, created_at`;

/** Newest first. Never selects `image` — that is what the byte route is for. */
/**
 * Newest first. Never selects `image` — that is what the byte route is for.
 *
 * @param captured_by when set, only that person's captures. The Capture screen's
 *   Log tab passes it: a technician's log is THEIR log, and an unscoped list
 *   would hand every signed-in user every site's photos, complete with GPS fix
 *   and the name of whoever was standing there.
 */
export async function listPhotos({ site_id, captured_by, limit = 50 } = {}) {
  await ensureMediaTable();
  const capped = Math.min(Number(limit) || 50, 200);

  const where = [];
  const params = [];
  if (site_id !== undefined && site_id !== null && site_id !== "") {
    params.push(numericOrNull(site_id));
    where.push(`site_id = $${params.length}`);
  }
  if (captured_by) {
    params.push(captured_by);
    where.push(`captured_by = $${params.length}`);
  }
  params.push(capped);

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT ${META} FROM site_photos ${clause}
      ORDER BY taken_at DESC, id DESC LIMIT $${params.length}`,
    params
  );
  return rows;
}

/**
 * The bytes, plus just enough metadata to name the file on the way out.
 *
 * site_code/photo_type/taken_at ride along because a download saved as "37" —
 * the row id — is useless the moment it leaves the browser, and these photos
 * get attached to emails and reports.
 */
export async function getPhotoBytes(id) {
  await ensureMediaTable();
  const { rows } = await query(
    `SELECT image, mime, site_code, site_name, photo_type, taken_at
       FROM site_photos WHERE id = $1`,
    [Number(id)]
  );
  return rows[0] || null;
}

export async function getPhotoMeta(id) {
  await ensureMediaTable();
  const { rows } = await query(`SELECT ${META} FROM site_photos WHERE id = $1`, [Number(id)]);
  return rows[0] || null;
}

export async function insertPhoto(row, buffer) {
  await ensureMediaTable();
  const { rows } = await query(
    `INSERT INTO site_photos
       (site_id, site_code, site_name, photo_type, device_id, technician, status,
        lat, lng, accuracy_m, taken_at, imprinted, mime, bytes, image, captured_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, now()),$12,$13,$14,$15,$16)
     RETURNING ${META}`,
    [
      // Coerced here as well as in listPhotos: the Android client's Site.id is
      // a string, and an unparseable one would raise 22P02 rather than the
      // 23503 the route knows how to turn into a 422.
      numericOrNull(row.site_id), row.site_code ?? null, row.site_name ?? null,
      row.photo_type || "Before works", row.device_id ?? null, row.technician ?? null,
      row.status || "In progress",
      row.lat ?? null, row.lng ?? null, row.accuracy_m ?? null,
      row.taken_at ?? null, row.imprinted !== false,
      row.mime || "image/jpeg", buffer.length, buffer, row.captured_by ?? null,
    ]
  );
  return rows[0];
}

export async function deletePhoto(id) {
  await ensureMediaTable();
  const { rowCount } = await query(`DELETE FROM site_photos WHERE id = $1`, [Number(id)]);
  return rowCount;
}
