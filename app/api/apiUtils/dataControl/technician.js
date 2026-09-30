// app/api/apiUtils/dataControl/technician.js
// -----------------------------------------------------------------------------
// The technician app's data layer: on-site sessions and the work log.
//
// See db/technician.sql for why the two tables are separate — the session is a
// short-lived safety window with a hard expiry, the log is permanent history.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

/**
 * The longest a single on-site session may last.
 *
 * A session downgrades disturbance alarms at that site, so an unbounded one is a
 * hole: a technician whose phone dies would leave the site quietly deaf to real
 * disturbances. Two hours is comfortably longer than an install (the app asks
 * for ~15 minutes) and short enough that a forgotten session costs one afternoon
 * rather than forever.
 */
const MAX_SESSION_MINUTES = 120;

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

/**
 * Open an on-site window. Returns the created row.
 *
 * Any other session this technician still has open is closed first. A person is
 * in one place at a time, and leaving the previous site's window open — because
 * they drove off without pressing finish — is exactly the failure the expiry is
 * there to bound. Closing it here means the common case never relies on the
 * expiry at all.
 */
export async function openSession({
  technicianId,
  technicianName,
  siteId,
  deviceId,
  /** Every tracker this visit covers. See db/technician_devices.sql. */
  deviceIds,
  jobType,
  minutes,
}) {
  await closeSessionsFor(technicianId);

  const mins = Math.min(
    Math.max(Number(minutes) || 30, 1),
    MAX_SESSION_MINUTES
  );

  // Normalised here rather than trusted from the client: a visit always has a
  // list, even when it holds one tracker, and device_id stays populated with the
  // first so rows read by anything predating device_ids still make sense.
  const ids = (Array.isArray(deviceIds) ? deviceIds : [])
    .map((d) => String(d).trim())
    .filter(Boolean);
  if (!ids.length && deviceId) ids.push(String(deviceId));

  const { rows } = await query(
    `INSERT INTO technician_work_sessions
       (technician_id, technician_name, site_id, device_id, device_ids, job_type, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' minutes')::interval)
     RETURNING *`,
    [
      String(technicianId),
      technicianName || null,
      siteId == null || siteId === "" ? null : Number(siteId),
      ids[0] || deviceId || null,
      ids,
      jobType === "maintain" ? "maintain" : "install",
      String(mins),
    ]
  );
  return rows[0];
}

/** Close every open session belonging to this technician. */
export async function closeSessionsFor(technicianId) {
  const { rowCount } = await query(
    `UPDATE technician_work_sessions
        SET closed_at = now()
      WHERE technician_id = $1 AND closed_at IS NULL`,
    [String(technicianId)]
  );
  return rowCount;
}

/** This technician's open, unexpired session — or null. */
export async function activeSessionFor(technicianId) {
  const { rows } = await query(
    `SELECT * FROM technician_work_sessions
      WHERE technician_id = $1
        AND closed_at IS NULL
        AND expires_at > now()
      ORDER BY opened_at DESC
      LIMIT 1`,
    [String(technicianId)]
  );
  return rows[0] || null;
}

/**
 * Is anyone working on this site right now?
 *
 * Kept for callers that only have a site. The ingest path should use
 * [underTestReason] instead — see the note there about devices with no site.
 */
export async function isSiteUnderMaintenance(siteId, at = new Date()) {
  if (siteId == null || siteId === "") return false;
  const { rows } = await query(
    `SELECT 1 FROM technician_work_sessions
      WHERE site_id = $1
        AND closed_at IS NULL
        AND opened_at <= $2
        AND expires_at > $2
      LIMIT 1`,
    [Number(siteId), at]
  );
  return rows.length > 0;
}

