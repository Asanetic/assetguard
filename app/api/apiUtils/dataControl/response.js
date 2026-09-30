// app/api/apiUtils/dataControl/response.js
// Response logging (who is responding to an alarm) + field-response team
// membership (which field-response users belong to which team).
import { query } from "../s_env/db.js";

// The team a user belongs to (for the responder marker + the response log). Null
// when the user is in no team — the caller then falls back to the user's own name.
export async function teamForUser(userId) {
  if (!userId) return null;
  try {
    const { rows } = await query(
      `SELECT team_code, team_name FROM team_members WHERE user_id = $1 ORDER BY team_code LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  } catch { return null; }
}

// Record that someone started responding. De-duped per (alarm, user) so a repeat
// click doesn't stack rows. Returns the row (or null if already responding).
export async function recordResponse(alarmId, { by, userId, teamCode, teamName } = {}) {
  const { rows } = await query(
    `INSERT INTO alarm_responses (alarm_id, responder_by, responder_user_id, team_code, team_name)
       SELECT $1, $2, $3, $4, $5
        WHERE NOT EXISTS (
          SELECT 1 FROM alarm_responses WHERE alarm_id = $1 AND responder_user_id = $3
        )
     RETURNING *`,
    [alarmId, by || null, userId || null, teamCode || null, teamName || null]
  );
  return rows[0] || null;
}

export async function listResponses(alarmId) {
  if (!alarmId) return [];
  try {
    const { rows } = await query(
      `SELECT responder_by, team_code, team_name, started_at
         FROM alarm_responses WHERE alarm_id = $1 ORDER BY started_at ASC`,
      [alarmId]
    );
    return rows;
  } catch { return []; }
}

// ---- live responder positions ----------------------------------------------
// A responder broadcasts their position for a device; upserted per (device,user).
export async function upsertResponderPosition({ deviceId, userId, name, team, lat, lng, accuracy = null }) {
  if (!deviceId || !userId) return null;
  const { rows } = await query(
    `INSERT INTO responder_positions (device_id, user_id, name, team, lat, lng, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (device_id, user_id)
       DO UPDATE SET name = EXCLUDED.name, team = EXCLUDED.team,
                     lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = now()
     RETURNING *`,
    [deviceId, userId, name || null, team || null, lat ?? null, lng ?? null]
  );
  // Also append to the HISTORY table (append-only) so the responder's route can be
  // replayed later on Response Playback. Best-effort: a failure here (e.g. the
  // migration hasn't run yet) must never break the live position broadcast. Only
  // real fixes are recorded — a null position is a heartbeat, not a step on the map.
  if (lat != null && lng != null) {
    try {
      await query(
        `INSERT INTO responder_track (device_id, user_id, name, team, lat, lng, accuracy_m)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [deviceId, userId, name || null, team || null, lat, lng, accuracy ?? null]
      );
    } catch (e) {
      if (/relation .*responder_track.* does not exist/i.test(e?.message || ""))
        console.error("[responder_track] missing — run db/responder_track.sql to record responder routes.");
      else console.error("[responder_track] insert:", e?.message || e);
    }
  }
  return rows[0] || null;
}

// Active responders for a device (a fresh position within `sinceSec`). Every Track
// viewer reads this to draw the responder markers.
export async function listActiveResponders(deviceId, sinceSec = 90) {
  if (!deviceId) return [];
  try {
    const { rows } = await query(
      `SELECT user_id, name, team, lat, lng, updated_at
         FROM responder_positions
        WHERE device_id = $1 AND lat IS NOT NULL
          AND updated_at > now() - ($2 || ' seconds')::interval
        ORDER BY updated_at DESC`,
      [deviceId, String(sinceSec)]
    );
    return rows;
  } catch { return []; }
}

// ---- dispatch info (shown to a security user on acknowledge) ----------------
// Resolves, from the DB, where/who to send: the alarm's region + regional manager,
// its response cluster, the team(s) for that cluster and alternative teams.
async function withMembers(rows) {
  for (const t of rows) {
    try {
      const { rows: m } = await query(
        `SELECT u.name, u.phone, u.email FROM team_members tm JOIN users u ON u.id = tm.user_id
          WHERE tm.team_code = $1 ORDER BY u.name`, [t.code]);
      t.members = m;
    } catch { t.members = []; }
  }
  return rows;
}

