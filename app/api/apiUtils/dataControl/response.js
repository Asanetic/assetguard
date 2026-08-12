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
export async function upsertResponderPosition({ deviceId, userId, name, team, lat, lng }) {
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
            AND $1 = ANY(regions) AND lower(status) = 'active'
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
export async function listRegions() {
  try { const { rows } = await query(`SELECT name FROM response_regions ORDER BY sort, name`); return rows.map((r) => r.name); }
  catch { return []; }
}
export async function listClusters() {
  try { const { rows } = await query(`SELECT name, region FROM response_clusters ORDER BY sort, name`); return rows; }
  catch { return []; }
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
