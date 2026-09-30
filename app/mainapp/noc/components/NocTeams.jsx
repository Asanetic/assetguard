// app/mainapp/noc/components/NocTeams.jsx
// NOC teams page — a faithful React port of the prototype's
// agTeamsPageHtml("noc") / agTeamsPageMount(root,"noc").
//
// A NOC team is a shared control-room desk: a code, a shared phone and a shared
// email — never a person. It belongs to a monitoring OR a security company and
// COVERS a set of security regions (no selection = country-wide). This screen
// is in-memory, exactly like the prototype (there is no NOC backend yet).
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./noc.module.css";
// Companies + regions come from REGISTERED data (companies directory +
// response_regions), never a seed list — a deleted company disappears here too.

/* ---- contact helpers (ports of agSplitContacts / agValidEmail / agValidPhone) ---- */
function splitContacts(v) { return String(v || "").split(",").map((x) => x.trim()).filter(Boolean); }
function joinContacts(a) { return (a || []).join(", "); }
function validEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function validPhone(p) { return /^[+0-9][0-9\s()-]{6,}$/.test(p); }
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
const splitList = (v) => String(v || "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

/* Minimal CSV parser (handles quoted fields). */
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

/* NOC import template columns. A NOC desk belongs to a monitoring or security
   company and covers regions (blank = country-wide). Phone/email columns are
   optional — if blank, contacts default to the matched users' own contacts. */
const NOC_TEMPLATE_HEADERS = [
  "Code Name", "Belongs To", "Company",
  "Coverage 1", "Coverage 2",
  "Phone(s)", "Email(s)",
  "NOC User 1", "NOC User 2",
];

/* Live chip preview under a phone/email input. */
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

/* Coverage multi-pick with a "Country-wide" all option (agMultiPick + allLabel).
   `covers` is the list of chosen regions; an empty list means country-wide. */
function CoveragePicker({ covers, onToggle, onAll, regions }) {
  const all = covers.length === 0;
  return (
    <div className={styles.pick}>
      <label className={styles.pickAll}>
        <input type="checkbox" checked={all} onChange={onAll} />
        Country-wide
      </label>
      <div className={styles.pickList}>
        {(regions || []).map((r) => (
          <label key={r} className={`${styles.pickRow} ${all ? styles.pickRowDim : ""}`}>
            <input type="checkbox" checked={covers.indexOf(r) > -1} onChange={() => onToggle(r)} />
            {r}
          </label>
        ))}
      </div>
      <div className={styles.pickSum}>
        {all
          ? <span className={styles.pickAllOn}>Country-wide — every region</span>
          : `${covers.length} region${covers.length > 1 ? "s" : ""} selected`}
      </div>
    </div>
  );
}

export default function NocTeams() {
  // NOC teams now live in the DB (noc_teams), so a registration survives a reload.
  // Each row: { code, owner:'mon'|'sec', company, covers:[], phones:[], emails:[], memberIds:[] }
  const [nocTeams, setNocTeams] = useState([]);
  const loadNocTeams = useCallback(() => {
    fetch("/api/mainapp/noc/teams", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setNocTeams(d.teams || []); })
      .catch(() => {});
  }, []);
  useEffect(() => { loadNocTeams(); }, [loadNocTeams]);

  const [owner, setOwner] = useState("mon"); // 'mon' | 'sec'
  // Company dropdowns + region coverage come from REGISTERED data.
  const [monNames, setMonNames] = useState([]);   // registered monitoring companies
  const [secNames, setSecNames] = useState([]);   // registered security companies
  const [regionsReg, setRegionsReg] = useState([]); // registered security regions
  useEffect(() => {
    fetch("/api/mainapp/companies/directory", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d) return; setMonNames((d.monitoring || []).map((c) => c.name)); setSecNames((d.security || []).map((c) => c.name)); })
      .catch(() => {});
    fetch("/api/mainapp/response/geo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.regions)) setRegionsReg(d.regions); })
      .catch(() => {});
  }, []);
  const companyList = owner === "mon" ? monNames : secNames;

  const [form, setForm] = useState({ company: "", code: "", phones: "", emails: "", covers: [], members: [] });
  const [editing, setEditing] = useState(null); // { company, code } | null
  const [err, setErr] = useState("");
  const [term, setTerm] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // Users who can be assigned to a NOC team (their name+team is stamped on the alarm
  // when they Acknowledge — like the response teams). Membership persists to
  // team_members via the shared teams endpoint even though the team itself is in-memory.
  const [users, setUsers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  useEffect(() => {
    fetch("/api/mainapp/users").then((r) => (r.ok ? r.json() : null)).then((d) => {
      setUsers(Array.isArray(d?.users) ? d.users : []);
    }).catch(() => {});
  }, []);
  function toggleMember(id) {
    setForm((f) => {
      const has = (f.members || []).includes(id);
      return { ...f, members: has ? f.members.filter((x) => x !== id) : [...(f.members || []), id] };
    });
  }

  function flashToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function toggleCover(r) {
    setForm((f) => {
      const has = f.covers.indexOf(r) > -1;
      return { ...f, covers: has ? f.covers.filter((x) => x !== r) : [...f.covers, r] };
    });
  }
  function coverAll() { setForm((f) => ({ ...f, covers: [] })); }

  // ---- Import NOC teams (CSV) ----
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // { rows, fileName }
  const [importErr, setImportErr] = useState("");
  const importInputRef = useRef(null);

  function downloadTemplate() {
    const example = [
      "NOC Team 4", "Monitoring", monNames[0] || "Symphony Technologies",
      "Nairobi North", "Nairobi South", "", "",
      "jane.doe@symphony.co.ke", "John Otieno",
    ].map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",");
    const csv = `${NOC_TEMPLATE_HEADERS.join(",")}\n${example}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assetguard-noc-teams-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    flashToast("Template downloaded");
  }

  function matchUser(token) {
    const t = String(token || "").trim();
    if (!t) return null;
    const tl = t.toLowerCase();
    return (
      users.find((u) => (u.email || "").toLowerCase() === tl) ||
      users.find((u) => (u.name || "").toLowerCase() === tl) ||
      null
    );
  }

  // Existing team codes for one owner+company, for the duplicate check.
  function teamCodesFor(ownerKind, companyName) {
    const list = nocTeams.filter((t) => (t.owner || "mon") === ownerKind && t.company === companyName);
    return new Set(list.map((t) => t.code.toLowerCase()));
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
    if (col("Code Name") < 0 && col("Code") < 0 && col("Team Name") < 0) {
      setImportErr(`Needs a "Code Name" column. This file has: ${grid[0].join(", ")}`);
      return;
    }
    const get = (r, name) => { const k = col(name); return k < 0 ? "" : String(r[k] || "").trim(); };
    const findCompany = (kind, name) => {
      const nl = name.toLowerCase();
      const src = kind === "sec" ? secNames : monNames;
      return src.find((c) => c.toLowerCase() === nl) || null;
    };
    const seen = new Set(); // owner|company|code within this file
    const rows = grid.slice(1).filter((r) => r.some((c) => c && c.trim())).map((r, i) => {
      const code = get(r, "Code Name") || get(r, "Code") || get(r, "Team Name") || get(r, "Name");
      const belongsRaw = normHead(get(r, "Belongs To") || get(r, "Owner") || get(r, "Type"));
      const ownerKind = belongsRaw.includes("sec") ? "sec" : "mon"; // default monitoring
      const companyIn = get(r, "Company") || get(r, "Monitoring Company") || get(r, "Security Company");
      const company = findCompany(ownerKind, companyIn);
      const covers = [
        get(r, "Coverage 1") || get(r, "Coverage") || get(r, "Security Region 1") || get(r, "Region 1"),
        get(r, "Coverage 2") || get(r, "Security Region 2") || get(r, "Region 2"),
      ].filter(Boolean);
      const colPhones = splitList(get(r, "Phone(s)") || get(r, "Phones") || get(r, "Phone"));
      const colEmails = splitList(get(r, "Email(s)") || get(r, "Emails") || get(r, "Email"));
      const userTokens = [
        get(r, "NOC User 1") || get(r, "User 1") || get(r, "Member 1"),
        get(r, "NOC User 2") || get(r, "User 2") || get(r, "Member 2"),
      ].filter(Boolean);
      const matched = [], unmatched = [];
      userTokens.forEach((tok) => { const u = matchUser(tok); if (u) matched.push(u); else unmatched.push(tok); });
      const phones = colPhones.length ? colPhones : [...new Set(matched.map((u) => u.phone).filter(Boolean))];
      const emails = colEmails.length ? colEmails : [...new Set(matched.map((u) => u.email).filter(Boolean))];

      let status = "new", note = "";
      const notes = [];
      const key = `${ownerKind}|${(company || companyIn).toLowerCase()}|${code.toLowerCase()}`;
      if (!code) { status = "error"; note = "Code Name is blank"; }
      else if (!companyIn) { status = "error"; note = "Company is blank"; }
      else if (!company) { status = "error"; note = `unknown ${ownerKind === "sec" ? "security" : "monitoring"} company “${companyIn}”`; }
      else if (seen.has(key)) { status = "dupe"; note = "repeated in this file"; }
      else if (teamCodesFor(ownerKind, company).has(code.toLowerCase())) { status = "dupe"; note = `already registered for ${company}`; }
      else if (!phones.length && !emails.length) { status = "error"; note = "no contact — add a phone/email or a matched user"; }
      else {
        notes.push(ownerKind === "sec" ? "security" : "monitoring");
        notes.push(covers.length ? `${covers.length} region${covers.length > 1 ? "s" : ""}` : "country-wide");
        if (matched.length) notes.push(`${matched.length} user${matched.length > 1 ? "s" : ""} matched`);
        if (unmatched.length) notes.push(`unmatched: ${unmatched.join(", ")}`);
        note = notes.join(" · ");
      }
      if (code && company) seen.add(key);
      return { n: i + 2, code, ownerKind, company, covers, phones, emails, matched, unmatched, status, note };
    });
    setImportPreview({ rows, fileName });
    setImportErr("");
  }

  function confirmImport() {
    const pv = importPreview;
    if (!pv) return;
    const toAdd = pv.rows.filter((r) => r.status === "new");
    if (!toAdd.length) { setImportErr("Nothing new to import."); return; }

    const teamsBody = toAdd.map((r) => ({
      code: r.code, owner: r.ownerKind, company: r.company,
      covers: r.covers.slice(), phones: r.phones, emails: r.emails,
      memberIds: r.matched.map((u) => String(u.id)),
    }));
    fetch("/api/mainapp/noc/teams", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teams: teamsBody }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => {
        setImportOpen(false);
        setImportPreview(null);
        flashToast(`Imported ${toAdd.length} NOC team${toAdd.length > 1 ? "s" : ""}`);
        loadNocTeams();
      })
      .catch(() => setImportErr("Import failed. Try again."));
  }

  function switchOwner(next) {
    setOwner(next);
    const names = next === "mon" ? monNames : secNames;
    setForm({ company: names[0] || "", code: "", phones: "", emails: "", covers: [], members: [] });
    setEditing(null);
    setErr("");
  }

  function clearForm() {
    setForm({ company: (owner === "mon" ? monNames : secNames)[0] || "", code: "", phones: "", emails: "", covers: [], members: [] });
    setEditing(null);
    setErr("");
  }

  function teamsOf(company) {
    return nocTeams.filter((t) => (t.owner || "mon") === owner && t.company === company);
  }

  function loadNoc(company, code) {
    const t = teamsOf(company).find((x) => x.code === code);
    if (!t) return;
    setEditing({ company, code });
    setErr("");
    setForm({
      company,
      code: t.code,
      phones: joinContacts(t.phones),
      emails: joinContacts(t.emails),
      covers: (t.covers || []).slice(),
      members: [],
    });
    // Load this team's persisted members (keyed by the team code).
    fetch(`/api/mainapp/response/teams/${encodeURIComponent(t.code)}/members`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setForm((f) => (f.code === t.code ? { ...f, members: (d?.members || []).map((m) => m.id) } : f)))
      .catch(() => {});
  }

  function save() {
    setErr("");
    const code = form.code.trim();
    if (!code) return setErr("Team name is required.");
    const ph = checkContacts(form.phones, "phone");
    const em = checkContacts(form.emails, "email");
    if (!ph.list.length) return setErr("At least one phone number is required.");
    if (!ph.ok) return setErr("Check these phone numbers: " + ph.bad.join(", "));
    if (!em.list.length) return setErr("At least one email address is required.");
    if (!em.ok) return setErr("Check these email addresses: " + em.bad.join(", "));

    const company = form.company;
    const original = editing ? editing.code : null;
    const dup = nocTeams.some((x) => x.code === code && x.company === company && (x.owner || "mon") === owner && x.code !== original);
    if (dup) return setErr('A NOC team called "' + code + '" already exists for ' + company + ".");

    const body = {
      code, owner, company, covers: form.covers.slice(),
      phones: ph.list, emails: em.list, memberIds: (form.members || []).map((x) => String(x)),
    };
    const url = editing
      ? `/api/mainapp/noc/teams/${encodeURIComponent(editing.code)}`
      : "/api/mainapp/noc/teams";
    fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => { flashToast("NOC team " + code + (editing ? " updated" : " registered")); clearForm(); loadNocTeams(); })
      .catch(() => setErr("Could not save the NOC team. Try again."));
  }

  function removeNoc(company, code) {
    if (typeof window !== "undefined" &&
        !window.confirm("Delete NOC team " + code + "? This cannot be undone.")) return;
    fetch(`/api/mainapp/noc/teams/${encodeURIComponent(code)}`, { method: "DELETE" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => { if (editing && editing.code === code) clearForm(); flashToast("NOC team " + code + " deleted"); loadNocTeams(); })
      .catch(() => flashToast("Could not delete " + code));
  }

  /* flattened list for the current owner type */
  const every = useMemo(() => {
    return nocTeams
      .filter((t) => (t.owner || "mon") === owner)
      .map((t) => ({ company: t.company, team: t }));
  }, [owner, nocTeams]);

  const filtered = useMemo(() => {
    return every.filter((y) => {
      const t = y.team;
      return listMatch(term, [t.code, y.company, (t.covers || []).join(" ") || "country-wide",
        joinContacts(t.phones), joinContacts(t.emails)].join(" "));
    });
  }, [every, term]);

  const countLabel = term.trim() ? `${filtered.length} of ${every.length}` : `${every.length}`;
  const coLab = owner === "mon" ? "MONITORING COMPANY" : "SECURITY COMPANY";

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>NOC teams</div>
          <div className={styles.sub}>Control room desks — shared phone and email, no personal names</div>
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
          <span className={styles.cardHIcon}><i className="ti ti-headset" /></span>
          NOC teams
        </div>
        <div className={styles.cardSub}>
          NOC teams belong to a monitoring company and cover its assigned clusters.
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>NOC BELONGS TO</label>
            <select className={styles.in} value={owner} onChange={(e) => switchOwner(e.target.value)}>
              <option value="mon">Monitoring company</option>
              <option value="sec">Security company</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>{coLab}</label>
            <select className={styles.in} value={form.company} onChange={(e) => set("company", e.target.value)}>
              {companyList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.covWrap}>
          <label className={styles.lab}>COVERS — one or more regions, or the whole country</label>
          <CoveragePicker covers={form.covers} onToggle={toggleCover} onAll={coverAll} regions={regionsReg} />
        </div>

        <div className={styles.g1}>
          <div className={styles.field}>
            <label className={styles.lab}>TEAM NAME</label>
            <input className={styles.in} placeholder="NOC Team 4"
              value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>NOC PHONE(S) — comma separated</label>
            <input className={styles.in} placeholder="+254 7.., +254 7.."
              value={form.phones} onChange={(e) => set("phones", e.target.value)} />
            <ContactChips value={form.phones} kind="phone" />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>NOC EMAIL(S) — comma separated</label>
            <input className={styles.in} placeholder="name@co.ke, second@co.ke"
              value={form.emails} onChange={(e) => set("emails", e.target.value)} />
            <ContactChips value={form.emails} kind="email" />
          </div>
        </div>

        {/* Team members — users who Acknowledge as this team (persisted) */}
        <div className={styles.field} style={{ marginTop: 4 }}>
          <label className={styles.lab}>TEAM MEMBERS — users who acknowledge as this team</label>
          <input className={styles.in} placeholder="Search users by name / email / role…"
            value={memberSearch} onFocus={() => setMemberOpen(true)}
            onChange={(e) => { setMemberSearch(e.target.value); setMemberOpen(true); }} />
          {(form.members || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {(form.members || []).map((id) => {
                const u = users.find((x) => x.id === id);
                return (
                  <span key={id} onClick={() => toggleMember(id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EEF2FF", color: "#4F46E5",
                             border: "1px solid #C7D2FE", borderRadius: 999, padding: "3px 10px", fontSize: 12.5, cursor: "pointer" }}>
                    {(u?.name || u?.email || `#${id}`)} <i className="ti ti-x" style={{ fontSize: 12 }} />
                  </span>
                );
              })}
            </div>
          )}
          {memberOpen && (
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 6, maxHeight: 190, overflow: "auto" }}>
              {users
                .filter((u) => { const t = memberSearch.trim().toLowerCase(); return !t || `${u.name || ""} ${u.email || ""} ${u.role || ""}`.toLowerCase().includes(t); })
                .slice(0, 60)
                .map((u) => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                    <input type="checkbox" checked={(form.members || []).includes(u.id)} onChange={() => toggleMember(u.id)} />
                    <span style={{ fontWeight: 600, color: "#0f274a" }}>{u.name || u.email}</span>
                    <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: "auto" }}>{u.role}</span>
                  </label>
                ))}
              {users.length === 0 && <div style={{ padding: 10, color: "#94a3b8", fontSize: 12.5 }}>No users found.</div>}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            When these users Acknowledge an alarm, the log shows their name and “{form.code || "this team"}”.
          </div>
        </div>

        <div className={styles.formActions}>
          {editing ? (
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={clearForm}>Cancel</button>
          ) : null}
          <button type="button" className={styles.btn} onClick={save}>
            {editing ? "Save changes" : "Register NOC team"}
          </button>
        </div>

        {err ? <div className={styles.err}>{err}</div> : null}
      </div>

      {/* registered list */}
      <div className={styles.registeredLab}>REGISTERED ({countLabel})</div>
      <div className={styles.search}>
        <i className="ti ti-search" />
        <input className={styles.searchInput}
          placeholder="Search NOC teams by name, company, coverage or contact..."
          value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      <div>
        {filtered.length ? filtered.map((y) => {
          const t = y.team;
          const cov = t.covers && t.covers.length;
          return (
            <div key={y.company + "|" + t.code} className={styles.row}>
              <span className={styles.rowIcon}><i className="ti ti-headset" /></span>
              <div className={styles.rowBody}>
                <div className={styles.rowCode}>{t.code}</div>
                <div className={styles.rowMeta}>{joinContacts(t.phones)}</div>
                <div className={styles.rowEmail}>{joinContacts(t.emails)}</div>
                <div className={styles.rowChips}>
                  <span className={styles.tchip} style={{ color: "#0284c7", background: "#e0f2fe" }}>{y.company}</span>
                  {cov
                    ? t.covers.map((r) => (
                        <span key={r} className={styles.tchip} style={{ color: "#0f766e", background: "#ccfbf1" }}>{r}</span>
                      ))
                    : <span className={styles.tchip} style={{ color: "#059669", background: "#d1fae5" }}>Country-wide</span>}
                </div>
              </div>
              <button type="button" className={styles.rowEd} aria-label="Edit" onClick={() => loadNoc(y.company, t.code)}>
                <i className="ti ti-pencil" />
              </button>
              <button type="button" className={styles.rowDel} aria-label="Remove" onClick={() => removeNoc(y.company, t.code)}>
                <i className="ti ti-trash" />
              </button>
            </div>
          );
        }) : (
          <div className={styles.empty}>
            {term.trim() ? `No NOC teams match “${term.trim()}”` : "No NOC teams registered yet"}
          </div>
        )}
      </div>

      {/* import dialog */}
      {importOpen ? (
        <div onClick={() => setImportOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", zIndex: 60, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "min(800px, 96vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.28)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid #EEF2F7" }}>
              <span className={styles.cardHIcon}><i className="ti ti-upload" /></span>
              <div style={{ fontWeight: 800, color: "#0F274A", fontSize: 16 }}>Import NOC teams</div>
              <button type="button" onClick={() => setImportOpen(false)}
                style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", color: "#94A3B8", fontSize: 20 }} aria-label="Close">
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
                Columns: <b>Code Name</b>, <b>Belongs To</b> (Monitoring / Security), <b>Company</b>,
                {" "}<b>Coverage 1</b>, <b>Coverage 2</b>, <b>Phone(s)</b>, <b>Email(s)</b>,
                {" "}<b>NOC User 1</b>, <b>NOC User 2</b>. <b>Code Name and Company are required</b>; the company
                must already exist. Leave coverage blank for country-wide. Contacts default to the matched users’
                contacts when the phone/email columns are empty.
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
                          {r.company ? <span style={{ color: "#0284C7", fontSize: 12 }}>{r.company}</span> : null}
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
