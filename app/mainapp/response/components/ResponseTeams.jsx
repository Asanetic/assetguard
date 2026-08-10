// app/mainapp/response/components/ResponseTeams.jsx
// Response teams page — a faithful React port of the prototype's
// agTeamsPageHtml("team") / agTeamsPageMount(root,"team").
//
// A team is a shared resource: a vehicle, a shared phone and a shared email —
// never a person. Teams belong to one or more response CLUSTERS. Letting a team
// answer alarms outside its own clusters is a single decision (it also puts the
// team on that cluster's notification list). This screen is in-memory, exactly
// like the prototype (there is no teams backend yet).
"use client";

import { useMemo, useRef, useState } from "react";
import styles from "./response.module.css";
import { SEC_REGIONS, CLUSTERS, COMPANIES, SEED_TEAMS } from "./teamsData.js";

/* ---- contact helpers (ports of agSplitContacts / agValidEmail / agValidPhone) ---- */
function splitContacts(v) {
  return String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
}
function joinContacts(a) {
  return (a || []).join(", ");
}
function validEmail(e) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}
function validPhone(p) {
  return /^[+0-9][0-9\s()-]{6,}$/.test(p);
}
function checkContacts(v, kind) {
  const list = splitContacts(v);
  const bad = [];
  list.forEach((x) => {
    if (kind === "email") { if (!validEmail(x)) bad.push(x); }
    else { if (!validPhone(x)) bad.push(x); }
  });
  return { ok: bad.length === 0, list, bad };
}
function listMatch(term, haystack) {
  term = (term || "").trim().toLowerCase();
  if (!term) return true;
  return String(haystack).replace(/\s+/g, " ").toLowerCase().indexOf(term) > -1;
}

/* Live chip preview under a phone/email input (agWireContactField). */
function ContactChips({ value, kind }) {
  const r = checkContacts(value, kind);
  if (!r.list.length) return null;
  return (
    <div className={styles.chipsRow}>
      {r.list.map((x, i) => {
        const bad = r.bad.indexOf(x) > -1;
        return (
          <span key={x + i} className={`${styles.cChip} ${bad ? styles.cChipBad : ""}`}>
            {bad ? <i className="ti ti-alert-circle" /> : null}{x}
          </span>
        );
      })}
    </div>
  );
}

/* Cluster multi-pick (agMultiPick + agMultiPickWire, no "all" option here). */
function ClusterPicker({ selected, onToggle }) {
  const count = selected.length;
  return (
    <div className={styles.pick}>
      <div className={styles.pickList}>
        {CLUSTERS.map((c) => (
          <label key={c} className={styles.pickRow}>
            <input
              type="checkbox"
              checked={selected.indexOf(c) > -1}
              onChange={() => onToggle(c)}
            />
            {c}
          </label>
        ))}
      </div>
      <div className={styles.pickSum}>
        {count
          ? `${count} cluster${count > 1 ? "s" : ""} selected`
          : <span className={styles.pickNone}>Nothing selected yet</span>}
      </div>
    </div>
  );
}