/**
 * Is this DEVICE under test right now, and why — or why not?
 *
 * Two ways to match, and the second one is the whole reason this exists:
 *
 *   BY SITE    the device's site has an open technician job.
 *   BY DEVICE  the device is named in an open session's `device_ids`.
 *
 * Matching by site alone was a real bug, and it broke the exact case the app is
 * built for. A tracker being INSTALLED usually has no `site_id` yet — it is
 * unassigned stock, or preloaded against a different site — so
 * `devices.site_id` is NULL, the site lookup finds nothing, the packet takes the
 * real path, and the graduated rule quietly discards the technician's first
 * three shakes. No alarm row is ever written. The app polls for five minutes and
 * reports a working device as failed.
 *
 * The session already knows which trackers the visit covers: the app sends
 * `device_ids` when it opens one. Matching on that needs no schema change and
 * covers the unassigned device completely.
 *
 * Returns a REASON, not a boolean, because the caller logs it. "Not under test"
 * was previously indistinguishable from "under test but nothing happened", and
 * that ambiguity is what made this take three rounds to find.
 *
 * @returns {Promise<{underTest: boolean, sessionId: number|null, via: string}>}
 */
export async function underTestReason(
  { siteId, deviceIdText, deviceStatus = null },
  at = new Date()
) {
  const site = siteId == null || siteId === "" ? null : Number(siteId);
  const dev = deviceIdText ? String(deviceIdText) : null;

  // A device or site parked in Testing/Maintenance is under test for as long as
  // somebody leaves it that way. This predates the technician app — the notify
  // layer already relabelled such alarms "… – test" and dropped them to Low —
  // but it did so AFTER the row was inserted, which is why de-duplication never
  // saw them and the same device produced a new Disturbance row every uplink.
  //
  // Deciding it here, before the insert, is what collapses those duplicates:
  // the row is written as a test in the first place, so the one-per-device-and-
  // type rule applies to it like any other.
  const statusTest = (v) => /^(testing|maintenance)$/i.test(String(v || ""));
  if (statusTest(deviceStatus)) {
    return { underTest: true, sessionId: null, via: `device status ${deviceStatus}` };
  }
  if (site != null) {
    try {
      const { rows: sr } = await query(`SELECT status FROM sites WHERE id = $1`, [site]);
      if (sr[0] && statusTest(sr[0].status)) {
        return { underTest: true, sessionId: null, via: `site status ${sr[0].status}` };
      }
    } catch (e) { console.error("[underTest] site status lookup:", e?.message || e); }
  }

  if (site == null && dev == null) {
    return { underTest: false, sessionId: null, via: "no site and no device id" };
  }

  const { rows } = await query(
    `SELECT id,
            ($1::bigint IS NOT NULL AND site_id = $1::bigint) AS by_site,
            ($2::text   IS NOT NULL AND (
               $2 = ANY(device_ids) OR device_id = $2
             ))                                              AS by_device
       FROM technician_work_sessions
      WHERE closed_at IS NULL
        AND opened_at <= $3
        AND expires_at > $3
        AND (
              ($1::bigint IS NOT NULL AND site_id = $1::bigint)
              OR ($2::text IS NOT NULL AND ($2 = ANY(device_ids) OR device_id = $2))
            )
      ORDER BY opened_at DESC
      LIMIT 1`,
    [site, dev, at]
  );

  const row = rows[0];
  if (!row) {
    return {
      underTest: false,
      sessionId: null,
      via: `no open session for site ${site ?? "(none)"} or device ${dev ?? "(none)"}`,
    };
  }
  return {
    underTest: true,
    sessionId: row.id,
    via: row.by_site && row.by_device ? "site + device"
      : row.by_site ? "site"
      : "device",
  };
}

/* ------------------------------------------------------------------ */
/* The test-alarm poll                                                 */
/* ------------------------------------------------------------------ */

