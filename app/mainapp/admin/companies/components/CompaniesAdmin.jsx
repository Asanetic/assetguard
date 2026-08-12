// app/mainapp/admin/companies/components/CompaniesAdmin.jsx
// Companies module — matches the prototype: Import CSV / Template / Register,
// register slide-over (6 purposes), and the 2-step CSV import dialog.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./companies.module.css";

// Purposes + colors, exactly as the prototype (COMPANY_PURPOSE_COLORS).
const PURPOSES = [
  { key: "Response", color: "#F59E0B" },
  { key: "NOC", color: "#2E6CF5" },
  { key: "Client", color: "#10B981" },
  { key: "Installer", color: "#8B5CF6" },
  { key: "Reseller", color: "#EC4899" },
  { key: "Partner", color: "#0EA5E9" },
];
const PURPOSE_COLOR = {
  Response: "#F59E0B", NOC: "#2E6CF5", Client: "#10B981", Installer: "#8B5CF6",
  Reseller: "#EC4899", Partner: "#0EA5E9", "SMPMS vendor": "#DB2777", "Security company": "#0369A1",
};
const KNOWN_PURPOSES = Object.keys(PURPOSE_COLOR);

// Company classification from purposes (agreed rule):
//   Response + NOC => Security company; NOC only => Monitoring company.
function cType(purposes = []) {
  const p = (purposes || []).map((x) => String(x).toLowerCase());
  const noc = p.includes("noc"), resp = p.includes("response");
  if (resp && noc) return "Security company";
  if (noc) return "Monitoring company";
  if (resp) return "Response company";
  if (p.includes("client")) return "Client";
  return "—";
}
function cTypeColor(t) {
  return t === "Security company" ? "#B45309"
    : t === "Monitoring company" ? "#1D4ED8"
    : t === "Response company" ? "#B45309"
    : t === "Client" ? "#047857" : "#64748B";
}

function chipStyle(p) {
  const c = PURPOSE_COLOR[p] || "#64748B";
  return { background: c + "1A", color: c };
}

function purposeChips(list) {
  return (list || []).map((p) => (
    <span key={p} className={styles.chip} style={chipStyle(p)}>{p}</span>
  ));
}

// Minimal CSV parser (handles quoted fields).
function parseCSV(text) {
  const out = [];
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.length);
  for (const line of lines) {
    const cells = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else {
        if (ch === ",") { cells.push(cur); cur = ""; }
        else if (ch === '"') q = true;
        else cur += ch;
      }
    }
    cells.push(cur);
    out.push(cells.map((c) => c.trim()));
  }
  return out;
}

const norm = (s) => String(s || "").trim().toLowerCase();

function parsePurposes(raw) {
  const list = [];
  String(raw || "").split(/[,;|/]+/).forEach((bit) => {
    const t = norm(bit);
    if (!t) return;
    const hit = KNOWN_PURPOSES.find((x) => norm(x) === t);
    if (hit && !list.includes(hit)) list.push(hit);
  });
  return list;
}

