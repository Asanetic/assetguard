// app/mainapp/admin/settings/components/SystemSettings.jsx
// System settings — a faithful React port of the prototype's agSettingsHtml +
// agSettingsSectionsHtml/Mount (the AG_CFG-backed sections that are actually
// rendered). Three parts:
//
//   1. Company    — the client org that owns the system (name, domain, country
//                   with a DERIVED timezone, and one manager + two assistants).
//   2. Locations  — the single place countries, counties, distribution regions,
//                   security regions and response clusters are registered.
//                   Everywhere else these become dropdowns. Includes a REAL
//                   Excel import (SheetJS) per type and a dependency-aware
//                   delete (you must move dependants before removing).
//   3. System     — runtime configuration: Alarms, Notifications, Device
//                   defaults, Map & display, Data retention, Access & security.
//
// In the prototype the "Import from Excel" buttons were a stub that staged a
// hardcoded list. Here they actually read the chosen .xlsx, map the expected
// columns, show a NEW / SKIP / ERROR preview, and import the new rows.
//
// State is in-memory (like the prototype). Nothing here is wired to the DB yet.
"use client";

import { useMemo, useRef, useState } from "react";
import styles from "./settings.module.css";
import {
  TZ_BY_COUNTRY, SEED_COUNTRIES, SEED_COUNTIES, SEED_DIST_REGIONS,
  SEED_SEC_REGIONS, SEC_COMPANIES, SEED_CLUSTERS, SEED_ORG, SEED_CFG,
  LOC_TABS, IMPORT_COLUMNS,
} from "./settingsData.js";
import { SEED_TEAMS } from "../../../response/components/teamsData.js";
import { SEC_NOC } from "../../../noc/components/nocData.js";

/* ---- contact helpers ---- */
function splitContacts(v) { return String(v || "").split(",").map((x) => x.trim()).filter(Boolean); }
function joinContacts(a) { return (a || []).join(", "); }
function validPhone(p) { return /^[+0-9][0-9\s()-]{6,}$/.test(p); }
function checkPhones(v) {
  const list = splitContacts(v);
  const bad = list.filter((x) => !validPhone(x));
  return { ok: bad.length === 0, list, bad };
}

/* immutable set-by-dotted-path (supports numeric array indices) */
function setByPath(obj, path, value) {
  const parts = path.split(".");
  const clone = structuredClone(obj);
  let o = clone;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
  return clone;
}

const TAB_LABEL = { country: "Countries", county: "Counties", dist: "Distribution regions", sec: "Security regions", cluster: "Response clusters" };