/**
 * "Has this device raised an alarm since `since`?"
 *
 * The step the whole wizard turns on: the technician disturbs the tracker and
 * the app waits for the device's own uplink to arrive. There was no way to ask
 * this before — `listAlarms` filters on priority, status and text, never on
 * device plus time.
 *
 * OLDEST first, deliberately. The first alarm after the countdown is the one the
 * technician caused; a later one may be a second shake or something unrelated,
 * and reporting that as the test result would credit the wrong event.
 *
 * `types` narrows to the alarm kinds a shake actually produces. Passing `null`
 * accepts anything from that device, which is the honest setting for an
 * installation where you care that the device reported AT ALL.
 */
export async function findTestAlarm({ deviceId, since, types = null }) {
  if (!deviceId || !since) return null;

  const params = [String(deviceId), since];
  let typeClause = "";

  if (Array.isArray(types) && types.length) {
    params.push(types.map((t) => `%${String(t).toLowerCase()}%`));
    typeClause = `
      AND (
        EXISTS (
          SELECT 1 FROM unnest($3::text[]) pat
           WHERE lower(coalesce(alarm_type, '')) LIKE pat
              OR lower(coalesce(name, ''))       LIKE pat
        )
      )`;
  }

  // The window is defended against the PHONE'S CLOCK.
  //
  // `since` is stamped on the handset. `created_at` is server time (now()),
  // deliberately, because trackers report wrong clocks. So a handset even a few
  // seconds fast makes `created_at > since` false for every alarm the test
  // raises, and the wizard reports a perfectly good device as failed — a failure
  // mode indistinguishable from a dead tracker, and one that would follow that
  // one technician's phone around all day.
  //
  //   LEAST(…, now() - 5s)    a fast phone cannot push the window past now
  //   GREATEST(…, now() - 10m) a slow phone cannot reach back and match an older
  //                            alarm; the whole test window is 5 minutes, so
  //                            nothing legitimate is older than this
  const { rows } = await query(
    `SELECT id, name, priority, device_id, site, alarm_type, source, status,
            lat, lng, created_at
       FROM alarms
      -- ANY over an ARRAY EXPRESSION, never ANY(SELECT <array>).
      --
      -- The SELECT form compares text against text[] and Postgres throws
      -- 'operator does not exist: text = text[]' — the whole route 500s, the
      -- wizard's poll never finds anything, and the Tests tab keeps working
      -- because it uses a different query. That combination is exactly what
      -- "the wizard doesn't pick up the alarm but the Tests screen shows it"
      -- looks like from the outside.
      --
      -- Accepts whichever identifier the phone sent — device_id, IMEI or primary
      -- key — and matches against the one the alarm actually carries.
      WHERE device_id = ANY(
              ARRAY[$1]::text[] || COALESCE(
                (SELECT ARRAY[COALESCE(NULLIF(d.device_id, ''), d.imei)]
                   FROM devices d
                  WHERE d.device_id = $1 OR d.imei = $1 OR d.id::text = $1
                  LIMIT 1),
                ARRAY[]::text[])
            )
        AND created_at > GREATEST(
              LEAST($2::timestamptz, now() - interval '5 seconds'),
              now() - interval '10 minutes'
            )
        ${typeClause}
      ORDER BY created_at ASC, id ASC
      LIMIT 1`,
    params
  );
  if (rows[0]) return rows[0];

  // FALLBACK: an open test alarm for this device, of any age within the window.
  //
  // Test alarms are de-duplicated — one open row per device per kind — so a
  // technician who retests finds no NEW row even though the tracker answered
  // perfectly the first time. Without this, de-duplication would fail the retry
  // and send them back to refit a working device.
  //
  // Returning the existing row is not a fudge. The question the poll asks is
  // "did this device report?", and the row is the evidence that it did.
  const { rows: open } = await query(
    `SELECT id, name, priority, device_id, site, alarm_type, source, status,
            lat, lng, created_at
       FROM alarms
      WHERE device_id = ANY(
              ARRAY[$1]::text[] || COALESCE(
                (SELECT ARRAY[COALESCE(NULLIF(d.device_id, ''), d.imei)]
                   FROM devices d
                  WHERE d.device_id = $1 OR d.imei = $1 OR d.id::text = $1
                  LIMIT 1),
                ARRAY[]::text[])
            )
        AND source = 'test'
        AND status <> 'Closed'
        AND created_at > now() - interval '30 minutes'
      ORDER BY created_at DESC
      LIMIT 1`,
    [String(deviceId)]
  );
  return open[0] || null;
}

