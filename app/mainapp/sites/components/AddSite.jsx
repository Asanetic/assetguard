// app/mainapp/sites/components/AddSite.jsx
// Full "Add site" form — the enhanced contact-hierarchy layout:
//   Location (country/county/distribution + security region + response cluster)
//   Company        — national, one manager + two assistant managers
//   Security company — country tier + regional tier + NOC & response teams
//   NOC            — monitoring company + its NOC teams
//   Alert recipients
// Pick a security region and cluster; everything below auto-fills and stays
// editable. Saves the full structure to /api/mainapp/sites (details JSONB).
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./addsite.module.css";
import {
  COUNTIES, DIST_REGIONS, SEC_REGIONS, CLUSTERS, VENDORS, COMPANY,
  resolveSiteContacts, responseTeamsFor,
} from "./addSiteData.js";

// --- small helpers -----------------------------------------------------------
const joinC = (a) => (a || []).join(", ");
const splitC = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const validPhone = (p) => /^[+0-9][0-9\s()-]{6,}$/.test(p);
const person = (p) => ({ name: p.name, phones: splitC(p.phones), emails: splitC(p.emails) });
const toStr = (p) => (p ? { name: p.name, phones: joinC(p.phones), emails: joinC(p.emails) } : { name: "", phones: "", emails: "" });
const emptyTeam = () => ({ name: "", vehicle: "", phones: "", emails: "", on: true });
const teamFrom = (t) => ({ name: t.code || "", vehicle: t.vehicle || "", phones: joinC(t.phones), emails: joinC(t.emails), on: true });
const listOrEmpty = (arr) => (arr && arr.length ? arr.map(teamFrom) : [emptyTeam()]);