export default function SystemSettings() {
  /* ---- Company ---- */
  const [org, setOrg] = useState(() => structuredClone(SEED_ORG));

  /* ---- Locations ---- */
  const [countries, setCountries] = useState(() => SEED_COUNTRIES.map((c) => ({ ...c })));
  const [counties, setCounties] = useState(() => SEED_COUNTIES.map((c) => ({ ...c })));
  const [distRegions, setDistRegions] = useState(() => SEED_DIST_REGIONS.slice());
  const [secRegions, setSecRegions] = useState(() => SEED_SEC_REGIONS.slice());
  const [clusters, setClusters] = useState(() => SEED_CLUSTERS.map((c) => ({ ...c })));

  const [tab, setTab] = useState("country");
  const [locErr, setLocErr] = useState("");
  const [form, setForm] = useState({
    country: "", countyName: "", countyCountry: "Kenya",
    distName: "", secName: "",
    clusterName: "", clusterCompany: SEC_COMPANIES[0], clusterRm: "", clusterPhones: "",
  });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* ---- System config ---- */
  const [cfg, setCfg] = useState(() => structuredClone(SEED_CFG));
  const cset = (path, value) => setCfg((c) => setByPath(c, path, value));
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };

  const [saveNote, setSaveNote] = useState({ text: "Changes apply immediately across the system.", tone: "" });
  const noteTimer = useRef(null);
  function flashNote(text, tone) {
    setSaveNote({ text, tone });
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setSaveNote({ text: "Changes apply immediately across the system.", tone: "" }), 2600);
  }

  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  function flashToast(t) {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  /* ---- derived: timezone (never typed) ---- */
  const tzInfo = useMemo(() => {
    const c = countries.find((x) => x.name === org.country);
    if (c) return { tz: c.tz, off: c.off, abbr: c.abbr };
    return TZ_BY_COUNTRY[org.country] || null;
  }, [countries, org.country]);

  const knownUnregistered = useMemo(
    () => Object.keys(TZ_BY_COUNTRY).filter((n) => !countries.some((c) => c.name === n)),
    [countries]
  );

  /* ---- counts for the location list chips ---- */
  const countiesFor = (country) => counties.filter((c) => c.country === country).length;
  const nocForRegion = (region) => {
    let n = 0;
    Object.keys(SEC_NOC).forEach((co) => SEC_NOC[co].forEach((t) => { if ((t.covers || []).indexOf(region) > -1) n++; }));
    return n;
  };
  const teamsForCluster = (name) => SEED_TEAMS.filter((t) => (t.clusters || []).indexOf(name) > -1).length;

  /* ---- location rows for the active tab ---- */
  const rows = useMemo(() => {
    if (tab === "country") return countries.map((c) => ({ k: c.name, main: c.name, sub: `${c.tz} · ${c.off} (${c.abbr})`, chip: `${countiesFor(c.name)} counties` }));
    if (tab === "county") return counties.map((c) => ({ k: c.name, main: c.name, sub: "", chip: c.country }));
    if (tab === "dist") return distRegions.map((r) => ({ k: r, main: r, sub: "", chip: "distribution" }));
    if (tab === "sec") return secRegions.map((r) => ({ k: r, main: r, sub: "", chip: `${nocForRegion(r)} NOC teams` }));
    return clusters.map((c) => ({ k: c.name, main: c.name, sub: `${c.rm} · ${joinContacts(c.rmPhones)}`, chip: `${teamsForCluster(c.name)} response teams` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, countries, counties, distRegions, secRegions, clusters]);

  /* ---- add (per tab) ---- */
  function onAdd() {
    setLocErr("");
    if (tab === "country") {
      const name = (form.country || knownUnregistered[0] || "").trim();
      if (!name) return setLocErr("Country name is required.");
      if (countries.some((c) => c.name === name)) return setLocErr(`"${name}" is already registered.`);
      const tz = TZ_BY_COUNTRY[name];
      if (!tz) return setLocErr(`No timezone known for "${name}". Add it to the timezone table first.`);
      setCountries((a) => [...a, { name, tz: tz.tz, off: tz.off, abbr: tz.abbr }]);
      setF("country", "");
    } else if (tab === "county") {
      const name = form.countyName.trim();
      const country = form.countyCountry;
      if (!name) return setLocErr("County name is required.");
      if (!country) return setLocErr("Select the country this county belongs to.");
      if (counties.some((c) => c.name === name && c.country === country)) return setLocErr(`"${name}" already exists in ${country}.`);
      setCounties((a) => [...a, { name, country }]);
      setF("countyName", "");
    } else if (tab === "dist" || tab === "sec") {
      const name = (tab === "dist" ? form.distName : form.secName).trim();
      const list = tab === "dist" ? distRegions : secRegions;
      if (!name) return setLocErr("Region name is required.");
      if (list.indexOf(name) > -1) return setLocErr(`"${name}" is already registered.`);
      if (tab === "dist") { setDistRegions((a) => [...a, name]); setF("distName", ""); }
      else { setSecRegions((a) => [...a, name]); setF("secName", ""); }
    } else {
      const name = form.clusterName.trim();
      if (!name) return setLocErr("A cluster name is required.");
      if (clusters.some((c) => c.name === name)) return setLocErr(`A cluster named "${name}" already exists.`);
      if (!form.clusterRm.trim()) return setLocErr("A regional manager is required for the cluster.");
      const ph = checkPhones(form.clusterPhones);
      if (!ph.ok) return setLocErr("Check these phone numbers: " + ph.bad.join(", "));
      setClusters((a) => [...a, { name, company: form.clusterCompany, rm: form.clusterRm.trim(), rmPhones: ph.list, rmEmails: [] }]);
      setForm((f) => ({ ...f, clusterName: "", clusterRm: "", clusterPhones: "" }));
    }
  }

  /* ---- dependency-aware delete ---- */
  const KIND = { country: "country", county: "county", dist: "distRegion", sec: "secRegion", cluster: "cluster" };
  function dependantsOf(name) {
    if (tab === "country") { const n = countiesFor(name); return n ? [{ label: "counties", n }] : []; }
    if (tab === "sec") { const n = nocForRegion(name); return n ? [{ label: "NOC teams", n }] : []; }
    if (tab === "cluster") { const n = teamsForCluster(name); return n ? [{ label: "response teams", n }] : []; }
    return [];
  }
  const [delDialog, setDelDialog] = useState(null); // { name, deps, others, repl }
  function askDelete(name) {
    setLocErr("");
    const deps = dependantsOf(name);
    const others = rows.map((r) => r.k).filter((k) => k !== name);
    if (!deps.length) { doRemove(name, null); return; }
    if (!others.length) {
      setLocErr(`Cannot remove "${name}" — ${deps.map((d) => d.n + " " + d.label).join(", ")} depend on it and there is no alternative to move them to.`);
      return;
    }
    setDelDialog({ name, deps, others, repl: others[0] });
  }
  function doRemove(name, replaceWith) {
    if (tab === "country") {
      if (replaceWith) setCounties((a) => a.map((c) => (c.country === name ? { ...c, country: replaceWith } : c)));
      setCountries((a) => a.filter((c) => c.name !== name));
    } else if (tab === "county") {
      setCounties((a) => a.filter((c) => c.name !== name));
    } else if (tab === "dist") {
      setDistRegions((a) => a.filter((r) => r !== name));
    } else if (tab === "sec") {
      setSecRegions((a) => a.filter((r) => r !== name));
    } else {
      setClusters((a) => a.filter((c) => c.name !== name));
    }
    flashToast(`Removed ${name}`);
  }

  /* ---- Excel import (real) ---- */
  const [imp, setImp] = useState(null); // { fileName, staged:[{entry, verdict, reason}] }
  const fileRef = useRef(null);

  function verdictFor(tab_, entry, seenInFile) {
    if (tab_ === "country") {
      if (countries.some((c) => c.name === entry.name) || seenInFile.has(entry.name)) return { v: "skip", r: "already registered" };
      if (!TZ_BY_COUNTRY[entry.name]) return { v: "error", r: "no timezone known" };
      return { v: "new", r: "" };
    }
    if (tab_ === "county") {
      const key = entry.name + "|" + entry.country;
      if (counties.some((c) => c.name === entry.name && c.country === entry.country) || seenInFile.has(key)) return { v: "skip", r: "already exists in " + entry.country };
      return { v: "new", r: "" };
    }
    if (tab_ === "dist" || tab_ === "sec") {
      const list = tab_ === "dist" ? distRegions : secRegions;
      if (list.indexOf(entry.name) > -1 || seenInFile.has(entry.name)) return { v: "skip", r: "already registered" };
      return { v: "new", r: "" };
    }
    if (clusters.some((c) => c.name === entry.name) || seenInFile.has(entry.name)) return { v: "skip", r: "already exists" };
    return { v: "new", r: "" };
  }

  function keyOf(tab_, entry) { return tab_ === "county" ? entry.name + "|" + entry.country : entry.name; }

  function parseMatrix(tab_, matrix) {
    if (!matrix.length) return [];
    const cols = IMPORT_COLUMNS[tab_];
    const header = matrix[0].map((h) => String(h ?? "").trim().toLowerCase());
    const hasHeader = cols.some((c) => header.indexOf(c.toLowerCase()) > -1);
    const idx = {};
    cols.forEach((c, i) => { const f = header.indexOf(c.toLowerCase()); idx[c] = f > -1 ? f : i; });
    const dataRows = hasHeader ? matrix.slice(1) : matrix;
    const out = [];
    dataRows.forEach((row) => {
      if (!row || !row.length) return;
      const get = (c) => String(row[idx[c]] ?? "").trim();
      if (tab_ === "country" || tab_ === "dist" || tab_ === "sec") {
        const name = get(cols[0]); if (name) out.push({ name });
      } else if (tab_ === "county") {
        const name = get("County"); const country = get("Country") || org.country;
        if (name) out.push({ name, country });
      } else {
        const name = get("Cluster name");
        const company = get("Security company") || SEC_COMPANIES[0];
        const rm = get("Regional manager");
        const phones = splitContacts(get("Phone(s)"));
        if (name) out.push({ name, company, rm, phones });
      }
    });
    return out;
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      const entries = parseMatrix(tab, matrix);
      const seen = new Set();
      const staged = entries.map((entry) => {
        const vr = verdictFor(tab, entry, seen);
        seen.add(keyOf(tab, entry));
        return { entry, verdict: vr.v, reason: vr.r };
      });
      setImp({ fileName: file.name, staged });
    } catch (err) {
      setImp({ fileName: file ? file.name : "", staged: [], error: "Could not read that file. Make sure it's a valid .xlsx or .xls." });
    }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const header = IMPORT_COLUMNS[tab];
    const example = {
      country: ["Uganda"],
      county: ["Kajiado", "Kenya"],
      dist: ["Southern"],
      sec: ["Nairobi East"],
      cluster: ["Cluster H — Nyanza", "Falcon Guard Ltd", "Jane Doe", "+254 700 000 000"],
    }[tab];
    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, TAB_LABEL[tab]);
    XLSX.writeFile(wb, `assetguard-${tab}-template.xlsx`);
  }

  function confirmImport() {
    if (!imp) return;
    const news = imp.staged.filter((s) => s.verdict === "new").map((s) => s.entry);
    let added = 0;
    if (tab === "country") { setCountries((a) => { const next = a.slice(); news.forEach((e) => { const tz = TZ_BY_COUNTRY[e.name]; if (tz && !next.some((c) => c.name === e.name)) { next.push({ name: e.name, tz: tz.tz, off: tz.off, abbr: tz.abbr }); added++; } }); return next; }); }
    else if (tab === "county") { setCounties((a) => { const next = a.slice(); news.forEach((e) => { if (!next.some((c) => c.name === e.name && c.country === e.country)) { next.push({ name: e.name, country: e.country }); added++; } }); return next; }); }
    else if (tab === "dist") { setDistRegions((a) => { const next = a.slice(); news.forEach((e) => { if (next.indexOf(e.name) < 0) { next.push(e.name); added++; } }); return next; }); }
    else if (tab === "sec") { setSecRegions((a) => { const next = a.slice(); news.forEach((e) => { if (next.indexOf(e.name) < 0) { next.push(e.name); added++; } }); return next; }); }
    else { setClusters((a) => { const next = a.slice(); news.forEach((e) => { if (!next.some((c) => c.name === e.name)) { next.push({ name: e.name, company: e.company || SEC_COMPANIES[0], rm: e.rm || "Imported — set manager", rmPhones: e.phones || [], rmEmails: [] }); added++; } }); return next; }); }
    const skipped = imp.staged.length - news.length;
    setImp(null);
    flashToast(`${added} imported${skipped ? `, ${skipped} skipped` : ""}`);
  }

  /* ================= render ================= */
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Settings</div>
          <div className={styles.sub}>Global configuration — company, locations and system behaviour</div>
        </div>
      </div>

      {/* ---- Company ---- */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#ede9fe", color: "#7c3aed" }}><i className="ti ti-building" /></span>
          Company
        </div>
        <div className={styles.cardSub}>The organisation this system belongs to — not one of the registered companies.</div>
        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>COMPANY NAME</label>
            <input className={styles.in} value={org.name} onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>DOMAIN</label>
            <input className={styles.in} value={org.domain} onChange={(e) => setOrg((o) => ({ ...o, domain: e.target.value }))} />
          </div>
        </div>
        <div className={styles.g3}>
          <div className={styles.field}>
            <label className={styles.lab}>COUNTRY</label>
            <select className={styles.in} value={org.country} onChange={(e) => setOrg((o) => ({ ...o, country: e.target.value }))}>
              {countries.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>TIME ZONE <span className={styles.labHint}>(from country)</span></label>
            <input className={`${styles.in} ${styles.inReadonly}`} readOnly value={tzInfo ? `${tzInfo.tz} (${tzInfo.abbr})` : "—"} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>UTC OFFSET</label>
            <input className={`${styles.in} ${styles.inReadonly}`} readOnly value={tzInfo ? tzInfo.off : "—"} />
          </div>
        </div>
        {[["manager", "Manager"], ["assistant1", "Assistant manager 1"], ["assistant2", "Assistant manager 2"]].map(([k, label]) => {
          const p = org[k];
          return (
            <div className={styles.g3} key={k}>
              <div className={styles.field}>
                <label className={styles.lab}>{label.toUpperCase()}</label>
                <input className={styles.in} value={p.name} onChange={(e) => setOrg((o) => ({ ...o, [k]: { ...o[k], name: e.target.value } }))} />
              </div>
              <div className={styles.field}>
                <label className={styles.lab}>PHONE(S) <span className={styles.labHint}>comma separated</span></label>
                <input className={styles.in} value={joinContacts(p.phones)} onChange={(e) => setOrg((o) => ({ ...o, [k]: { ...o[k], phones: splitContacts(e.target.value) } }))} />
              </div>
              <div className={styles.field}>
                <label className={styles.lab}>EMAIL(S) <span className={styles.labHint}>comma separated</span></label>
                <input className={styles.in} value={joinContacts(p.emails)} onChange={(e) => setOrg((o) => ({ ...o, [k]: { ...o[k], emails: splitContacts(e.target.value) } }))} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Locations ---- */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#d1fae5", color: "#059669" }}><i className="ti ti-world" /></span>
          Locations
        </div>
        <div className={styles.cardSub}>Registered once here — everywhere else these become dropdowns.</div>

        <div className={styles.tabs}>
          {LOC_TABS.map((t) => (
            <button key={t.key} type="button" className={`${styles.tab} ${tab === t.key ? styles.tabOn : ""}`}
              onClick={() => { setTab(t.key); setLocErr(""); }}>{t.label}</button>
          ))}
        </div>

        {/* per-tab add form */}
        {tab === "country" && (
          <>
            <div className={styles.g2}>
              <div className={styles.field}>
                <label className={styles.lab}>COUNTRY</label>
                {knownUnregistered.length ? (
                  <select className={styles.in} value={form.country || knownUnregistered[0]} onChange={(e) => setF("country", e.target.value)}>
                    {knownUnregistered.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : (
                  <select className={styles.in} disabled><option>All known countries registered</option></select>
                )}
              </div>
              <div className={styles.field} style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="button" className={`${styles.btn} ${styles.btnFull}`} onClick={onAdd} disabled={!knownUnregistered.length}>Add country</button>
              </div>
            </div>
            <div className={styles.hintText}>Time zone is set automatically from the country.</div>
          </>
        )}
        {tab === "county" && (
          <div className={styles.g3}>
            <div className={styles.field}>
              <label className={styles.lab}>COUNTY NAME</label>
              <input className={styles.in} placeholder="Kajiado" value={form.countyName} onChange={(e) => setF("countyName", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.lab}>COUNTRY</label>
              <select className={styles.in} value={form.countyCountry} onChange={(e) => setF("countyCountry", e.target.value)}>
                {countries.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className={styles.field} style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" className={`${styles.btn} ${styles.btnFull}`} onClick={onAdd}>Add county</button>
            </div>
          </div>
        )}
        {(tab === "dist" || tab === "sec") && (
          <>
            <div className={styles.g2}>
              <div className={styles.field}>
                <label className={styles.lab}>{tab === "dist" ? "DISTRIBUTION REGION" : "SECURITY REGION"}</label>
                <input className={styles.in} placeholder="Region name"
                  value={tab === "dist" ? form.distName : form.secName}
                  onChange={(e) => setF(tab === "dist" ? "distName" : "secName", e.target.value)} />
              </div>
              <div className={styles.field} style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="button" className={`${styles.btn} ${styles.btnFull}`} onClick={onAdd}>Add region</button>
              </div>
            </div>
            <div className={styles.hintText}>
              {tab === "dist" ? "The client’s commercial split." : "The security company’s operational split — decides which NOC teams cover a site."}
            </div>
          </>
        )}
        {tab === "cluster" && (
          <>
            <div className={styles.g3}>
              <div className={styles.field}>
                <label className={styles.lab}>CLUSTER NAME</label>
                <input className={styles.in} placeholder="Cluster H — Nyanza" value={form.clusterName} onChange={(e) => setF("clusterName", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.lab}>SECURITY COMPANY</label>
                <select className={styles.in} value={form.clusterCompany} onChange={(e) => setF("clusterCompany", e.target.value)}>
                  {SEC_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field} style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="button" className={`${styles.btn} ${styles.btnFull}`} onClick={onAdd}>Add cluster</button>
              </div>
            </div>
            <div className={styles.g2}>
              <div className={styles.field}>
                <label className={styles.lab}>REGIONAL MANAGER</label>
                <input className={styles.in} placeholder="Full name" value={form.clusterRm} onChange={(e) => setF("clusterRm", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.lab}>PHONE(S) <span className={styles.labHint}>comma separated</span></label>
                <input className={styles.in} value={form.clusterPhones} onChange={(e) => setF("clusterPhones", e.target.value)} />
              </div>
            </div>
            <div className={styles.hintText}>Clusters are independent of regions — they decide the response teams for a site.</div>
          </>
        )}

        {locErr ? <div className={styles.err}>{locErr}</div> : null}

        <div className={styles.registeredBar}>
          <span className={styles.registeredLab}>REGISTERED ({rows.length})</span>
          <div className={styles.importBtnWrap}>
            <button type="button" className={styles.btn2} onClick={() => setImp({ fileName: "", staged: [] })}>
              <i className="ti ti-file-spreadsheet" /> Import from Excel
            </button>
          </div>
        </div>

        <div>
          {rows.length ? rows.map((x) => (
            <div key={x.k} className={styles.locRow}>
              <div className={styles.locMain}>
                <div className={styles.locName}>{x.main}</div>
                {x.sub ? <div className={styles.locSub}>{x.sub}</div> : null}
                <div><span className={styles.locChip}>{x.chip}</span></div>
              </div>
              <button type="button" className={styles.locDel} aria-label="Remove" onClick={() => askDelete(x.k)}><i className="ti ti-trash" /></button>
            </div>
          )) : <div className={styles.emptyBox}>Nothing registered yet</div>}
        </div>
      </div>

      {/* ---- System configuration cards ---- */}
      <AlarmsCard cfg={cfg} cset={cset} num={num} />
      <NotifyCard cfg={cfg} cset={cset} num={num} />
      <DevicesCard cfg={cfg} cset={cset} num={num} />
      <MapCard cfg={cfg} cset={cset} num={num} />
      <RetentionCard cfg={cfg} cset={cset} num={num} />
      <SecurityCard cfg={cfg} cset={cset} num={num} />

      {/* ---- save bar ---- */}
      <div className={`${styles.card} ${styles.saveBar}`}>
        <span className={`${styles.saveNote} ${saveNote.tone === "ok" ? styles.saveOk : saveNote.tone === "warn" ? styles.saveWarn : ""}`}>{saveNote.text}</span>
        <button type="button" className={styles.btn2} onClick={() => flashNote("Reset would restore factory defaults — confirm in the backend.", "warn")}>Reset to defaults</button>
        <button type="button" className={styles.btn} onClick={() => flashNote("Settings saved — applied across the system.", "ok")}>Save settings</button>
      </div>

      {/* ---- delete-move dialog ---- */}
      {delDialog ? (
        <div className={styles.scrim} onClick={(e) => { if (e.target === e.currentTarget) setDelDialog(null); }}>
          <div className={styles.modal} role="dialog">
            <b className={styles.modalTitle}>Move dependants before removing</b>
            <div className={styles.modalText}>
              "{delDialog.name}" is used by {delDialog.deps.map((d, i) => (
                <span key={i}><span className={styles.depName}>{d.n} {d.label}</span>{i < delDialog.deps.length - 1 ? " and " : ""}</span>
              ))}. Choose what they should use instead.
            </div>
            <label className={styles.lab}>MOVE THEM TO</label>
            <select className={styles.in} style={{ marginBottom: 14 }} value={delDialog.repl} onChange={(e) => setDelDialog((d) => ({ ...d, repl: e.target.value }))}>
              {delDialog.others.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <div className={styles.modalActions}>
              <button type="button" className={styles.mCancel} onClick={() => setDelDialog(null)}>Cancel</button>
              <button type="button" className={styles.mDanger} onClick={() => { doRemove(delDialog.name, delDialog.repl); setDelDialog(null); }}>Move and remove</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- import dialog ---- */}
      {imp ? (
        <div className={styles.scrim} onClick={(e) => { if (e.target === e.currentTarget) setImp(null); }}>
          <div className={`${styles.modal} ${styles.modalWide}`} role="dialog">
            <b className={styles.modalTitle}>Import {TAB_LABEL[tab].toLowerCase()}</b>
            <div className={styles.expectLine}>
              One workbook per type. Expected columns: <b>{IMPORT_COLUMNS[tab].join(", ")}</b>
            </div>
            {imp.error ? <div className={styles.dlgErr}>{imp.error}</div> : null}

            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onFile} />
            <div className={styles.drop} onClick={() => fileRef.current && fileRef.current.click()}>
              <i className={`ti ti-file-spreadsheet ${styles.dropIcon}`} />
              <div className={styles.dropTitle}>Choose .xlsx file</div>
              <div className={styles.dropFile}>{imp.fileName || "No file selected"}</div>
            </div>

            {imp.staged.length ? (
              <div className={styles.prev}>
                <div className={styles.prevHead}>
                  <span className={`${styles.prevCount} ${styles.cNew}`}>{imp.staged.filter((s) => s.verdict === "new").length} new</span>
                  <span className={`${styles.prevCount} ${styles.cSkip}`}>{imp.staged.filter((s) => s.verdict === "skip").length} skip</span>
                  <span className={`${styles.prevCount} ${styles.cErr}`}>{imp.staged.filter((s) => s.verdict === "error").length} error</span>
                </div>
                {imp.staged.map((s, i) => (
                  <div key={i} className={styles.prevRow}>
                    <span className={styles.prevName}>
                      {s.entry.name}{tab === "county" ? ` · ${s.entry.country}` : ""}{tab === "cluster" && s.entry.company ? ` · ${s.entry.company}` : ""}
                      {s.reason ? <span style={{ color: "#94a3b8" }}> — {s.reason}</span> : ""}
                    </span>
                    <span className={`${styles.tag} ${s.verdict === "new" ? styles.tNew : s.verdict === "skip" ? styles.tSkip : styles.tErr}`}>
                      {s.verdict.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={styles.modalActions}>
              <button type="button" className={styles.mCancel} onClick={downloadTemplate}>Download template</button>
              <button type="button" className={styles.mCancel} onClick={() => setImp(null)}>Cancel</button>
              <button type="button" className={styles.mGo} disabled={!imp.staged.some((s) => s.verdict === "new")} onClick={confirmImport}>Import</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}

/* ============ configuration cards ============ */
function CardShell({ icon, tint, ink, title, sub, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardH}>
        <span className={styles.cardHIcon} style={{ background: tint, color: ink }}><i className={`ti ${icon}`} /></span>
        {title}
      </div>
      <div className={styles.cardSub}>{sub}</div>
      {children}
    </div>
  );
}

function NumField({ label, hint, value, onChange }) {
  return (
    <div className={styles.field}>
      <label className={styles.lab}>{label}{hint ? <span className={styles.labHint}> {hint}</span> : null}</label>
      <input className={styles.in} inputMode="numeric" value={value} onChange={onChange} />
    </div>
  );
}
function TextField({ label, hint, value, onChange }) {
  return (
    <div className={styles.field}>
      <label className={styles.lab}>{label}{hint ? <span className={styles.labHint}> {hint}</span> : null}</label>
      <input className={styles.in} value={value} onChange={onChange} />
    </div>
  );
}
function SelectField({ label, value, options, onChange }) {
  return (
    <div className={styles.field}>
      <label className={styles.lab}>{label}</label>
      <select className={styles.in} value={value} onChange={onChange}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function ToggleField({ label, checked, onChange }) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={onChange} />{label}
    </label>
  );
}

function AlarmsCard({ cfg, cset, num }) {
  const A = cfg.alarms;
  return (
    <CardShell icon="ti-bell" tint="#fee2e2" ink="#dc2626" title="Alarms" sub="Priority behaviour, acknowledgement windows and de-duplication.">
      {A.priorities.map((p, i) => (
        <div className={styles.g3} key={p.key}>
          <div className={styles.field}>
            <label className={styles.lab}>{p.key} colour</label>
            <div className={styles.colourRow}>
              <span className={styles.colourSw} style={{ background: p.colour }} />
              <input className={styles.in} value={p.colour} onChange={(e) => cset(`alarms.priorities.${i}.colour`, e.target.value)} />
            </div>
          </div>
          <NumField label="Escalate after" hint="minutes" value={p.escalateMin} onChange={(e) => cset(`alarms.priorities.${i}.escalateMin`, num(e.target.value, p.escalateMin))} />
          <div className={styles.field}>
            <label className={styles.lab}>Auto-dispatch response</label>
            <ToggleField label="Dispatch automatically" checked={p.autoDispatch} onChange={(e) => cset(`alarms.priorities.${i}.autoDispatch`, e.target.checked)} />
          </div>
        </div>
      ))}
      <div className={styles.g3}>
        <NumField label="Acknowledgement window" hint="minutes" value={A.ackWindowMin} onChange={(e) => cset("alarms.ackWindowMin", num(e.target.value, A.ackWindowMin))} />
        <NumField label="Auto-close unactioned after" hint="hours" value={A.autoCloseHrs} onChange={(e) => cset("alarms.autoCloseHrs", num(e.target.value, A.autoCloseHrs))} />
        <NumField label="Duplicate suppression" hint="minutes" value={A.duplicateWindowMin} onChange={(e) => cset("alarms.duplicateWindowMin", num(e.target.value, A.duplicateWindowMin))} />
      </div>
      <div className={styles.g2}>
        <div className={styles.field}>
          <label className={styles.lab}>During maintenance windows</label>
          <ToggleField label="Suppress alarms" checked={A.suppressDuringMaintenance} onChange={(e) => cset("alarms.suppressDuringMaintenance", e.target.checked)} />
        </div>
        <div />
      </div>
    </CardShell>
  );
}

function NotifyCard({ cfg, cset, num }) {
  const N = cfg.notify;
  const chanKeys = ["app", "sms", "email", "call"];
  const chanHead = ["In-app", "SMS", "Email", "Voice call"];
  return (
    <CardShell icon="ti-send" tint="#dbe7fe" ink="#2e6cf5" title="Notifications" sub="Which channels fire for each priority, quiet hours and retry policy.">
      <div className={styles.matrixWrap}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.left}>PRIORITY</th>
              {chanHead.map((h) => <th key={h} className={styles.ctr}>{h.toUpperCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {N.channels.map((c, i) => (
              <tr key={c.key}>
                <td className={`${styles.left} ${styles.chan}`}>{c.key}</td>
                {chanKeys.map((k) => (
                  <td key={k} className={styles.ctr}>
                    <input type="checkbox" checked={!!c[k]} onChange={(e) => cset(`notify.channels.${i}.${k}`, e.target.checked)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.g3}>
        <TextField label="Quiet hours from" hint="HH:MM" value={N.quietFrom} onChange={(e) => cset("notify.quietFrom", e.target.value)} />
        <TextField label="Quiet hours to" hint="HH:MM" value={N.quietTo} onChange={(e) => cset("notify.quietTo", e.target.value)} />
        <div className={styles.field}>
          <label className={styles.lab}>Critical ignores quiet hours</label>
          <ToggleField label="Always deliver" checked={N.quietOverrideCritical} onChange={(e) => cset("notify.quietOverrideCritical", e.target.checked)} />
        </div>
      </div>
      <div className={styles.g2}>
        <NumField label="Retry unacknowledged after" hint="minutes" value={N.retryMin} onChange={(e) => cset("notify.retryMin", num(e.target.value, N.retryMin))} />
        <NumField label="Maximum retries" value={N.maxRetries} onChange={(e) => cset("notify.maxRetries", num(e.target.value, N.maxRetries))} />
      </div>
    </CardShell>
  );
}

function DevicesCard({ cfg, cset, num }) {
  const D = cfg.devices;
  return (
    <CardShell icon="ti-device-watch" tint="#d1fae5" ink="#059669" title="Device defaults" sub="Applied to newly registered devices. Devices sleep, so grace periods matter more than intervals.">
      <div className={styles.g3}>
        <NumField label="Upload interval" hint="minutes" value={D.uploadIntervalMin} onChange={(e) => cset("devices.uploadIntervalMin", num(e.target.value, D.uploadIntervalMin))} />
        <NumField label="Heartbeat grace" hint="hours" value={D.heartbeatGraceHrs} onChange={(e) => cset("devices.heartbeatGraceHrs", num(e.target.value, D.heartbeatGraceHrs))} />
        <NumField label="Motion sensitivity" hint="1–100" value={D.motionSensitivity} onChange={(e) => cset("devices.motionSensitivity", num(e.target.value, D.motionSensitivity))} />
      </div>
      <div className={styles.g3}>
        <NumField label="Mark offline after" hint="hours" value={D.offlineAfterHrs} onChange={(e) => cset("devices.offlineAfterHrs", num(e.target.value, D.offlineAfterHrs))} />
        <NumField label="Low battery alarm at" hint="%" value={D.lowBatteryPct} onChange={(e) => cset("devices.lowBatteryPct", num(e.target.value, D.lowBatteryPct))} />
        <TextField label="Target firmware" value={D.targetFirmware} onChange={(e) => cset("devices.targetFirmware", e.target.value)} />
      </div>
      <div className={styles.g2}>
        <div className={styles.field}>
          <label className={styles.lab}>New devices</label>
          <ToggleField label="Auto-stage target firmware" checked={D.autoStageFirmware} onChange={(e) => cset("devices.autoStageFirmware", e.target.checked)} />
        </div>
        <div />
      </div>
    </CardShell>
  );
}

function MapCard({ cfg, cset, num }) {
  const M = cfg.map;
  return (
    <CardShell icon="ti-map-2" tint="#e0f2fe" ink="#0284c7" title="Map & display" sub="Default view and formats. Time zone comes from the company country above.">
      <div className={styles.g3}>
        <NumField label="Default latitude" value={M.centreLat} onChange={(e) => cset("map.centreLat", num(e.target.value, M.centreLat))} />
        <NumField label="Default longitude" value={M.centreLng} onChange={(e) => cset("map.centreLng", num(e.target.value, M.centreLng))} />
        <NumField label="Default zoom" hint="1–18" value={M.zoom} onChange={(e) => cset("map.zoom", num(e.target.value, M.zoom))} />
      </div>
      <div className={styles.g3}>
        <SelectField label="Units" value={M.units} options={["Metric (km)", "Imperial (mi)"]} onChange={(e) => cset("map.units", e.target.value)} />
        <SelectField label="Date format" value={M.dateFormat} options={["DD MMM YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]} onChange={(e) => cset("map.dateFormat", e.target.value)} />
        <SelectField label="Time format" value={M.timeFormat} options={["24-hour", "12-hour"]} onChange={(e) => cset("map.timeFormat", e.target.value)} />
      </div>
      <div className={styles.g2}>
        <div className={styles.field}>
          <label className={styles.lab}>Dense areas</label>
          <ToggleField label="Cluster map pins" checked={M.clusterPins} onChange={(e) => cset("map.clusterPins", e.target.checked)} />
        </div>
        <div className={styles.field}>
          <label className={styles.lab}>Geofences</label>
          <ToggleField label="Show on maps" checked={M.showGeofences} onChange={(e) => cset("map.showGeofences", e.target.checked)} />
        </div>
      </div>
    </CardShell>
  );
}

function RetentionCard({ cfg, cset, num }) {
  const R = cfg.retention;
  return (
    <CardShell icon="ti-database" tint="#fef3c7" ink="#b45309" title="Data retention" sub="How long history is kept before it is purged. Longer retention costs storage.">
      <div className={styles.g3}>
        <NumField label="Playback history" hint="days" value={R.playbackDays} onChange={(e) => cset("retention.playbackDays", num(e.target.value, R.playbackDays))} />
        <NumField label="Alarm history" hint="days" value={R.alarmHistoryDays} onChange={(e) => cset("retention.alarmHistoryDays", num(e.target.value, R.alarmHistoryDays))} />
        <NumField label="Audit logs" hint="days" value={R.auditLogDays} onChange={(e) => cset("retention.auditLogDays", num(e.target.value, R.auditLogDays))} />
      </div>
      <div className={styles.g2}>
        <NumField label="Generated exports" hint="days" value={R.exportsDays} onChange={(e) => cset("retention.exportsDays", num(e.target.value, R.exportsDays))} />
        <div className={styles.field}>
          <label className={styles.lab}>Purge</label>
          <ToggleField label="Delete automatically when expired" checked={R.autoPurge} onChange={(e) => cset("retention.autoPurge", e.target.checked)} />
        </div>
      </div>
    </CardShell>
  );
}

function SecurityCard({ cfg, cset, num }) {
  const S = cfg.security;
  return (
    <CardShell icon="ti-lock" tint="#ede9fe" ink="#7c3aed" title="Access & security" sub="Sign-in policy for every user of the platform.">
      <div className={styles.g3}>
        <NumField label="Session timeout" hint="minutes idle" value={S.sessionTimeoutMin} onChange={(e) => cset("security.sessionTimeoutMin", num(e.target.value, S.sessionTimeoutMin))} />
        <NumField label="Minimum password length" hint="characters" value={S.passwordMinLen} onChange={(e) => cset("security.passwordMinLen", num(e.target.value, S.passwordMinLen))} />
        <NumField label="Password expiry" hint="days" value={S.passwordExpiryDays} onChange={(e) => cset("security.passwordExpiryDays", num(e.target.value, S.passwordExpiryDays))} />
      </div>
      <div className={styles.g3}>
        <NumField label="Lock account after" hint="failed attempts" value={S.lockoutAttempts} onChange={(e) => cset("security.lockoutAttempts", num(e.target.value, S.lockoutAttempts))} />
        <div className={styles.field}>
          <label className={styles.lab}>Two-factor authentication</label>
          <ToggleField label="Required for all users" checked={S.require2FA} onChange={(e) => cset("security.require2FA", e.target.checked)} />
        </div>
        <div className={styles.field}>
          <label className={styles.lab}>API keys</label>
          <ToggleField label="Allow integrations" checked={S.allowApiKeys} onChange={(e) => cset("security.allowApiKeys", e.target.checked)} />
        </div>
      </div>
      <div className={styles.g2} style={{ gridTemplateColumns: "1fr" }}>
        <TextField label="IP allowlist" hint="comma separated — blank allows all" value={S.ipAllowlist} onChange={(e) => cset("security.ipAllowlist", e.target.value)} />
      </div>
    </CardShell>
  );
}