/* ------------------------------------------------------------------ */
/* Test alarms — the technician's own                                  */
/* ------------------------------------------------------------------ */

/**
 * Every alarm raised on a device while THIS technician had an on-site session
 * open for it.
 *
 * That join is the whole definition of "my test alarms", and it is why this
 * cannot be a filter on `mainapp/alarms`. These are ordinary alarms — real
 * disturbances the technician caused on purpose — distinguished only by having
 * happened inside a window that technician opened. Nothing about the alarm row
 * itself says "test".
 *
 * Scoped to the caller, always. A technician has no business acknowledging the
 * fleet's alarms, and this list is what the ack/close below is allowed to touch.
 */
/**
 * What counts as a TEST alarm.
 *
 * A session window is not enough on its own. Other things can happen while a
 * technician is on site — a geofence breach, critical motion, a device dropping
 * offline — and none of those is a test. Letting a technician close them would
 * hand them a quiet way to clear real alarms simply by having a session open,
 * which is exactly the power `alarmPerms` withholds.
 *
 * A test is a DISTURBANCE: the tracker reporting the shake the technician gave
 * it. `DISTURBANCE_TECH` is the downgraded variant an open session produces, so
 * matching on the stem covers both.
 */
/**
 * What belongs on the technician's Tests tab.
 *
 * Test alarms for devices THIS technician has worked on — nobody else's.
 *
 * Two halves, and both are needed. `source = 'test'` keeps real alarms out
 * entirely: a technician can never see, acknowledge or close one of the fleet's
 * own alarms through this route. The session check keeps it to devices they
 * actually selected in a wizard, so a drill fired at somebody else's tracker
 * does not land in their list for them to wonder about.
 *
 * Sessions are matched WITHOUT a time window, unlike the ingest path. There the
 * question is "is this happening during a visit"; here it is "is this one of
 * mine", and a job finished this morning is still theirs this afternoon. The
 * 90-day floor on the queries is what bounds it.
 */
const TEST_ALARM_SCOPE = `(
  a.source = 'test'
  AND EXISTS (
    SELECT 1 FROM technician_work_sessions s
     WHERE s.technician_id = $1
       AND (a.device_id = ANY(s.device_ids) OR a.device_id = s.device_id)
  )
)`;

export async function listTechTestAlarms({ technicianId, includeClosed = true, limit = 100 } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 100, 1), 300);
  if (!technicianId) return [];

  const { rows } = await query(
    `SELECT a.id, a.name, a.priority, a.device_id, a.site, a.alarm_type,
            a.source, a.status, a.lat, a.lng, a.created_at
       FROM alarms a
      WHERE ${TEST_ALARM_SCOPE}
        AND a.created_at > now() - interval '90 days'
        ${includeClosed ? "" : "AND a.status <> 'Closed'"}
      ORDER BY a.created_at DESC
      LIMIT $2`,
    [String(technicianId), capped]
  );
  return rows;
}

/** How many of this technician's test alarms are still open. Drives the tab badge. */
export async function countOpenTechTestAlarms(technicianId) {
  if (!technicianId) return 0;
  const { rows } = await query(
    `SELECT count(*)::int AS n
       FROM alarms a
      WHERE ${TEST_ALARM_SCOPE}
        AND a.created_at > now() - interval '90 days'
        AND a.status <> 'Closed'`,
    [String(technicianId)]
  );
  return rows[0]?.n ?? 0;
}

/**
 * Is this alarm one of the caller's own test alarms?
 *
 * The gate on ack/close. Two ways to qualify: a drill (`source = 'test'`, which
 * any technician may clear — nobody owns a drill and it is invisible to the
 * control room anyway), or a disturbance raised inside a window this technician
 * opened. The second arm checks BOTH halves, because the window alone would let
 * a technician close a real geofence breach by starting a job on that site.
 */