// Comma-separated contact input with a live chip preview.
function ContactField({ value, onChange, kind }) {
  const parts = splitC(value);
  const ok = (x) => (kind === "email" ? validEmail(x) : validPhone(x));
  return (
    <div>
      <input
        className={`${styles.in} ${styles.inAuto}`}
        data-cf={kind}
        placeholder={kind === "email" ? "name@co.ke, second@co.ke" : "+254 7.., +254 7.."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {parts.length > 0 && (
        <div className={styles.chips}>
          {parts.map((x, i) => {
            const bad = !ok(x);
            return (
              <span key={i} className={`${styles.chip} ${bad ? styles.chipBad : ""}`}>
                {bad && <i className="ti ti-alert-circle" aria-hidden="true" />}{x}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// A person row: name (auto) + Phone(s) + Email(s).
function PersonRow({ label, value, onChange, hint = "(auto)" }) {
  return (
    <div className={styles.g3}>
      <div>
        <label className={styles.lab}>{label} <span className={styles.op}>{hint}</span></label>
        <input className={`${styles.in} ${styles.inAuto}`} value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div>
        <label className={styles.lab}>Phone(s) <span className={styles.op}>comma separated</span></label>
        <ContactField kind="phone" value={value.phones} onChange={(v) => onChange({ ...value, phones: v })} />
      </div>
      <div>
        <label className={styles.lab}>Email(s) <span className={styles.op}>comma separated</span></label>
        <ContactField kind="email" value={value.emails} onChange={(v) => onChange({ ...value, emails: v })} />
      </div>
    </div>
  );
}

// A list of team cards with include checkbox, delete and "Add another team".
function TeamList({ rows, setRows, icon, tint, ink, hasVehicle }) {
  const update = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const del = (i) => { const next = rows.filter((_, idx) => idx !== i); setRows(next.length ? next : [emptyTeam()]); };
  const add = () => setRows([...rows, emptyTeam()]);
  return (
    <>
      {rows.map((t, i) => (
        <div key={i} className={`${styles.teamCard} ${t.on ? "" : styles.teamCardOff}`}>
          <div className={`${styles.teamHead} ${t.on ? styles.teamHeadOn : ""}`}>
            <input type="checkbox" className={styles.teamChk} checked={t.on}
              onChange={(e) => update(i, { on: e.target.checked })} />
            <span className={styles.teamIcon} style={{ background: tint, color: ink }}>
              <i className={`ti ${icon}`} aria-hidden="true" />
            </span>
            <b className={styles.teamName}>{t.name || "New team"}</b>
            <button className={styles.teamDel} onClick={() => del(i)} aria-label="Remove team">
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          </div>
          {t.on && (
            <>
              <div className={hasVehicle ? styles.g2 : ""} style={hasVehicle ? undefined : { marginBottom: 10 }}>
                <div>
                  <label className={styles.lab}>Team name <span className={styles.op}>(auto)</span></label>
                  <input className={`${styles.in} ${styles.inAuto}`} value={t.name}
                    onChange={(e) => update(i, { name: e.target.value })} />
                </div>
                {hasVehicle && (
                  <div>
                    <label className={styles.lab}>Vehicle <span className={styles.op}>(auto)</span></label>
                    <input className={`${styles.in} ${styles.inAuto}`} value={t.vehicle}
                      onChange={(e) => update(i, { vehicle: e.target.value })} />
                  </div>
                )}
              </div>
              <div className={styles.g2} style={{ marginBottom: 0 }}>
                <div>
                  <label className={styles.lab}>Phone(s) <span className={styles.op}>comma separated</span></label>
                  <ContactField kind="phone" value={t.phones} onChange={(v) => update(i, { phones: v })} />
                </div>
                <div>
                  <label className={styles.lab}>Email(s) <span className={styles.op}>comma separated</span></label>
                  <ContactField kind="email" value={t.emails} onChange={(v) => update(i, { emails: v })} />
                </div>
              </div>
            </>
          )}
        </div>
      ))}
      <button className={styles.addTeam} onClick={add}>
        <i className="ti ti-plus" aria-hidden="true" /> Add another team
      </button>
    </>
  );
}

const REQUIRED = ["id", "name", "county", "distRegion", "securityRegion", "responseCluster", "coords", "sms"];

export default function AddSite() {
  const router = useRouter();

  const [f, setF] = useState({
    id: "", name: "", smpms: "", county: "", distRegion: "",
    securityRegion: "", responseCluster: "", coords: "", sms: "", emails: "",
  });
  // National company block (prefilled, editable).
  const [comp, setComp] = useState({
    name: COMPANY.name,
    mgr: toStr(COMPANY.manager),
    a1: toStr(COMPANY.assistant1),
    a2: toStr(COMPANY.assistant2),
  });
  // Security company block (auto-filled by the cascade).
  const [sec, setSec] = useState({
    company: "", ops: toStr(null), opsAsst: toStr(null), field: toStr(null), fieldAsst: toStr(null),
  });
  const [monitoringCompany, setMonitoringCompany] = useState("");
  const [secNoc, setSecNoc] = useState([emptyTeam()]);
  const [response, setResponse] = useState([emptyTeam()]);
  const [mnc, setMnc] = useState([emptyTeam()]);

  const [invalid, setInvalid] = useState(new Set());
  const [showMsg, setShowMsg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [pin, setPin] = useState({ left: "50%", top: "52%" });
  const [toast, setToast] = useState(false);
  const [locating, setLocating] = useState(false);
  const refs = useRef({});

  function set(k, v) { setF((s) => ({ ...s, [k]: v })); }

  // Cascade A — security region drives security staff, its NOC teams, and the
  // monitoring company + its NOC teams.
  useEffect(() => {
    const r = resolveSiteContacts(f.securityRegion, f.responseCluster);
    setSec({
      company: r.secco ? r.secco.company : "",
      ops: toStr(r.secco && r.secco.country ? r.secco.country.opsMgr : null),
      opsAsst: toStr(r.secco && r.secco.country ? r.secco.country.opsAsst : null),
      field: toStr(r.secco && r.secco.region ? r.secco.region.fieldMgr : null),
      fieldAsst: toStr(r.secco && r.secco.region ? r.secco.region.fieldAsst : null),
    });
    setSecNoc(listOrEmpty(r.secNocTeams));
    setMonitoringCompany(r.monco ? r.monco.name : "");
    setMnc(listOrEmpty(r.mncTeams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.securityRegion]);

  // Cascade B — response cluster (falls back to region) drives response teams.
  useEffect(() => {
    setResponse(listOrEmpty(responseTeamsFor(f.responseCluster, f.securityRegion)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.responseCluster, f.securityRegion]);

  // --- map pin + geolocation ---
  function moveMap() {
    setPin({ left: (30 + Math.random() * 40).toFixed(1) + "%", top: (28 + Math.random() * 44).toFixed(1) + "%" });
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  }
  function onCoords(v) { set("coords", v); if (v.indexOf(",") > -1) moveMap(); }
  function useMyLocation() {
    setLocating(true);
    const finish = (lat, lng) => { setF((s) => ({ ...s, coords: `${lat}, ${lng}` })); moveMap(); setLocating(false); };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(pos.coords.latitude.toFixed(4), pos.coords.longitude.toFixed(4)),
        () => finish("-1.2921", "36.8219"),
        { timeout: 6000 }
      );
    } else setTimeout(() => finish("-1.2921", "36.8219"), 700);
  }
  function openLiveMaps() {
    const parts = splitC(f.coords);
    const q = parts.length === 2 ? `${parts[0]},${parts[1]}` : "Kenya";
    window.open(`https://www.google.com/maps?q=${encodeURIComponent(q)}`, "_blank", "noopener");
  }

  function parseCoords(s) {
    const p = String(s || "").split(",");
    if (p.length !== 2) return { lat: null, lng: null };
    const lat = Number(p[0].trim()), lng = Number(p[1].trim());
    return { lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null };
  }
  const teamsOut = (list, veh) => list
    .filter((t) => t.on && (t.name || t.phones || t.emails))
    .map((t) => ({ name: t.name, ...(veh ? { vehicle: t.vehicle } : {}), phones: splitC(t.phones), emails: splitC(t.emails) }));

  async function save() {
    setErr("");
    const bad = new Set(REQUIRED.filter((k) => !String(f[k]).trim()));
    setInvalid(bad);
    if (bad.size) {
      setShowMsg(true);
      const firstKey = REQUIRED.find((k) => bad.has(k));
      const node = refs.current[firstKey];
      if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setShowMsg(false);
    setSaving(true);

    const { lat, lng } = parseCoords(f.coords);
    const details = {
      country: "Kenya", county: f.county, distRegion: f.distRegion,
      securityRegion: f.securityRegion, responseCluster: f.responseCluster,
      coordinates: f.coords,
      company: {
        name: comp.name, coverage: "National — all regions",
        manager: person(comp.mgr), assistant1: person(comp.a1), assistant2: person(comp.a2),
      },
      securityCompany: {
        company: sec.company,
        country: { operationsManager: person(sec.ops), assistant: person(sec.opsAsst) },
        region: { fieldOperationsManager: person(sec.field), assistant: person(sec.fieldAsst) },
        nocTeams: teamsOut(secNoc), responseTeams: teamsOut(response, true),
      },
      noc: { monitoringCompany, nocTeams: teamsOut(mnc) },
      alerts: { sms: splitC(f.sms), emails: splitC(f.emails) },
    };

    try {
      const res = await fetch("/api/mainapp/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: f.id, name: f.name, smpms_vendor: f.smpms,
          country: "Kenya", county: f.county, dist_region: f.distRegion,
          security_region: f.securityRegion, response_cluster: f.responseCluster,
          lat, lng, coordinates: f.coords, status: "Pending", details,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Could not save site"); setSaving(false); return; }
      setSaved(true); setSaving(false);
      setTimeout(() => router.push("/mainapp/sites"), 1400);
    } catch {
      setErr("Network error"); setSaving(false);
    }
  }

  const reg = (k) => ({
    ref: (n) => { refs.current[k] = n; },
    className: `${styles.in} ${invalid.has(k) ? styles.invalid : ""}`,
  });

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Add site</div>
          <div className={styles.sub}>Register a new location — scroll down to complete all sections</div>
        </div>
      </div>

      {/* decorative location map */}
      <div className={styles.map}>
        <svg className={styles.mapSvg} viewBox="0 0 900 170" preserveAspectRatio="none" aria-hidden="true">
          <path d="M780 0 L900 0 L900 170 L700 170 C740 130 760 90 748 55 C744 35 760 18 780 0 Z" fill="#CFE3F5" />
          <path d="M0 60 C200 48 420 74 690 60" stroke="#FFFFFF" strokeWidth="4" fill="none" />
          <path d="M150 0 C190 60 230 120 210 170" stroke="#F1E9D2" strokeWidth="3" fill="none" />
        </svg>
        <div className={styles.pin} style={{ left: pin.left, top: pin.top }}>
          <i className="ti ti-map-pin" aria-hidden="true" />
        </div>
        {toast && <div className={styles.toast}>Location updated</div>}
        <button type="button" className={styles.liveBtn} onClick={openLiveMaps}>
          <i className="ti ti-map-2" aria-hidden="true" />Live maps
        </button>
        <div className={styles.mapNote}>Exact site location — updates when coordinates change</div>
      </div>

      {/* 1) Site details */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.schip} style={{ background: "#DBE7FE", color: "#2E6CF5" }}>
            <i className="ti ti-map-pin" aria-hidden="true" />
          </span>Site details
        </div>
        <div className={styles.g3} style={{ marginBottom: 0 }}>
          <div>
            <label className={styles.lab}>Site ID <span className={styles.rq}>*</span></label>
            <input {...reg("id")} placeholder="010" value={f.id} onChange={(e) => set("id", e.target.value)} />
          </div>
          <div>
            <label className={styles.lab}>Site name <span className={styles.rq}>*</span></label>
            <input {...reg("name")} placeholder="Naivasha Depot" value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className={styles.lab}>SMPMS vendor</label>
            <select className={styles.in} value={f.smpms} onChange={(e) => set("smpms", e.target.value)}>
              <option value="">Select vendor</option>
              {VENDORS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 2) Location details */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.schip} style={{ background: "#D1FAE5", color: "#059669" }}>
            <i className="ti ti-world" aria-hidden="true" />
          </span>Location details <span className={styles.secHint}>all fields mandatory</span>
        </div>
        <div className={styles.g3}>
          <div>
            <label className={styles.lab}>Country <span className={styles.op}>(global setting)</span></label>
            <input className={`${styles.in} ${styles.inLock}`} value="Kenya" readOnly />
          </div>
          <div>
            <label className={styles.lab}>County <span className={styles.rq}>*</span></label>
            <select {...reg("county")} value={f.county} onChange={(e) => set("county", e.target.value)}>
              <option value="">Select county</option>
              {COUNTIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={styles.lab}>Distribution region <span className={styles.rq}>*</span> <span className={styles.op}>(client split)</span></label>
            <select {...reg("distRegion")} value={f.distRegion} onChange={(e) => set("distRegion", e.target.value)}>
              <option value="">Select distribution region</option>
              {DIST_REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.g2}>
          <div>
            <label className={styles.lab}>Security region <span className={styles.rq}>*</span> <span className={styles.op}>(regional managers &amp; heads)</span></label>
            <select {...reg("securityRegion")} value={f.securityRegion} onChange={(e) => set("securityRegion", e.target.value)}>
              <option value="">Select security region</option>
              {SEC_REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={styles.lab}>Response cluster <span className={styles.rq}>*</span> <span className={styles.op}>(team that responds here)</span></label>
            <select {...reg("responseCluster")} value={f.responseCluster} onChange={(e) => set("responseCluster", e.target.value)}>
              <option value="">Select response cluster</option>
              {CLUSTERS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.g2} style={{ marginBottom: 4 }}>
          <div>
            <label className={styles.lab}>Coordinates <span className={styles.rq}>*</span> <span className={styles.op}>(latitude, longitude)</span></label>
            <input {...reg("coords")} placeholder="-1.2921, 36.8219" value={f.coords} onChange={(e) => onCoords(e.target.value)} />
          </div>
          <div>
            <label className={styles.lab}>&nbsp;</label>
            <button type="button" className={styles.locBtn} onClick={useMyLocation} disabled={locating}>
              <i className="ti ti-current-location" aria-hidden="true" />
              {locating ? "Locating…" : "Use my location"}
            </button>
          </div>
        </div>
        <div className={styles.banner}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          Stand at the centre of the site, outdoors, before picking your location — the map above will update.
        </div>
      </div>

      {/* 3) Company (national) */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.schip} style={{ background: "#EDE9FE", color: "#7C3AED" }}>
            <i className="ti ti-building" aria-hidden="true" />
          </span>Company <span className={styles.secHint}>national — same for every site</span>
        </div>
        <div className={styles.g2}>
          <div>
            <label className={styles.lab}>Company <span className={styles.op}>(auto)</span></label>
            <input className={`${styles.in} ${styles.inAuto}`} value={comp.name}
              onChange={(e) => setComp((c) => ({ ...c, name: e.target.value }))} />
          </div>
          <div>
            <label className={styles.lab}>Coverage</label>
            <input className={`${styles.in} ${styles.inLock}`} value="National — all regions" readOnly />
          </div>
        </div>
        <PersonRow label="Manager" value={comp.mgr} onChange={(v) => setComp((c) => ({ ...c, mgr: v }))} />
        <PersonRow label="Assistant manager 1" value={comp.a1} onChange={(v) => setComp((c) => ({ ...c, a1: v }))} />
        <PersonRow label="Assistant manager 2" value={comp.a2} onChange={(v) => setComp((c) => ({ ...c, a2: v }))} />
      </div>

      {/* 4) Security company details */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.schip} style={{ background: "#FEE2E2", color: "#DC2626" }}>
            <i className="ti ti-shield" aria-hidden="true" />
          </span>Security company details <span className={styles.secHint}>contacts auto-filled from company records</span>
        </div>
        <div className={styles.g2}>
          <div>
            <label className={styles.lab}>Security company <span className={styles.op}>(auto)</span></label>
            <input className={`${styles.in} ${styles.inAuto}`} value={sec.company}
              onChange={(e) => setSec((s) => ({ ...s, company: e.target.value }))} />
          </div>
          <div />
        </div>

        <div className={styles.subHead}><b>Country</b><span>national — covers every site</span></div>
        <PersonRow label="Operations manager" value={sec.ops} onChange={(v) => setSec((s) => ({ ...s, ops: v }))} />
        <PersonRow label="Assistant" value={sec.opsAsst} onChange={(v) => setSec((s) => ({ ...s, opsAsst: v }))} />

        <div className={styles.subHead}><b>Region</b><span>follows the site’s security region</span></div>
        <PersonRow label="Field operations manager" value={sec.field} onChange={(v) => setSec((s) => ({ ...s, field: v }))} />
        <PersonRow label="Assistant" value={sec.fieldAsst} onChange={(v) => setSec((s) => ({ ...s, fieldAsst: v }))} />

        <div className={styles.subHead}><b>Security company teams</b><span>NOC teams follow the security region — response teams follow the cluster</span></div>
        <div className={styles.groupLabel}>NOC TEAMS</div>
        <TeamList rows={secNoc} setRows={setSecNoc} icon="ti-headset" tint="#E0F2FE" ink="#0284C7" hasVehicle={false} />
        <div className={styles.groupLabel}>RESPONSE TEAMS</div>
        <TeamList rows={response} setRows={setResponse} icon="ti-car" tint="#DBE7FE" ink="#2E6CF5" hasVehicle />
      </div>

      {/* 5) NOC details */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.schip} style={{ background: "#E0F2FE", color: "#0284C7" }}>
            <i className="ti ti-headset" aria-hidden="true" />
          </span>NOC details <span className={styles.secHint}>contacts auto-filled from NOC records</span>
        </div>
        <div className={styles.secHint} style={{ margin: "-4px 0 10px" }}>monitoring company follows the security region</div>
        <div className={styles.g2}>
          <div>
            <label className={styles.lab}>Monitoring company <span className={styles.op}>(auto)</span></label>
            <input className={`${styles.in} ${styles.inAuto}`} value={monitoringCompany}
              onChange={(e) => setMonitoringCompany(e.target.value)} />
          </div>
          <div />
        </div>
        <div className={styles.groupLabel}>NOC TEAMS</div>
        <TeamList rows={mnc} setRows={setMnc} icon="ti-headset" tint="#E0F2FE" ink="#0284C7" hasVehicle={false} />
      </div>

      {/* 6) Additional alert recipients */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.schip} style={{ background: "#FEF3C7", color: "#B45309" }}>
            <i className="ti ti-message" aria-hidden="true" />
          </span>Additional alert recipients <span className={styles.secHint}>typed manually</span>
        </div>
        <div style={{ marginBottom: 11 }}>
          <label className={styles.lab}>More phone numbers for SMS alerts <span className={styles.rq}>*</span> <span className={styles.op}>(separate with commas)</span></label>
          <input {...reg("sms")} placeholder="+254 712 000 111, +254 733 222 333" value={f.sms} onChange={(e) => set("sms", e.target.value)} />
        </div>
        <div>
          <label className={styles.lab}>More alert emails <span className={styles.op}>(optional, separate with commas)</span></label>
          <input className={styles.in} placeholder="ops@company.com, security@company.com" value={f.emails} onChange={(e) => set("emails", e.target.value)} />
        </div>
      </div>

      {(showMsg || err) && <div className={styles.msg}>{err || "Fill in all required fields"}</div>}

      <div className={styles.actions}>
        <button type="button" className={`${styles.save} ${saved ? styles.saveOk : ""}`} onClick={save} disabled={saving || saved}>
          {saved ? "Site saved — status: Pending" : saving ? "Saving…" : "Save site"}
        </button>
        <button type="button" className={styles.cancel} onClick={() => router.push("/mainapp/sites")} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