export default function CompaniesAdmin() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/mainapp/companies?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) { router.push("/mainapp/login"); return; }
      const data = await res.json();
      setRows(data.companies || []);
    } finally { setLoading(false); }
  }, [q, router]);

  useEffect(() => { load(); }, [load]);
  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2200); }

  function downloadTemplate() {
    const csv = "Company,Purpose,Email,Phone\nAcme Security Ltd,Response;NOC,ops@acme.com,+254712000000\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assetguard-companies-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    flash("Template downloaded");
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.head}>
        <div>
          <div className={styles.title}>Companies</div>
          <div className={styles.sub}>Registered organisations on the platform</div>
        </div>
        <div className={styles.headActions}>
          <button className={styles.tinyBtn} onClick={() => setShowImport(true)}>
            <i className="ti ti-upload" aria-hidden="true" /> Import CSV
          </button>
          <button className={styles.tinyBtn} onClick={downloadTemplate}>
            <i className="ti ti-file-download" aria-hidden="true" /> Template
          </button>
          <button className={styles.registerBtn} onClick={() => setShowRegister(true)}>
            <i className="ti ti-plus" aria-hidden="true" /> Register company
          </button>
        </div>
      </div>

      <div className={styles.search}>
        <i className="ti ti-search" aria-hidden="true" />
        <input className={styles.searchInput} placeholder="Search companies by name, purpose or contact…"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr><th>COMPANY</th><th>PURPOSE</th><th>TYPE</th><th>CONTACT</th><th>SITES</th><th>USERS</th><th>STATUS</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.empty}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className={styles.empty}>No companies match “{q.trim()}”</td></tr>
            ) : rows.map((c) => {
              const status = c.status || "Active";
              return (
                <tr key={c.id}>
                  <td>
                    <div className={styles.cmpCell}>
                      <span className={styles.cmpIcon}><i className="ti ti-building" aria-hidden="true" /></span>
                      <div>
                        <div className={styles.cmpName}>{c.name}</div>
                        <div className={styles.cmpCode}>{c.code}</div>
                      </div>
                    </div>
                  </td>
                  <td><div className={styles.chips}>{purposeChips(c.purposes)}</div></td>
                  <td><span style={{ fontWeight: 700, color: cTypeColor(c.type) }}>{c.type || cType(c.purposes)}</span></td>
                  <td>
                    <div className={styles.contact}>{c.contact_email || "—"}</div>
                    <div className={styles.contactSub}>{c.phone || "—"}</div>
                  </td>
                  <td className={styles.num}>{c.sites}</td>
                  <td className={styles.num}>{c.users}</td>
                  <td>
                    <span className={`${styles.statusPill} ${status === "Active" ? styles.stActive : styles.stOther}`}>{status}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" onClick={() => setEditCompany(c)}
                      style={{ border: "1px solid #E2E8F0", background: "#fff", color: "#2E6CF5", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showRegister && (
        <RegisterPanel
          onClose={() => setShowRegister(false)}
          onSaved={(msg) => { setShowRegister(false); flash(msg); load(); }}
        />
      )}
      {editCompany && (
        <RegisterPanel
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSaved={(msg) => { setEditCompany(null); flash(msg); load(); }}
        />
      )}
      {showImport && (
        <ImportDialog
          existing={rows}
          onClose={() => setShowImport(false)}
          onImported={(msg) => { setShowImport(false); flash(msg); load(); }}
          onTemplate={downloadTemplate}
        />
      )}
    </div>
  );
}

// ---------------- Register company slide-over ----------------
function RegisterPanel({ onClose, onSaved, company }) {
  const isEdit = !!company;
  const [name, setName] = useState(company?.name || "");
  const [chosen, setChosen] = useState(company?.purposes || []);
  const [email, setEmail] = useState(company?.contact_email || "");
  const [phone, setPhone] = useState(company?.phone || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (p) => setChosen((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  async function save() {
    setErr("");
    if (!name.trim()) return setErr("Company name is required");
    if (chosen.length === 0) return setErr("Select at least one purpose");
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/mainapp/companies/${company.id}` : "/api/mainapp/companies", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), purposes: chosen, contactEmail: email.trim(), phone: phone.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setSaving(false); return setErr(d.error || `Could not ${isEdit ? "update" : "register"} company`); }
      onSaved(`${name.trim()} ${isEdit ? "updated" : "registered"}`);
    } catch { setSaving(false); setErr("Network error"); }
  }

  const typeNow = cType(chosen);
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <div className={styles.panelTitle}>{isEdit ? "Edit company" : "Register company"}</div>
          <button className={styles.panelX} onClick={onClose} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <div className={styles.panelBody}>
          <label className={styles.fLab}>COMPANY NAME</label>
          <input className={styles.fIn} placeholder="e.g. Acme Security Ltd" value={name} onChange={(e) => setName(e.target.value)} />

          <label className={styles.fLab}>MAIN PURPOSE (select one or more)</label>
          <div className={styles.purps}>
            {PURPOSES.map((p) => {
              const on = chosen.includes(p.key);
              return (
                <button key={p.key} type="button" className={`${styles.purp} ${on ? styles.purpSel : ""}`}
                  style={{ background: p.color, borderColor: p.color, color: "#fff" }}
                  onClick={() => toggle(p.key)}>
                  {on && <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true" />}{p.key}
                </button>
              );
            })}
          </div>

          {chosen.length > 0 && (
            <div style={{ margin: "2px 0 4px", fontSize: 13 }}>
              This company is a <b style={{ color: cTypeColor(typeNow) }}>{typeNow}</b>
              {typeNow === "Security company" ? " (Response + NOC)" : typeNow === "Monitoring company" ? " (NOC only)" : ""}.
            </div>
          )}

          <label className={styles.fLab}>CONTACT EMAIL</label>
          <input className={styles.fIn} type="email" placeholder="ops@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className={styles.fLab}>PHONE NUMBER</label>
          <input className={styles.fIn} placeholder="+254 …" value={phone} onChange={(e) => setPhone(e.target.value)} />

          {err && <div className={styles.err}>{err}</div>}

          <button className={styles.saveBtn} onClick={save} disabled={saving}>
            {saving ? (isEdit ? "Saving…" : "Registering…") : (isEdit ? "Save changes" : "Register company")}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------- CSV import dialog (2 steps) ----------------
function ImportDialog({ existing, onClose, onImported, onTemplate }) {
  const [step, setStep] = useState("choose"); // choose | verify | done
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]); // {n, name, purposes, email, phone, status, note}
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const existingNames = new Set((existing || []).map((c) => norm(c.name)));

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = () => build(String(reader.result || ""), f.name);
    reader.onerror = () => setErr(`${f.name} could not be read.`);
    reader.readAsText(f);
  }

  function build(text, name) {
    const grid = parseCSV(text);
    if (!grid.length) { setErr("The file is empty."); return; }
    const head = grid[0].map(norm);
    const col = (n) => head.indexOf(norm(n));
    if (col("Company") < 0 && col("Company Name") < 0 && col("Name") < 0) {
      setErr(`Needs a "Company" column. This file has: ${grid[0].join(", ")}`);
      return;
    }
    const get = (r, n) => { const k = col(n); return k < 0 ? "" : String(r[k] || "").trim(); };
    const seen = new Set();
    const out = grid.slice(1).map((r, i) => {
      const nm = get(r, "Company") || get(r, "Company Name") || get(r, "Name");
      const rawPurpose = get(r, "Purpose") || get(r, "Type") || get(r, "Role");
      const purposes = parsePurposes(rawPurpose);
      const email = get(r, "Email");
      const phone = get(r, "Phone");
      let status = "new", note = "";
      if (!nm) { status = "error"; note = "Company name is blank"; }
      else if (seen.has(norm(nm))) { status = "dupe"; note = "repeated in this file"; }
      else if (existingNames.has(norm(nm))) { status = "dupe"; note = "already registered"; }
      else if (!rawPurpose) note = "no purpose given — won't join a register";
      else note = purposes.join(", ") || rawPurpose;
      if (nm) seen.add(norm(nm));
      return { n: i + 2, name: nm, purposes, purposeText: purposes.join(", ") || rawPurpose, email, phone, status, note };
    });
    setFileName(name);
    setPreview(out);
    setStep("verify");
  }

  const counts = {
    new: preview.filter((r) => r.status === "new").length,
    dupe: preview.filter((r) => r.status === "dupe").length,
    error: preview.filter((r) => r.status === "error").length,
  };

  async function confirm() {
    const toImport = preview.filter((r) => r.status === "new")
      .map((r) => ({ name: r.name, purposes: r.purposes, email: r.email, phone: r.phone }));
    if (!toImport.length) { setErr("Nothing new to import."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/mainapp/companies/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: toImport }),
      });
      const d = await res.json();
      if (!res.ok) { setBusy(false); return setErr(d.error || "Import failed"); }
      setResult(d); setStep("done"); setBusy(false);
    } catch { setBusy(false); setErr("Network error"); }
  }

  return (
    <div className={styles.scrim} onClick={() => !busy && onClose()}>
      <div className={styles.dlg} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dlgHead}>
          <div className={styles.dlgHeadLeft}>
            <span className={styles.dlgHeadIcon}><i className="ti ti-file-spreadsheet" aria-hidden="true" /></span>
            <div>
              <div className={styles.dlgTitle}>Import companies</div>
              <div className={styles.dlgSub}>Upload a spreadsheet with all the details</div>
            </div>
          </div>
          <button className={styles.dlgX} onClick={() => !busy && onClose()} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>

        <div className={styles.dlgBody}>
          {step === "choose" && (
            <>
              <div className={styles.drop}>
                <span className={styles.dropIcon}><i className="ti ti-cloud-upload" aria-hidden="true" /></span>
                <div className={styles.dropTitle}>Choose a CSV file to import</div>
                <div className={styles.dropHint}>Supported format: .csv<br />Nothing is saved until you review the rows and confirm.</div>
                <button className={styles.chooseBtn} onClick={() => inputRef.current?.click()}>
                  <i className="ti ti-file-spreadsheet" aria-hidden="true" /> Select spreadsheet
                </button>
                <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={onPick} />
              </div>
              <div className={styles.expect}>
                <div className={styles.expectHead}><i className="ti ti-info-circle" aria-hidden="true" />Expected columns</div>
                <div className={styles.expChips}>
                  {["Company", "Purpose", "Email", "Phone"].map((c) => <span key={c} className={styles.expChip}>{c}</span>)}
                </div>
                <div className={styles.expHint}>Purpose decides which register a company joins: “SMPMS vendor” and “Security company” are picked up automatically.</div>
              </div>
              {err && <div className={styles.dlgErr}>{err}</div>}
            </>
          )}

          {step === "verify" && (
            <>
              <div className={styles.verifyTop}>
                <span className={`${styles.countPill} ${styles.cNew}`}>{counts.new} new</span>
                <span className={`${styles.countPill} ${styles.cSkip}`}>{counts.dupe} skip</span>
                {counts.error > 0 && <span className={`${styles.countPill} ${styles.cErr}`}>{counts.error} error</span>}
                <span className={styles.fileChip}><i className="ti ti-file-spreadsheet" aria-hidden="true" />{fileName}</span>
              </div>
              <div className={styles.vWrap}>
                <table className={styles.vTable}>
                  <thead>
                    <tr><th>#</th><th>Company</th><th>Purpose</th><th>Email</th><th>Phone</th><th>Verdict</th></tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => (
                      <tr key={r.n}>
                        <td>{r.n}</td>
                        <td className={styles.vName}>{r.name || "—"}</td>
                        <td>{r.purposeText || "—"}</td>
                        <td>{r.email || "—"}</td>
                        <td>{r.phone || "—"}</td>
                        <td>
                          <span className={`${styles.tag} ${r.status === "new" ? styles.tNew : r.status === "dupe" ? styles.tSkip : styles.tErr}`}>
                            {r.status === "new" ? "NEW" : r.status === "dupe" ? "SKIP" : "ERROR"}
                          </span>
                          {r.note ? <span className={styles.vNote}> · {r.note}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {err && <div className={styles.dlgErr}>{err}</div>}
            </>
          )}

          {step === "done" && (
            <div className={styles.done}>
              <span className={styles.doneIcon}><i className="ti ti-check" aria-hidden="true" /></span>
              <div className={styles.doneTitle}>{result?.imported || 0} companies imported</div>
              <div className={styles.doneSub}>
                {result?.skipped ? `${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped (already registered or blank).` : "All new companies were added."}
              </div>
            </div>
          )}
        </div>

        <div className={styles.dlgFoot}>
          {step === "choose" && (
            <>
              <button className={styles.ghostBtn} onClick={onTemplate}><i className="ti ti-file-download" aria-hidden="true" /> Download template</button>
              <span className={styles.stepTxt}>Step 1 of 2</span>
            </>
          )}
          {step === "verify" && (
            <>
              <button className={styles.ghostBtn} onClick={() => { setStep("choose"); setErr(""); }}>Back</button>
              <button className={styles.solidBtn} onClick={confirm} disabled={busy || counts.new === 0}>
                <i className="ti ti-check" aria-hidden="true" /> {busy ? "Importing…" : `Import ${counts.new} compan${counts.new === 1 ? "y" : "ies"}`}
              </button>
            </>
          )}
          {step === "done" && (
            <>
              <span />
              <button className={styles.solidBtn} onClick={() => onImported(`${result?.imported || 0} companies imported`)}>Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