export async function ownsTestAlarm(technicianId, alarmId) {
  if (!technicianId || !alarmId) return false;
  const { rows } = await query(
    `SELECT 1 FROM alarms a WHERE a.id = $2 AND ${TEST_ALARM_SCOPE} LIMIT 1`,
    [String(technicianId), String(alarmId)]
  );
  return rows.length > 0;
}

/** Acknowledge or close one of the caller's own test alarms. */
export async function setTestAlarmStatus(alarmId, action) {
  const status = action === "close" ? "Closed" : "Acknowledged";
  const stamp = action === "close" ? "resolved_at" : "acknowledged_at";
  const { rows } = await query(
    `UPDATE alarms
        SET status = $2, ${stamp} = now()
      WHERE id = $1
      RETURNING id, name, priority, device_id, site, alarm_type, source, status,
                lat, lng, created_at`,
    [String(alarmId), status]
  );
  return rows[0] || null;
}

/* ------------------------------------------------------------------ */
/* Work log                                                            */
/* ------------------------------------------------------------------ */

export async function insertWorklog(entry) {
  const {
    sessionId = null,
    technicianId,
    technicianName = null,
    jobType,
    maintenanceType = null,
    siteId = null,
    siteName = null,
    deviceId = null,
    startedAt = null,
    finishedAt = null,
    outcome = "passed",
    lat = null,
    lng = null,
    accuracyM = null,
    checklist = {},
    photos = {},
    tests = [],
    notes = null,
  } = entry;

  const { rows } = await query(
    `INSERT INTO technician_worklog
       (session_id, technician_id, technician_name, job_type, maintenance_type,
        site_id, site_name, device_id, started_at, finished_at, outcome,
        lat, lng, accuracy_m, checklist, photos, tests, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
             $15::jsonb, $16::jsonb, $17::jsonb, $18)
     RETURNING *`,
    [
      sessionId == null ? null : Number(sessionId),
      String(technicianId),
      technicianName,
      jobType === "maintain" ? "maintain" : "install",
      maintenanceType,
      siteId == null || siteId === "" ? null : Number(siteId),
      siteName,
      deviceId,
      startedAt,
      finishedAt,
      outcome === "abandoned" ? "abandoned" : "passed",
      lat == null ? null : Number(lat),
      lng == null ? null : Number(lng),
      accuracyM == null ? null : Number(accuracyM),
      JSON.stringify(checklist ?? {}),
      JSON.stringify(photos ?? {}),
      JSON.stringify(tests ?? []),
      notes,
    ]
  );
  return rows[0];
}

/**
 * List work-log entries, newest first.
 *
 * `technicianId` scopes the result to one person. The route passes it for
 * everyone who is not an admin — the same rule the media route already applies
 * to photos, and for the same reason: these rows carry a named person's GPS
 * position and movements, which is not something every signed-in user should be
 * able to page through.
 */
export async function listWorklog({
  technicianId,
  deviceId,
  siteId,
  from,
  to,
  limit = 100,
} = {}) {
  const where = [];
  const params = [];

  if (technicianId) {
    params.push(String(technicianId));
    where.push(`technician_id = $${params.length}`);
  }
  if (deviceId) {
    params.push(String(deviceId));
    where.push(`device_id = $${params.length}`);
  }
  if (siteId) {
    params.push(Number(siteId));
    where.push(`site_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    where.push(`created_at <= $${params.length}`);
  }

  const capped = Math.min(Math.max(Number(limit) || 100, 1), 500);
  params.push(capped);

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT * FROM technician_worklog
     ${clause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

export async function getWorklog(id) {
  const { rows } = await query(
    `SELECT * FROM technician_worklog WHERE id = $1`,
    [Number(id)]
  );
  return rows[0] || null;
}