export async function getDispatchInfo(alarmId) {
  const { rows: ar } = await query(`SELECT device_id, site FROM alarms WHERE id = $1 LIMIT 1`, [alarmId]);
  const alarm = ar[0];
  if (!alarm) return null;

  // alarm -> device -> site (for region + cluster); fall back to site name.
  let site = null;
  try {
    const { rows } = await query(
      `SELECT s.* FROM devices d JOIN sites s ON s.id = d.site_id WHERE btrim(d.device_id) = btrim($1) LIMIT 1`,
      [alarm.device_id]);
    site = rows[0] || null;
  } catch {}
  if (!site && alarm.site) {
    try { const { rows } = await query(`SELECT * FROM sites WHERE name = $1 LIMIT 1`, [alarm.site]); site = rows[0] || null; } catch {}
  }

  const region = site?.security_region || site?.region || null;
  let cluster = site?.response_cluster || null;
  if (!cluster && region) {
    try { const { rows } = await query(`SELECT name FROM response_clusters WHERE region = $1 ORDER BY sort LIMIT 1`, [region]); cluster = rows[0]?.name || null; } catch {}
  }

  // Regional manager — a security-regional (or country/manager) user scoped here.
  let manager = null;
  if (region) {
    try {
      const { rows } = await query(
        `SELECT name, email, phone, role FROM users
          WHERE role IN ('sec_regional','sec_country','company_mgr','asst_mgr')
            AND EXISTS (SELECT 1 FROM unnest(regions) AS ur WHERE lower(ur) = lower($1))
            AND lower(status) = 'active'
          ORDER BY (role = 'sec_regional') DESC, (role = 'sec_country') DESC LIMIT 1`, [region]);
      manager = rows[0] || null;
    } catch {}
  }

  let primary = [], alternatives = [];
  if (cluster) {
    try {
      primary = await withMembers((await query(
        `SELECT code, vehicle, phones, emails, company, sec_region FROM response_teams WHERE $1 = ANY(clusters) ORDER BY code`, [cluster])).rows);
    } catch {}
    const primaryCodes = new Set(primary.map((t) => t.code));
    let alt = [];
    try {
      // teams granted into this cluster, plus other teams in the same region
      const granted = (await query(
        `SELECT t.code, t.vehicle, t.phones, t.emails, t.company, t.sec_region
           FROM response_teams t JOIN response_team_grants g ON g.team_code = t.code WHERE g.cluster = $1`, [cluster])).rows;
      const regionTeams = region ? (await query(
        `SELECT code, vehicle, phones, emails, company, sec_region FROM response_teams WHERE sec_region = $1`, [region])).rows : [];
      const map = new Map();
      for (const t of [...granted, ...regionTeams]) if (!primaryCodes.has(t.code)) map.set(t.code, t);
      alt = await withMembers([...map.values()]);
    } catch {}
    alternatives = alt;
  }

  return {
    site: site ? { name: site.name, code: site.code } : { name: alarm.site || null },
    region, cluster, manager, primary, alternatives,
  };
}

// ---- response geography (regions + clusters, from tables) -------------------
// Everything below is DB-backed so Settings registrations persist and every picker
// (Add Site, Response Teams, facets) reflects them live — no static seed.
let _geoEnsured = false;
async function ensureGeo() {
  if (_geoEnsured) return;
  try {
    await query(`CREATE TABLE IF NOT EXISTS response_regions (id BIGSERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, sort INT NOT NULL DEFAULT 0)`);
    await query(`CREATE TABLE IF NOT EXISTS response_clusters (id BIGSERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, region TEXT, sort INT NOT NULL DEFAULT 0)`);
    // Contact columns for the Settings cluster editor (idempotent).
    await query(`ALTER TABLE response_clusters ADD COLUMN IF NOT EXISTS company   TEXT`);
    await query(`ALTER TABLE response_clusters ADD COLUMN IF NOT EXISTS rm        TEXT`);
    await query(`ALTER TABLE response_clusters ADD COLUMN IF NOT EXISTS rm_phones TEXT[]`);
    await query(`ALTER TABLE response_clusters ADD COLUMN IF NOT EXISTS rm_emails TEXT[]`);
    _geoEnsured = true;
  } catch (e) { console.error("[response geo] ensure:", e?.message || e); }
}

