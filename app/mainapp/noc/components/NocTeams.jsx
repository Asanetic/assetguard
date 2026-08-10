// app/mainapp/noc/components/NocTeams.jsx
// NOC teams page — a faithful React port of the prototype's
// agTeamsPageHtml("noc") / agTeamsPageMount(root,"noc").
//
// A NOC team is a shared control-room desk: a code, a shared phone and a shared
// email — never a person. It belongs to a monitoring OR a security company and
// COVERS a set of security regions (no selection = country-wide). This screen
// is in-memory, exactly like the prototype (there is no NOC backend yet).
"use client";

import { useMemo, useRef, useState } from "react";
import styles from "./noc.module.css";
import { SEC_REGIONS, SEC_COMPANIES, MON_COMPANIES, SEC_NOC } from "./nocData.js";

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
function CoveragePicker({ covers, onToggle, onAll }) {
  const all = covers.length === 0;
  return (
    <div className={styles.pick}>
      <label className={styles.pickAll}>
        <input type="checkbox" checked={all} onChange={onAll} />
        Country-wide
      </label>
      <div className={styles.pickList}>
        {SEC_REGIONS.map((r) => (
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
  // in-memory stores (seeded from the prototype)
  const [monData, setMonData] = useState(() => MON_COMPANIES.map((c) => ({ name: c.name, teams: c.teams.map((t) => ({ ...t })) })));
  const [secData, setSecData] = useState(() => {
    const o = {};
    Object.keys(SEC_NOC).forEach((k) => { o[k] = SEC_NOC[k].map((t) => ({ ...t })); });
    return o;
  });

  const [owner, setOwner] = useState("mon"); // 'mon' | 'sec'
  const monNames = monData.map((c) => c.name);
  const companyList = owner === "mon" ? monNames : SEC_COMPANIES;

  const emptyForm = { company: companyList[0], code: "", phones: "", emails: "", covers: [] };
  const [form, setForm] = useState({ company: monNames[0], code: "", phones: "", emails: "", covers: [] });
  const [editing, setEditing] = useState(null); // { company, code } | null
  const [err, setErr] = useState("");
  const [term, setTerm] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

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

  function switchOwner(next) {
    setOwner(next);
    const names = next === "mon" ? monNames : SEC_COMPANIES;
    setForm({ company: names[0], code: "", phones: "", emails: "", covers: [] });
    setEditing(null);
    setErr("");
  }

  function clearForm() {
    setForm({ company: (owner === "mon" ? monNames : SEC_COMPANIES)[0], code: "", phones: "", emails: "", covers: [] });
    setEditing(null);
    setErr("");
  }

  function teamsOf(company) {
    if (owner === "mon") { const c = monData.find((x) => x.name === company); return c ? c.teams : []; }
    return secData[company] || [];
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
    });
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
    const payload = { code, covers: form.covers.slice(), phones: ph.list, emails: em.list };

    if (owner === "mon") {
      const target = editing ? (editing.company || company) : company;
      const exists = (monData.find((c) => c.name === target)?.teams || []);
      const dup = exists.some((x) => x.code === code && !(editing && x.code === editing.code));
      if (dup) return setErr('A NOC team called "' + code + '" already exists for ' + target + ".");
      setMonData((arr) => arr.map((c) => {
        if (c.name !== target) return c;
        if (editing) return { ...c, teams: c.teams.map((x) => (x.code === editing.code ? payload : x)) };
        return { ...c, teams: [...c.teams, payload] };
      }));
    } else {
      const target = editing ? (editing.company || company) : company;
      const exists = secData[target] || [];
      const dup = exists.some((x) => x.code === code && !(editing && x.code === editing.code));
      if (dup) return setErr('A NOC team called "' + code + '" already exists for ' + target + ".");
      setSecData((o) => {
        const cur = o[target] || [];
        const teams = editing ? cur.map((x) => (x.code === editing.code ? payload : x)) : [...cur, payload];
        return { ...o, [target]: teams };
      });
    }
    flashToast("NOC team " + code + (editing ? " updated" : " registered"));
    clearForm();
  }

  function removeNoc(company, code) {
    if (typeof window !== "undefined" &&
        !window.confirm("Delete NOC team " + code + "? This cannot be undone.")) return;
    if (owner === "mon") {
      setMonData((arr) => arr.map((c) => (c.name === company ? { ...c, teams: c.teams.filter((x) => x.code !== code) } : c)));
    } else {
      setSecData((o) => ({ ...o, [company]: (o[company] || []).filter((x) => x.code !== code) }));
    }
    if (editing && editing.code === code) clearForm();
    flashToast("NOC team " + code + " deleted");
  }

  /* flattened list for the current owner type */
  const every = useMemo(() => {
    const out = [];
    if (owner === "mon") monData.forEach((c) => (c.teams || []).forEach((t) => out.push({ company: c.name, team: t })));
    else Object.keys(secData).forEach((co) => (secData[co] || []).forEach((t) => out.push({ company: co, team: t })));
    return out;
  }, [owner, monData, secData]);

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
          <CoveragePicker covers={form.covers} onToggle={toggleCover} onAll={coverAll} />
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

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
