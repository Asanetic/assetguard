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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./response.module.css";

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

const normHead = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

/* Minimal CSV parser (handles quoted fields), returns an array of rows. */
function parseCSV(text) {
  const out = [];
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n").filter((l) => l.length);
  for (const line of lines) {
    const cells = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === ",") { cells.push(cur); cur = ""; }
      else if (ch === '"') q = true;
      else cur += ch;
    }
    cells.push(cur);
    out.push(cells.map((c) => c.trim()));
  }
  return out;
}

/* The import template columns — Code Name, Security Region, two Response Cluster
   columns, and two Response User columns matched to registered field-response
   users by name or email. */
const TEMPLATE_HEADERS = [
  "Code Name", "Security Region",
  "Response Cluster 1", "Response Cluster 2",
  "Response User 1", "Response User 2",
];

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
function ClusterPicker({ selected, onToggle, clusters = [] }) {
  const count = selected.length;
  return (
    <div className={styles.pick}>
      <div className={styles.pickList}>
        {clusters.map((c) => (
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
  // Teams + grants now come from the DB (response_teams / response_team_grants),
  // so a registration survives a reload and matches the dispatch popup.
  const [teams, setTeams] = useState([]);
  // grants: { [cluster]: [teamCode, ...] } — a team allowed to respond outside its clusters.
  const [grants, setGrants] = useState({});

  const loadTeams = useCallback(() => {
    fetch("/api/mainapp/response/teams", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setTeams(d.teams || []); setGrants(d.grants || {}); } })
      .catch(() => {});
  }, []);
  useEffect(() => { loadTeams(); }, [loadTeams]);

  // registration / edit form
  const emptyForm = { code: "", sec: "", phones: "", emails: "", company: "", clusters: [], members: [] };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // original code being edited
  const [err, setErr] = useState("");

  // Reference data — regions, clusters and security companies come from the DB,
  // nothing hardcoded on this page.
  const [regions, setRegions] = useState([]);
  const [clusters, setClusters] = useState([]);   // [{ name, region }]
  const [companies, setCompanies] = useState([]);
  const clusterNames = useMemo(() => clusters.map((c) => c.name), [clusters]);
  useEffect(() => {
    fetch("/api/mainapp/response/geo").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setRegions(d.regions || []);
      setClusters(d.clusters || []);
      setCompanies(d.companies || []);
      // seed the create-form defaults once data is in
      setForm((f) => (f.code || f.sec ? f : { ...f, sec: (d.regions || [])[0] || "", company: (d.companies || [])[0] || "" }));
    }).catch(() => {});
  }, []);
  const CLUSTER_COUNTRYWIDE = "__ALL__";

  // Field-response users that can be assigned to a team (their marker will show
  // the team name; unassigned responders show their own name).
  const RESPONDER_ROLES = new Set(["field_resp", "sec_country", "sec_country_asst", "sec_regional", "sec_regional_asst"]);
  const [fieldUsers, setFieldUsers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  useEffect(() => {
    fetch("/api/mainapp/users").then((r) => (r.ok ? r.json() : null)).then((d) => {
      const us = (d?.users || []).filter((u) => RESPONDER_ROLES.has(String(u.role || "").toLowerCase()));
      setFieldUsers(us);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function toggleMember(id) {
    setForm((f) => {
      const has = (f.members || []).includes(id);
      return { ...f, members: has ? f.members.filter((x) => x !== id) : [...(f.members || []), id] };
    });
  }

  // cross-cluster grant form
  const [gTeam, setGTeam] = useState("");
  const [gCl, setGCl] = useState("");

  const [term, setTerm] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  function flashToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  // ---- Import teams (CSV) ----
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // { rows:[...], fileName }
  const [importErr, setImportErr] = useState("");
  const importInputRef = useRef(null);

  function downloadTemplate() {
    const example = [
      "Bravo 14", "Nairobi North",
      "Cluster A — Nairobi North", "Cluster B — Nairobi South",
      "jane.doe@falconguard.co.ke", "John Otieno",
    ].map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",");
    const csv = `${TEMPLATE_HEADERS.join(",")}\n${example}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assetguard-response-teams-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    flashToast("Template downloaded");
  }

  // Match a "Response User" cell to a registered field-response user by email
  // (preferred) or exact name, case-insensitive.
  function matchUser(token) {
    const t = String(token || "").trim();
    if (!t) return null;
    const tl = t.toLowerCase();
    return (
      fieldUsers.find((u) => (u.email || "").toLowerCase() === tl) ||
      fieldUsers.find((u) => (u.name || "").toLowerCase() === tl) ||
      null
    );
  }

  function onImportFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setImportErr("");
    const reader = new FileReader();
    reader.onload = () => buildImport(String(reader.result || ""), f.name);
    reader.onerror = () => setImportErr(`${f.name} could not be read.`);
    reader.readAsText(f);
  }

  function buildImport(text, fileName) {
    const grid = parseCSV(text);
    if (!grid.length) { setImportErr("The file is empty."); return; }
    const head = grid[0].map(normHead);
    const col = (name) => head.indexOf(normHead(name));
    if (col("Code Name") < 0 && col("Code") < 0) {
      setImportErr(`Needs a "Code Name" column. This file has: ${grid[0].join(", ")}`);
      return;
    }
    const get = (r, name) => { const k = col(name); return k < 0 ? "" : String(r[k] || "").trim(); };
    const existing = new Set(teams.map((t) => t.code.toLowerCase()));
    const seen = new Set();
    const rows = grid.slice(1).filter((r) => r.some((c) => c && c.trim())).map((r, i) => {
      const code = get(r, "Code Name") || get(r, "Code") || get(r, "Name");
      const sec = get(r, "Security Region") || get(r, "Region");
      const clusters = [
        get(r, "Response Cluster 1") || get(r, "Response Cluster") || get(r, "Cluster 1"),
        get(r, "Response Cluster 2") || get(r, "Cluster 2"),
      ].filter(Boolean);
      const userTokens = [
        get(r, "Response User 1") || get(r, "User 1") || get(r, "Responder 1"),
        get(r, "Response User 2") || get(r, "User 2") || get(r, "Responder 2"),
      ].filter(Boolean);
      const matched = [], unmatched = [];
      userTokens.forEach((tok) => { const u = matchUser(tok); if (u) matched.push(u); else unmatched.push(tok); });

      let status = "new", note = "";
      const notes = [];
      // One response cluster and one response user are mandatory; the second of
      // each is optional.
      if (!code) { status = "error"; note = "Code Name is blank"; }
      else if (seen.has(code.toLowerCase())) { status = "dupe"; note = "repeated in this file"; }
      else if (existing.has(code.toLowerCase())) { status = "dupe"; note = "already registered"; }
      else if (!clusters.length) { status = "error"; note = "needs a Response Cluster 1"; }
      else if (!matched.length) {
        status = "error";
        note = unmatched.length
          ? `no registered user matched (${unmatched.join(", ")})`
          : "needs a Response User 1";
      } else {
        notes.push(`${clusters.length} cluster${clusters.length > 1 ? "s" : ""}`);
        notes.push(`${matched.length} user${matched.length > 1 ? "s" : ""} matched`);
        if (unmatched.length) notes.push(`unmatched: ${unmatched.join(", ")}`);
        note = notes.join(" · ");
      }
      if (code) seen.add(code.toLowerCase());
      return { n: i + 2, code, sec, clusters, matched, unmatched, status, note };
    });
    setImportPreview({ rows, fileName });
    setImportErr("");
  }

  function confirmImport() {
    const pv = importPreview;
    if (!pv) return;
    const toAdd = pv.rows.filter((r) => r.status === "new");
    if (!toAdd.length) { setImportErr("Nothing new to import."); return; }
    const defaultCompany = companies[0] || "";
    const recs = toAdd.map((r) => {
      // Team phones/emails default to the matched users' own contacts, so an
      // imported team is still reachable without a separate contact column.
      const phones = [...new Set(r.matched.map((u) => u.phone).filter(Boolean))];
      const emails = [...new Set(r.matched.map((u) => u.email).filter(Boolean))];
      return {
        code: r.code, sec: r.sec, clusters: r.clusters.slice(),
        phones, emails, company: defaultCompany,
        memberIds: r.matched.map((u) => String(u.id)),
      };
    });
    // One bulk request — the server upserts each team + its members to the DB.
    fetch("/api/mainapp/response/teams", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teams: recs }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => {
        setImportOpen(false);
        setImportPreview(null);
        flashToast(`Imported ${recs.length} team${recs.length > 1 ? "s" : ""}`);
        loadTeams();
      })
      .catch(() => setImportErr("Import failed. Try again."));
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
      sec: t.sec || "",
      phones: joinContacts(t.phones),
      emails: joinContacts(t.emails),
      company: t.company || "",
      clusters: (t.clusters || []).slice(),
      members: [],
    });
    // pull the team's currently-assigned responders
    fetch(`/api/mainapp/response/teams/${encodeURIComponent(code)}/members`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setForm((f) => (f.code === t.code ? { ...f, members: (d?.members || []).map((m) => m.id) } : f)))
      .catch(() => {});
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
    if (!form.clusters.length) return setErr("Assign the team to at least one response cluster.");
    if (!(form.members || []).length) return setErr("Assign at least one response user to the team.");

    // Client-side dup guard (the server also upserts by code).
    if (!editing && teams.some((t) => t.code === code)) {
      return setErr("A team with code “" + code + "” already exists.");
    }
    if (editing && code !== editing && teams.some((t) => t.code === code)) {
      return setErr("A team with code “" + code + "” already exists.");
    }

    const body = {
      code, sec: form.sec, clusters: form.clusters.slice(),
      phones: ph.list, emails: em.list, company: form.company,
      memberIds: (form.members || []).map((x) => String(x)),
    };
    const url = editing
      ? `/api/mainapp/response/teams/${encodeURIComponent(editing)}`
      : "/api/mainapp/response/teams";
    fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => { flashToast("Team " + code + (editing ? " updated" : " registered")); clearForm(); loadTeams(); })
      .catch(() => setErr("Could not save the team. Try again."));
  }

  function removeTeam(code) {
    if (typeof window !== "undefined" &&
        !window.confirm("Delete response team " + code + "? This cannot be undone.")) return;
    fetch(`/api/mainapp/response/teams/${encodeURIComponent(code)}`, { method: "DELETE" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => { if (editing === code) clearForm(); flashToast("Response team " + code + " deleted"); loadTeams(); })
      .catch(() => flashToast("Could not delete " + code));
  }

  /* ---- cross-cluster grants ---- */
  function grantRows() {
    const rows = [];
    clusterNames.forEach((c) => {
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
    fetch("/api/mainapp/response/teams/grants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamCode: code, cluster: cl }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => { flashToast(code + " may now respond in " + cl + " and will be notified there"); loadTeams(); })
      .catch(() => flashToast("Could not grant access"));
  }
  function revokeGrant(cluster, code) {
    fetch("/api/mainapp/response/teams/grants", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamCode: code, cluster }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => { flashToast(code + " can no longer respond in " + cluster); loadTeams(); })
      .catch(() => flashToast("Could not revoke"));
  }

  /* ---- registered list (filtered) ---- */
  const filtered = useMemo(() => {
    return teams.filter((x) =>
      listMatch(term, [x.code, x.sec, x.company,
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
          <div className={styles.sub}>Shared phone and email — assigned to a response cluster</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setImportErr(""); setImportPreview(null); setImportOpen(true); }}>
            <i className="ti ti-upload" /> Import CSV
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={downloadTemplate}>
            <i className="ti ti-file-download" /> Template
          </button>
        </div>
      </div>

      {/* register / edit card */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon}><i className="ti ti-car" /></span>
          Response teams
        </div>
        <div className={styles.cardSub}>
          A team is a code with a shared phone and email, assigned to a response cluster.
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>CODE NAME</label>
            <input className={styles.in} placeholder="Bravo 14"
              value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>SECURITY REGION</label>
            <select className={styles.in}
              value={form.sec === "Country wide" ? CLUSTER_COUNTRYWIDE : form.sec}
              onChange={(e) => {
                const v = e.target.value;
                if (v === CLUSTER_COUNTRYWIDE) setForm((f) => ({ ...f, sec: "Country wide", clusters: clusterNames.slice() }));
                else set("sec", v);
              }}>
              <option value="">Select a region…</option>
              <option value={CLUSTER_COUNTRYWIDE}>Country wide — all clusters</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.clWrap}>
          <label className={styles.lab}>ASSIGN TO CLUSTERS — one or more</label>
          <ClusterPicker selected={form.clusters} onToggle={toggleCluster} clusters={clusterNames} />
        </div>

        <div className={styles.clWrap}>
          <label className={styles.lab}>ASSIGN FIELD-RESPONSE USERS — at least one required; their responder marker shows this team</label>
          {(() => {
            const selected = (form.members || [])
              .map((id) => fieldUsers.find((u) => u.id === id))
              .filter(Boolean);
            const term = memberSearch.trim().toLowerCase();
            const matches = fieldUsers.filter((u) =>
              !(form.members || []).includes(u.id) &&
              (!term || `${u.name} ${u.email || ""}`.toLowerCase().includes(term)));
            const CAP = 50;
            return (
              <>
                {/* searchable select dropdown */}
                <div style={{ position: "relative" }}>
                  <input className={styles.in} placeholder="Search users by name or email…"
                    value={memberSearch}
                    onChange={(e) => { setMemberSearch(e.target.value); setMemberOpen(true); }}
                    onFocus={() => setMemberOpen(true)}
                    onBlur={() => setTimeout(() => setMemberOpen(false), 150)} />
                  {memberOpen && (
                    <div style={{ position: "absolute", zIndex: 30, top: "100%", left: 0, right: 0, background: "#fff",
                                  border: "1px solid #E2E8F0", borderRadius: 10, marginTop: 4, maxHeight: 260,
                                  overflowY: "auto", boxShadow: "0 12px 28px rgba(15,23,42,.15)" }}>
                      {fieldUsers.length === 0 ? (
                        <div style={{ padding: "10px 12px", color: "#94A3B8", fontSize: 13 }}>No field-response users found. Register users with a field-response role first.</div>
                      ) : matches.length === 0 ? (
                        <div style={{ padding: "10px 12px", color: "#94A3B8", fontSize: 13 }}>No matches{term ? ` for “${memberSearch.trim()}”` : ""}.</div>
                      ) : (
                        <>
                          {matches.slice(0, CAP).map((u) => (
                            <div key={u.id} role="option"
                              onMouseDown={(e) => { e.preventDefault(); toggleMember(u.id); setMemberSearch(""); }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F8FF")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                              style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #F4F7FB" }}>
                              <span style={{ fontWeight: 600, color: "#0F274A" }}>{u.name}</span>
                              {u.email ? <span style={{ color: "#94A3B8", marginLeft: 8 }}>{u.email}</span> : null}
                            </div>
                          ))}
                          {matches.length > CAP && <div style={{ padding: "8px 12px", color: "#94A3B8", fontSize: 12 }}>Showing {CAP} of {matches.length} — keep typing to narrow.</div>}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* selected responders — a list, not chips */}
                {selected.length > 0 ? (
                  <div style={{ border: "1px solid #EEF2F7", borderRadius: 10, marginTop: 8, overflow: "hidden" }}>
                    {selected.map((u) => (
                      <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: "1px solid #F4F7FB" }}>
                        <span><span style={{ fontWeight: 600, color: "#0F274A" }}>{u.name}</span>{u.email ? <span style={{ color: "#94A3B8", marginLeft: 8, fontSize: 12 }}>{u.email}</span> : null}</span>
                        <button type="button" onClick={() => toggleMember(u.id)} style={{ border: "none", background: "none", color: "#B91C1C", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 6 }}>No responders assigned yet — search above to add.</div>}
                <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>
                  {selected.length} assigned · {fieldUsers.length} field-response user{fieldUsers.length === 1 ? "" : "s"} total
                </div>
              </>
            );
          })()}
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
              {companies.map((c) => <option key={c} value={c}>{c}</option>)}
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
            {clusterNames.map((c) => <option key={c} value={c}>{c}</option>)}
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
          placeholder="Search teams by code, cluster, region or contact..."
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
                <div className={styles.rowMeta}>{joinContacts(x.phones) || "No phone"}</div>
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

      {/* import dialog */}
      {importOpen ? (
        <div onClick={() => setImportOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", zIndex: 60, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "min(760px, 96vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.28)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid #EEF2F7" }}>
              <span className={styles.cardHIcon}><i className="ti ti-upload" /></span>
              <div style={{ fontWeight: 800, color: "#0F274A", fontSize: 16 }}>Import response teams</div>
              <button type="button" onClick={() => setImportOpen(false)}
                style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", color: "#94A3B8", fontSize: 20 }} aria-label="Close">
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
                Columns: <b>Code Name</b>, <b>Security Region</b>, <b>Response Cluster 1</b>, <b>Response Cluster 2</b>,
                {" "}<b>Response User 1</b>, <b>Response User 2</b>. <b>Code Name, Response Cluster 1 and Response
                User 1 are required</b>; the second cluster and user are optional. Users are matched to registered
                field-response users by email or name; a team’s phone and email default to those users’ contacts.
                <button type="button" onClick={downloadTemplate}
                  style={{ marginLeft: 6, border: "none", background: "none", color: "#2E6CF5", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                  Download template
                </button>
              </div>

              <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={onImportFile} />
              <button type="button" className={styles.btn} onClick={() => importInputRef.current && importInputRef.current.click()}>
                <i className="ti ti-file-upload" /> Choose CSV file
              </button>

              {importErr ? <div className={styles.err} style={{ marginTop: 12 }}>{importErr}</div> : null}

              {importPreview ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 8 }}>
                    {importPreview.fileName} — {importPreview.rows.filter((r) => r.status === "new").length} to import,
                    {" "}{importPreview.rows.filter((r) => r.status === "dupe").length} skipped,
                    {" "}{importPreview.rows.filter((r) => r.status === "error").length} error
                  </div>
                  <div style={{ border: "1px solid #EEF2F7", borderRadius: 10, overflow: "hidden", maxHeight: 320, overflowY: "auto" }}>
                    {importPreview.rows.map((r) => {
                      const color = r.status === "new" ? "#047857" : r.status === "dupe" ? "#B45309" : "#B91C1C";
                      const bg = r.status === "new" ? "#D1FAE5" : r.status === "dupe" ? "#FEF3C7" : "#FEE2E2";
                      return (
                        <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid #F4F7FB" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color, background: bg, borderRadius: 999, padding: "2px 9px", textTransform: "uppercase" }}>{r.status}</span>
                          <span style={{ fontWeight: 700, color: "#0F274A", minWidth: 90 }}>{r.code || "—"}</span>
                          <span style={{ color: "#64748B", fontSize: 12.5 }}>{r.note}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setImportPreview(null); setImportErr(""); }}>Choose another file</button>
                    <button type="button" className={styles.btn} onClick={confirmImport}
                      disabled={!importPreview.rows.some((r) => r.status === "new")}>
                      Import {importPreview.rows.filter((r) => r.status === "new").length} team{importPreview.rows.filter((r) => r.status === "new").length === 1 ? "" : "s"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