export async function listRegions() {
  await ensureGeo();
  try { const { rows } = await query(`SELECT name FROM response_regions ORDER BY sort, name`); return rows.map((r) => r.name); }
  catch { return []; }
}
export async function listClusters() {
  await ensureGeo();
  try { const { rows } = await query(`SELECT name, region FROM response_clusters ORDER BY sort, name`); return rows; }
  catch { return []; }
}
/** Clusters with the Settings-editor fields (company + regional manager contacts). */
export async function listClustersFull() {
  await ensureGeo();
  try {
    const { rows } = await query(
      `SELECT name, region, company, rm, rm_phones, rm_emails FROM response_clusters ORDER BY sort, name`
    );
    return rows.map((r) => ({
      name: r.name, region: r.region || "", company: r.company || "",
      rm: r.rm || "", rmPhones: r.rm_phones || [], rmEmails: r.rm_emails || [],
    }));
  } catch { return []; }
}
export async function saveRegion(name) {
  const n = String(name || "").trim();
  if (!n) throw new Error("region name required");
  await ensureGeo();
  await query(`INSERT INTO response_regions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [n]);
  return n;
}
export async function deleteRegion(name) {
  await ensureGeo();
  await query(`DELETE FROM response_regions WHERE name = $1`, [String(name || "").trim()]);
}
export async function saveCluster({ name, region = null, company = null, rm = null, rmPhones = [], rmEmails = [], originalName } = {}) {
  const n = String(name || "").trim();
  if (!n) throw new Error("cluster name required");
  await ensureGeo();
  if (originalName && originalName !== n) await query(`DELETE FROM response_clusters WHERE name = $1`, [originalName]);
  await query(
    `INSERT INTO response_clusters (name, region, company, rm, rm_phones, rm_emails)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (name) DO UPDATE
       SET region = EXCLUDED.region, company = EXCLUDED.company, rm = EXCLUDED.rm,
           rm_phones = EXCLUDED.rm_phones, rm_emails = EXCLUDED.rm_emails`,
    [n, region || null, company || null, rm || null, Array.isArray(rmPhones) ? rmPhones : [], Array.isArray(rmEmails) ? rmEmails : []]
  );
  return n;
}
export async function deleteCluster(name) {
  await ensureGeo();
  await query(`DELETE FROM response_clusters WHERE name = $1`, [String(name || "").trim()]);
}

// ---- team membership --------------------------------------------------------
export async function listTeamMembers(teamCode) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role
       FROM team_members m JOIN users u ON u.id = m.user_id
      WHERE m.team_code = $1 ORDER BY u.name`,
    [teamCode]
  );
  return rows;
}

// Replace a team's members in one shot (assign field-response users to the team).
export async function setTeamMembers(teamCode, teamName, userIds = []) {
  const ids = (userIds || []).map(Number).filter(Number.isFinite);
  await query(`DELETE FROM team_members WHERE team_code = $1`, [teamCode]);
  for (const uid of ids) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `INSERT INTO team_members (team_code, team_name, user_id) VALUES ($1, $2, $3)
       ON CONFLICT (team_code, user_id) DO UPDATE SET team_name = EXCLUDED.team_name`,
      [teamCode, teamName || null, uid]
    );
  }
  return ids.length;
}

// ---- Response teams CRUD (admin) -------------------------------------------
// The admin page used to keep these in memory; now they live in response_teams
// so a registration survives a reload and the dispatch popup sees the same list.

async function memberIdsFor(code) {
  try { return (await listTeamMembers(code)).map((m) => String(m.id)); }
  catch { return []; }
}