export default function ResponseTeams() {
  const [teams, setTeams] = useState(() => SEED_TEAMS.map((t) => ({ ...t })));
  // grants: { [cluster]: [teamCode, ...] } — a team allowed to respond outside its clusters.
  const [grants, setGrants] = useState({});

  // registration / edit form
  const emptyForm = { code: "", sec: SEC_REGIONS[0], veh: "", phones: "", emails: "", company: COMPANIES[0], clusters: [] };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // original code being edited
  const [err, setErr] = useState("");

  // cross-cluster grant form
  const [gTeam, setGTeam] = useState("");
  const [gCl, setGCl] = useState(CLUSTERS[0]);

  const [term, setTerm] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  function flashToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function toggleCluster(c) {
    setForm((f) => {
      const has = f.clusters.indexOf(c) > -1;
      return { ...f, clusters: has ? f.clusters.filter((x) => x !== c) : [...f.clusters, c] };
    });
  }

  function clearForm() {
    setForm(emptyForm);
    setEditing(null);
    setErr("");
  }

  function loadTeam(code) {
    const t = teams.find((x) => x.code === code);
    if (!t) return;
    setEditing(code);
    setErr("");
    setForm({
      code: t.code,
      sec: t.sec || SEC_REGIONS[0],
      veh: t.vehicle || "",
      phones: joinContacts(t.phones),
      emails: joinContacts(t.emails),
      company: t.company || COMPANIES[0],
      clusters: (t.clusters || []).slice(),
    });
  }

  function save() {
    setErr("");
    const code = form.code.trim();
    if (!code) return setErr("Code name is required — teams are identified by code, not by person.");
    const ph = checkContacts(form.phones, "phone");
    const em = checkContacts(form.emails, "email");
    if (!ph.list.length) return setErr("At least one phone number is required.");
    if (!ph.ok) return setErr("Check these phone numbers: " + ph.bad.join(", "));
    if (!em.list.length) return setErr("At least one email address is required.");
    if (!em.ok) return setErr("Check these email addresses: " + em.bad.join(", "));
    const veh = form.veh.trim();
    if (!veh) return setErr("A vehicle registration is required.");
    if (!form.clusters.length) return setErr("Assign the team to at least one response cluster.");

    const rec = {
      code, sec: form.sec, clusters: form.clusters.slice(), vehicle: veh,
      phones: ph.list, emails: em.list, company: form.company,
    };

    if (editing) {
      // Renaming to an existing (other) code is rejected, mirroring the store.
      if (code !== editing && teams.some((t) => t.code === code)) {
        return setErr("A team with code “" + code + "” already exists.");
      }
      setTeams((arr) => arr.map((t) => (t.code === editing ? rec : t)));
      // keep grants pointing at the (possibly renamed) team
      if (code !== editing) {
        setGrants((g) => {
          const next = {};
          Object.keys(g).forEach((cl) => { next[cl] = g[cl].map((c) => (c === editing ? code : c)); });
          return next;
        });
      }
      flashToast("Team " + code + " updated");
    } else {
      if (teams.some((t) => t.code === code)) {
        return setErr("A team with code “" + code + "” already exists.");
      }
      setTeams((arr) => [...arr, rec]);
      flashToast("Team " + code + " registered");
    }
    clearForm();
  }

  function removeTeam(code) {
    if (typeof window !== "undefined" &&
        !window.confirm("Delete response team " + code + "? This cannot be undone.")) return;
    setTeams((arr) => arr.filter((t) => t.code !== code));
    // drop any cross-cluster grants for this team
    setGrants((g) => {
      const next = {};
      Object.keys(g).forEach((cl) => {
        const kept = g[cl].filter((c) => c !== code);
        if (kept.length) next[cl] = kept;
      });
      return next;
    });
    if (editing === code) clearForm();
    flashToast("Response team " + code + " deleted");
  }

  /* ---- cross-cluster grants ---- */
  function grantRows() {
    const rows = [];
    CLUSTERS.forEach((c) => {
      (grants[c] || []).forEach((code) => rows.push({ cluster: c, code }));
    });
    return rows;
  }
  function allowGrant() {
    const code = gTeam || (teams[0] && teams[0].code);
    const cl = gCl;
    if (!code || !cl) return;
    const t = teams.find((x) => x.code === code);
    const own = t && (t.clusters || []).indexOf(cl) > -1;
    if (own) { flashToast(code + " is already assigned to " + cl); return; }
    setGrants((g) => {
      const cur = g[cl] || [];
      if (cur.indexOf(code) > -1) return g;
      return { ...g, [cl]: [...cur, code] };
    });
    flashToast(code + " may now respond in " + cl + " and will be notified there");
  }
  function revokeGrant(cluster, code) {
    setGrants((g) => {
      const kept = (g[cluster] || []).filter((c) => c !== code);
      const next = { ...g };
      if (kept.length) next[cluster] = kept; else delete next[cluster];
      return next;
    });
    flashToast(code + " can no longer respond in " + cluster);
  }

  /* ---- registered list (filtered) ---- */
  const filtered = useMemo(() => {
    return teams.filter((x) =>
      listMatch(term, [x.code, x.vehicle, x.sec, x.company,
        (x.clusters || []).join(" "), joinContacts(x.phones), joinContacts(x.emails)].join(" ")));
  }, [teams, term]);

  const countLabel = term.trim() ? `${filtered.length} of ${teams.length}` : `${teams.length}`;
  const rows = grantRows();
  const teamCodes = teams.map((t) => t.code);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Response teams</div>
          <div className={styles.sub}>Vehicle, shared phone and email — assigned to a response cluster</div>
        </div>
      </div>

      {/* register / edit card */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon}><i className="ti ti-car" /></span>
          Response teams
        </div>
        <div className={styles.cardSub}>
          A team is a vehicle, a shared phone and a shared email — never a person.
        </div>

        <div className={styles.g3}>
          <div className={styles.field}>
            <label className={styles.lab}>CODE NAME</label>
            <input className={styles.in} placeholder="Bravo 14"
              value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>SECURITY REGION</label>
            <select className={styles.in} value={form.sec} onChange={(e) => set("sec", e.target.value)}>
              {SEC_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>VEHICLE REG.</label>
            <input className={styles.in} placeholder="KDA 123B"
              value={form.veh} onChange={(e) => set("veh", e.target.value)} />
          </div>
        </div>

        <div className={styles.clWrap}>
          <label className={styles.lab}>ASSIGN TO CLUSTERS — one or more</label>
          <ClusterPicker selected={form.clusters} onToggle={toggleCluster} />
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>TEAM PHONE(S) — comma separated</label>
            <input className={styles.in} placeholder="+254 7.., +254 7.."
              value={form.phones} onChange={(e) => set("phones", e.target.value)} />
            <ContactChips value={form.phones} kind="phone" />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>TEAM EMAIL(S) — comma separated</label>
            <input className={styles.in} placeholder="name@co.ke, second@co.ke"
              value={form.emails} onChange={(e) => set("emails", e.target.value)} />
            <ContactChips value={form.emails} kind="email" />
          </div>
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>SECURITY COMPANY</label>
            <select className={styles.in} value={form.company} onChange={(e) => set("company", e.target.value)}>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={`${styles.btn} ${styles.btnGrow}`} onClick={save}>
              {editing ? "Save changes" : "Register team"}
            </button>
            {editing ? (
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={clearForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        {err ? <div className={styles.err}>{err}</div> : null}
      </div>

      {/* respond outside their cluster */}
      <div className={styles.sectionLab}>RESPOND OUTSIDE THEIR CLUSTER</div>
      <div className={styles.sectionNote}>
        A team answers alarms in its own clusters. Letting one into another cluster also puts it on
        the notification list for that cluster — one decision, not two.
      </div>
      <div className={styles.gGrant}>
        <div className={styles.field}>
          <label className={styles.lab}>TEAM</label>
          <select className={styles.in} value={gTeam || teamCodes[0] || ""}
            onChange={(e) => setGTeam(e.target.value)}>
            {teamCodes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.lab}>MAY ALSO RESPOND IN</label>
          <select className={styles.in} value={gCl} onChange={(e) => setGCl(e.target.value)}>
            {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <button type="button" className={styles.btn} onClick={allowGrant}>Allow</button>
        </div>
      </div>
      <div className={styles.grantList}>
        {rows.length ? rows.map((r) => (
          <div key={r.cluster + "|" + r.code} className={styles.grantRow}>
            <i className="ti ti-run" />
            <div className={styles.grantBody}>
              <b>{r.code}</b> may respond in <b>{r.cluster}</b>
              <div className={styles.grantSub}>and is notified of alarms there</div>
            </div>
            <button type="button" className={styles.grantRevoke}
              onClick={() => revokeGrant(r.cluster, r.code)}>Revoke</button>
          </div>
        )) : (
          <div className={styles.grantEmpty}>No team has been let outside its own clusters.</div>
        )}
      </div>

      {/* registered list */}
      <div className={styles.registeredLab}>REGISTERED ({countLabel})</div>
      <div className={styles.search}>
        <i className="ti ti-search" />
        <input className={styles.searchInput}
          placeholder="Search teams by code, vehicle, cluster, region or contact..."
          value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      <div>
        {filtered.length ? filtered.map((x) => {
          const cls = x.clusters || [];
          return (
            <div key={x.code} className={styles.row}>
              <span className={styles.rowIcon}><i className="ti ti-car" /></span>
              <div className={styles.rowBody}>
                <div className={styles.rowCode}>{x.code}</div>
                <div className={styles.rowMeta}>{x.vehicle} · {joinContacts(x.phones)}</div>
                <div className={styles.rowEmail}>{joinContacts(x.emails)}</div>
                <div className={styles.rowChips}>
                  {cls.length
                    ? cls.map((c) => (
                        <span key={c} className={styles.tchip} style={{ color: "#7c3aed", background: "#ede9fe" }}>{c}</span>
                      ))
                    : <span className={styles.tchip} style={{ color: "#b45309", background: "#fef3c7" }}>Unassigned</span>}
                  <span className={styles.tchip} style={{ color: "#475569", background: "#eef2f7" }}>{x.sec}</span>
                </div>
              </div>
              <button type="button" className={styles.rowEd} aria-label="Edit" onClick={() => loadTeam(x.code)}>
                <i className="ti ti-pencil" />
              </button>
              <button type="button" className={styles.rowDel} aria-label="Remove" onClick={() => removeTeam(x.code)}>
                <i className="ti ti-trash" />
              </button>
            </div>
          );
        }) : (
          <div className={styles.empty}>
            {term.trim() ? `No response teams match “${term.trim()}”` : "No response teams registered yet"}
          </div>
        )}
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
