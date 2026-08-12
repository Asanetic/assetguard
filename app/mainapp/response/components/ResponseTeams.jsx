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

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./response.module.css";
import { SEED_TEAMS } from "./teamsData.js";

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
  const [teams, setTeams] = useState(() => SEED_TEAMS.map((t) => ({ ...t })));
  // grants: { [cluster]: [teamCode, ...] } — a team allowed to respond outside its clusters.
  const [grants, setGrants] = useState({});

  // registration / edit form
  const emptyForm = { code: "", sec: "", veh: "", phones: "", emails: "", company: "", clusters: [], members: [] };
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
      veh: t.vehicle || "",
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
    // Persist the assigned responders (team membership). Drives the responder
    // marker + the alarm response log; unassigned responders show their own name.
    const memberIds = form.members || [];
    fetch(`/api/mainapp/response/teams/${encodeURIComponent(code)}/members`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: code, userIds: memberIds }),
    }).catch(() => {});
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
          <div className={styles.field}>
            <label className={styles.lab}>VEHICLE REG.</label>
            <input className={styles.in} placeholder="KDA 123B"
              value={form.veh} onChange={(e) => set("veh", e.target.value)} />
          </div>
        </div>

        <div className={styles.clWrap}>
          <label className={styles.lab}>ASSIGN TO CLUSTERS — one or more</label>
          <ClusterPicker selected={form.clusters} onToggle={toggleCluster} clusters={clusterNames} />
        </div>

        <div className={styles.clWrap}>
          <label className={styles.lab}>ASSIGN FIELD-RESPONSE USERS — their responder marker shows this team</label>
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