/** Every response team with its clusters, contacts, members — and the grants map. */
export async function listResponseTeams() {
  const { rows } = await query(
    `SELECT code, sec_region, phones, emails, company, clusters FROM response_teams ORDER BY code`
  );
  const teams = [];
  for (const t of rows) {
    // eslint-disable-next-line no-await-in-loop
    const memberIds = await memberIdsFor(t.code);
    teams.push({
      code: t.code, sec: t.sec_region || "", clusters: t.clusters || [],
      phones: t.phones || [], emails: t.emails || [], company: t.company || "", memberIds,
    });
  }
  const grants = {};
  try {
    const g = (await query(`SELECT team_code, cluster FROM response_team_grants`)).rows;
    for (const r of g) (grants[r.cluster] ||= []).push(r.team_code);
  } catch { /* table may not exist yet */ }
  return { teams, grants };
}

/** Create or update one response team (keyed by code). Renaming via originalCode. */
export async function saveResponseTeam({ code, sec, clusters = [], phones = [], emails = [], company, memberIds, originalCode } = {}) {
  const c = String(code || "").trim();
  if (!c) throw new Error("code required");
  if (originalCode && originalCode !== c) {
    await query(`DELETE FROM response_teams WHERE code = $1`, [originalCode]);
    await query(`UPDATE team_members SET team_code = $1, team_name = $1 WHERE team_code = $2`, [c, originalCode]);
    await query(`UPDATE response_team_grants SET team_code = $1 WHERE team_code = $2`, [c, originalCode]);
  }
  await query(
    `INSERT INTO response_teams (code, sec_region, phones, emails, company, clusters)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (code) DO UPDATE
       SET sec_region = EXCLUDED.sec_region, phones = EXCLUDED.phones,
           emails = EXCLUDED.emails, company = EXCLUDED.company, clusters = EXCLUDED.clusters`,
    [c, sec || null, phones, emails, company || null, clusters]
  );
  if (Array.isArray(memberIds)) await setTeamMembers(c, c, memberIds);
  return c;
}

export async function deleteResponseTeam(code) {
  await query(`DELETE FROM response_team_grants WHERE team_code = $1`, [code]);
  await query(`DELETE FROM team_members WHERE team_code = $1`, [code]);
  await query(`DELETE FROM response_teams WHERE code = $1`, [code]);
  return true;
}

export async function addTeamGrant(teamCode, cluster) {
  await query(`INSERT INTO response_team_grants (team_code, cluster) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [teamCode, cluster]);
}
export async function removeTeamGrant(teamCode, cluster) {
  await query(`DELETE FROM response_team_grants WHERE team_code = $1 AND cluster = $2`, [teamCode, cluster]);
}

// ---- NOC teams CRUD --------------------------------------------------------
export async function listNocTeams() {
  const { rows } = await query(
    `SELECT code, owner, company, covers, phones, emails FROM noc_teams ORDER BY company, code`
  );
  const out = [];
  for (const t of rows) {
    // eslint-disable-next-line no-await-in-loop
    const memberIds = await memberIdsFor(t.code);
    out.push({
      code: t.code, owner: t.owner || "mon", company: t.company || "",
      covers: t.covers || [], phones: t.phones || [], emails: t.emails || [], memberIds,
    });
  }
  return out;
}

export async function saveNocTeam({ code, owner = "mon", company, covers = [], phones = [], emails = [], memberIds, originalCode } = {}) {
  const c = String(code || "").trim();
  if (!c) throw new Error("code required");
  if (originalCode && originalCode !== c) {
    await query(`DELETE FROM noc_teams WHERE code = $1`, [originalCode]);
    await query(`UPDATE team_members SET team_code = $1, team_name = $1 WHERE team_code = $2`, [c, originalCode]);
  }
  await query(
    `INSERT INTO noc_teams (code, owner, company, covers, phones, emails)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (code) DO UPDATE
       SET owner = EXCLUDED.owner, company = EXCLUDED.company, covers = EXCLUDED.covers,
           phones = EXCLUDED.phones, emails = EXCLUDED.emails`,
    [c, owner === "sec" ? "sec" : "mon", company || null, covers, phones, emails]
  );
  if (Array.isArray(memberIds)) await setTeamMembers(c, c, memberIds);
  return c;
}

export async function deleteNocTeam(code) {
  await query(`DELETE FROM team_members WHERE team_code = $1`, [code]);
  await query(`DELETE FROM noc_teams WHERE code = $1`, [code]);
  return true;
}
