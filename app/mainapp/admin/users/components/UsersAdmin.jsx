// app/mainapp/admin/users/components/UsersAdmin.jsx
// Users & Roles — matches the AssetGuard prototype. Wired to the real API.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./users.module.css";

// Security regions (from the prototype) + the country-wide option.
const SCOPE_REGIONS = [
  "Nairobi North", "Nairobi South", "Coast", "Rift Valley",
  "Western", "Upper Eastern", "North Eastern",
];
const REGIONS = ["Country-wide", ...SCOPE_REGIONS];

function initials(name) {
  return String(name || "")
    .split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function ago(ts) {
  if (!ts) return "—";
  const d = new Date(ts).getTime();
  if (!d) return "—";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

const STATUS_CLASS = {
  Active: styles.stActive,
  Suspended: styles.stSuspended,
  Pending: styles.stPending,
  Rejected: styles.stRejected,
};

export default function UsersAdmin() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [tab, setTab] = useState("users"); // users | pending | requests
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', user?}
  const [confirmDel, setConfirmDel] = useState(null); // user pending delete
  const [deleting, setDeleting] = useState(false);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ru, rr] = await Promise.all([
        fetch("/api/mainapp/users").then((r) => (r.ok ? r.json() : { users: [] })),
        fetch("/api/mainapp/roles").then((r) => (r.ok ? r.json() : { roles: [] })),
      ]);
      setUsers(ru.users || []);
      setRoles(rr.roles || []);
    } catch {
      setUsers([]); setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReqs = useCallback(() => {
    fetch("/api/mainapp/access-requests")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setReqs(d.requests || []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); loadReqs(); }, [load, loadReqs]);
  useEffect(() => {
    fetch("/api/mainapp/companies")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCompanies(d.companies || []))
      .catch(() => {});
  }, []);

  const newReqCount = reqs.filter((r) => r.status === "New").length;

  async function reqPatch(id, action, okMsg) {
    try {
      const res = await fetch(`/api/mainapp/access-requests/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) { if (okMsg) flash(okMsg); loadReqs(); }
    } catch { flash("Network error"); }
  }

  const roleCount = useMemo(() => {
    const m = {}; users.forEach((u) => { if (u.role) m[u.role] = (m[u.role] || 0) + 1; }); return m;
  }, [users]);

  const pendingCount = users.filter((u) => u.status === "Pending").length;

  const visible = useMemo(() => {
    let list = users;
    if (tab === "pending") list = list.filter((u) => u.status === "Pending");
    else if (tab === "users") list = list.filter((u) => u.status !== "Pending");
    else list = [];
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((u) =>
        [u.name, u.email, u.phone, u.company].some((v) => String(v || "").toLowerCase().includes(s)));
    }
    return list;
  }, [users, tab, roleFilter, q]);

  async function patch(id, body, okMsg) {
    try {
      const res = await fetch(`/api/mainapp/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) return flash(d.error || "Action failed");
      if (okMsg) flash(okMsg);
      load();
    } catch { flash("Network error"); }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/mainapp/users/${confirmDel.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setDeleting(false); return flash(d.error || "Delete failed"); }
      setConfirmDel(null);
      flash("User deleted");
      load();
    } catch { flash("Network error"); }
    finally { setDeleting(false); }
  }

  const regionOf = (u) => (u.regions && u.regions.length ? u.regions[0] : "Country-wide");

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Users and roles</div>
          <div className={styles.sub}>Manage who has access and what they can do</div>
        </div>
        <span className={styles.total}>{users.length} users total</span>
      </div>

      <div className={styles.cards}>
        {roles.map((r) => (
          <button
            key={r.key}
            className={`${styles.chip} ${roleFilter === r.key ? styles.chipActive : ""}`}
            onClick={() => setRoleFilter((v) => (v === r.key ? "" : r.key))}
            title={r.description || r.name}
          >
            <span className={styles.chipIcon} style={{ background: r.bg, color: r.fg }}>
              <i className={`ti ${r.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
            </span>
            <span className={styles.chipText}>
              <span className={styles.chipName}>{r.name}</span>
              <span className={styles.chipCount}>
                {(roleCount[r.key] || 0)} {(roleCount[r.key] || 0) === 1 ? "user" : "users"}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.search}>
          <i className="ti ti-search" aria-hidden="true" />
          <input
            className={styles.searchInput}
            placeholder="Search users by name, email or company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className={styles.roleFilter} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </div>

      <div className={styles.tabsRow}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "users" ? styles.tabActive : ""}`} onClick={() => setTab("users")}>
            <span className={styles.tabIcon} style={{ background: "#DBE7FE", color: "#1E56DB" }}>
              <i className="ti ti-users" style={{ fontSize: 13 }} aria-hidden="true" />
            </span>
            Users
          </button>
          <button className={`${styles.tab} ${tab === "pending" ? styles.tabActive : ""}`} onClick={() => setTab("pending")}>
            <span className={styles.tabIcon} style={{ background: "#FEF3C7", color: "#B45309" }}>
              <i className="ti ti-user-check" style={{ fontSize: 13 }} aria-hidden="true" />
            </span>
            Pending approvals
            <span className={pendingCount ? styles.tabBadge : styles.tabBadgeMuted}>{pendingCount}</span>
          </button>
          <button className={`${styles.tab} ${tab === "requests" ? styles.tabActive : ""}`} onClick={() => setTab("requests")}>
            <span className={styles.tabIcon} style={{ background: "#EDE9FE", color: "#6D28D9" }}>
              <i className="ti ti-mail-forward" style={{ fontSize: 13 }} aria-hidden="true" />
            </span>
            Access requests
            <span className={newReqCount ? styles.tabBadge : styles.tabBadgeMuted}>{newReqCount}</span>
          </button>
        </div>
        <button className={styles.createBtn} onClick={() => setModal({ mode: "create" })}>
          <i className="ti ti-user-plus" style={{ fontSize: 16 }} aria-hidden="true" />
          Create user
        </button>
      </div>

      {tab === "requests" ? (
        <div>
          {reqs.length === 0 ? (
            <div className={styles.tableWrap}><div className={styles.empty}>No access requests.</div></div>
          ) : (
            reqs
              .filter((r) => {
                if (!q.trim()) return true;
                const s = q.trim().toLowerCase();
                return [r.name, r.email, r.company, r.problem].some((v) => String(v || "").toLowerCase().includes(s));
              })
              .map((r) => (
                <RequestCard
                  key={r.id}
                  req={r}
                  onDecline={() => reqPatch(r.id, "decline", "Request declined")}
                  onCreate={() => setModal({
                    mode: "create",
                    fromRequest: r.id,
                    prefill: { name: r.name, email: r.email, phone: r.phone },
                  })}
                />
              ))
          )}
        </div>
      ) : tab === "pending" ? (
        <div>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.tableWrap}><div className={styles.empty}>No registrations awaiting approval.</div></div>
          ) : (
            visible.map((u) => (
              <PendingCard
                key={u.id}
                user={u}
                onApprove={() => setModal({ mode: "approve", user: u })}
                onDecline={() => patch(u.id, { action: "reject" }, "Registration declined")}
              />
            ))
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Company</th>
                <th>Role</th>
                {tab === "users" && <th>Region scope</th>}
                <th>Status</th>
                <th>Last active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className={styles.empty}>Loading…</div></td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7}><div className={styles.empty}>No users here.</div></td></tr>
              ) : (
                visible.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.avatar}>{initials(u.name)}</span>
                        <div>
                          <div className={styles.uName}>{u.name}</div>
                          <div className={styles.uEmail}>{u.email || u.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.company}>{u.company || "—"}</td>
                    <td>
                      {tab === "pending" ? (
                        <select
                          className={styles.roleSelect}
                          defaultValue=""
                          onChange={(e) => e.target.value && patch(u.id, { action: "approve", role: e.target.value }, "User approved")}
                        >
                          <option value="" disabled>Assign role…</option>
                          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                        </select>
                      ) : (
                        <select
                          className={styles.roleSelect}
                          value={u.role || ""}
                          onChange={(e) => patch(u.id, { action: "setRole", role: e.target.value }, "Role updated")}
                        >
                          {!u.role && <option value="">—</option>}
                          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                        </select>
                      )}
                    </td>
                    {tab === "users" && (
                      <td>
                        <div className={styles.regionWrap}>
                          <i className="ti ti-world" aria-hidden="true" />
                          <select
                            className={styles.regionSelect}
                            value={regionOf(u)}
                            onChange={(e) => patch(u.id, {
                              action: "setRegions",
                              regions: e.target.value === "Country-wide" ? [] : [e.target.value],
                            }, "Region updated")}
                          >
                            {REGIONS.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
                          </select>
                        </div>
                      </td>
                    )}
                    <td>
                      <span className={`${styles.statusPill} ${STATUS_CLASS[u.status] || ""}`}>
                        <span className={styles.dot} />{u.status}
                      </span>
                    </td>
                    <td className={styles.lastActive}>{ago(u.last_active)}</td>
                    <td>
                      <div className={styles.actions}>
                        {tab === "pending" ? (
                          <button className={`${styles.actBtn} ${styles.rejectBtn}`} onClick={() => patch(u.id, { action: "reject" }, "Registration rejected")}>
                            <i className="ti ti-x" style={{ fontSize: 14 }} /> Reject
                          </button>
                        ) : (
                          <>
                            <button className={`${styles.actBtn} ${styles.editBtn}`} onClick={() => setModal({ mode: "edit", user: u })}>
                              <i className="ti ti-pencil" style={{ fontSize: 14 }} /> Edit
                            </button>
                            {u.status === "Suspended" ? (
                              <button className={`${styles.actBtn} ${styles.reactivateBtn}`} onClick={() => patch(u.id, { action: "activate" }, "User reactivated")}>
                                Reactivate
                              </button>
                            ) : (
                              <button className={`${styles.actBtn} ${styles.suspendBtn}`} onClick={() => patch(u.id, { action: "suspend" }, "User suspended")}>
                                Suspend
                              </button>
                            )}
                            <button className={`${styles.actBtn} ${styles.deleteBtn}`} onClick={() => setConfirmDel(u)}>
                              <i className="ti ti-trash" style={{ fontSize: 14 }} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (() => {
        const afterSave = (msg) => {
          const fr = modal.fromRequest;
          setModal(null); flash(msg); load();
          if (fr) reqPatch(fr, "handle");
        };
        if (modal.mode === "approve")
          return <ApproveModal user={modal.user} roles={roles} companies={companies}
            onClose={() => setModal(null)} onSaved={afterSave} />;
        if (modal.mode === "create")
          return <CreateUserModal prefill={modal.prefill || {}} roles={roles} companies={companies}
            onClose={() => setModal(null)} onSaved={afterSave} />;
        return <UserModal modal={modal} roles={roles} companies={companies} regions={REGIONS}
          onClose={() => setModal(null)} onSaved={afterSave} />;
      })()}

      {confirmDel && (
        <div className={styles.scrim} onClick={() => !deleting && setConfirmDel(null)}>
          <div className={styles.modal} style={{ maxWidth: 400, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <span className={styles.delIcon}>
              <i className="ti ti-trash" style={{ fontSize: 24 }} aria-hidden="true" />
            </span>
            <div className={styles.modalTitle}>Delete user?</div>
            <div className={styles.modalSub}>
              This permanently removes <b>{confirmDel.name}</b>{confirmDel.email ? ` (${confirmDel.email})` : ""}. This can&apos;t be undone.
            </div>
            <div className={styles.modalActions} style={{ justifyContent: "center" }}>
              <button className={styles.btnGhost} onClick={() => setConfirmDel(null)} disabled={deleting}>Cancel</button>
              <button className={styles.delConfirmBtn} onClick={doDelete} disabled={deleting}>
                <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
                {deleting ? "Deleting…" : "Delete user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ---------------- Pending approval card ---------------- */
function PendingCard({ user, onApprove, onDecline }) {
  const [showNote, setShowNote] = useState(false);
  const contact = [user.email, user.phone, user.company].filter(Boolean).join(" · ");
  return (
    <div className={styles.pcard}>
      <div className={styles.pTop}>
        <span className={styles.pAvatar}>
          <i className="ti ti-user-question" style={{ fontSize: 19 }} aria-hidden="true" />
        </span>
        <div className={styles.pMid}>
          <div className={styles.pNameRow}>
            <span className={styles.pName}>{user.name}</span>
            <span className={styles.pChip}>
              <i className="ti ti-user-question" style={{ fontSize: 12 }} aria-hidden="true" />
              Role and scope not yet set
            </span>
          </div>
          <div className={styles.pContact}>{contact}</div>
          <div className={styles.pMeta}>
            <i className="ti ti-clock-hour-4" style={{ fontSize: 12, verticalAlign: -1 }} aria-hidden="true" />{" "}
            {ago(user.created_at)} · you assign the role and region scope on approval
          </div>
          <div className={styles.pwBlock}>
            <label className={styles.pwLabel}>PASSWORD THEY SET AT REGISTRATION</label>
            <div className={styles.pwField}>
              <span className={styles.pwDots}>••••••••••</span>
              <button
                type="button"
                className={styles.pwEye}
                aria-label="Password info"
                onClick={() => setShowNote((s) => !s)}
              >
                <i className={showNote ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>
            {showNote && (
              <div className={styles.pwNote}>
                Stored hashed for security — the original password can't be displayed.
              </div>
            )}
          </div>
        </div>
        <div className={styles.pActions}>
          <button className={styles.declineBtn} onClick={onDecline}>
            <i className="ti ti-user-x" style={{ fontSize: 15 }} aria-hidden="true" /> Decline
          </button>
          <button className={styles.approveBtn2} onClick={onApprove}>
            <i className="ti ti-user-check" style={{ fontSize: 15 }} aria-hidden="true" /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Access request card ---------------- */
function RequestCard({ req, onDecline, onCreate }) {
  const declined = req.status === "Declined";
  const contact = [req.email, req.phone, req.company].filter(Boolean).join(" · ");
  return (
    <div className={styles.pcard}>
      <div className={styles.pTop}>
        <span className={styles.reqAvatar}>
          <i className="ti ti-mail-forward" style={{ fontSize: 19 }} aria-hidden="true" />
        </span>
        <div className={styles.pMid}>
          <div className={styles.pNameRow}>
            <span className={styles.pName}>{req.name}</span>
            {declined ? (
              <span className={styles.reqChipDeclined}>Declined</span>
            ) : (
              <span className={styles.reqChipNew}>New</span>
            )}
          </div>
          <div className={styles.pContact}>{contact}</div>
          <div className={styles.problemBox}>
            <b className={styles.problemLabel}>PROBLEM REPORTED</b>
            {req.problem}
          </div>
          <div className={styles.pMeta}>
            {req.req_no}{req.req_no ? " · " : ""}{ago(req.created_at)}
          </div>
        </div>
        {!declined && (
          <div className={styles.pActions}>
            <button className={styles.declineBtn} onClick={onDecline}>
              <i className="ti ti-mail-x" style={{ fontSize: 15 }} aria-hidden="true" /> Decline
            </button>
            <button className={styles.createFromReqBtn} onClick={onCreate}>
              <i className="ti ti-user-plus" style={{ fontSize: 15 }} aria-hidden="true" /> Create user
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Create user modal ---------------- */
function CreateUserModal({ prefill, roles, companies, onClose, onSaved }) {
  const [name, setName] = useState(prefill.name || "");
  const [email, setEmail] = useState(prefill.email || "");
  const [phone, setPhone] = useState(prefill.phone || "");
  const [companyId, setCompanyId] = useState(prefill.company_id || "");
  const [role, setRole] = useState("");
  const [all, setAll] = useState(true);
  const [sel, setSel] = useState([]);
  const [filter, setFilter] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (r) => setSel((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const shown = SCOPE_REGIONS.filter((r) => r.toLowerCase().includes(filter.trim().toLowerCase()));

  async function submit() {
    setErr("");
    if (!name.trim() || !email.trim()) return setErr("Name and email are required");
    if (!role) return setErr("Select a role");
    if (pw || pw2) {
      if (pw.length < 8 || !/[0-9]/.test(pw)) return setErr("Password must be at least 8 characters and include a number");
      if (pw !== pw2) return setErr("The two passwords do not match");
    }
    const regions = all ? [] : sel;
    if (!all && regions.length === 0) return setErr("Pick at least one region, or choose country-wide");

    setSaving(true);
    try {
      const res = await fetch("/api/mainapp/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(),
          phone: phone.trim(), company_id: companyId || null,
          role, regions, password: pw || "",
        }),
      });
      const d = await res.json();
      if (!res.ok) { setSaving(false); return setErr(d.error || "Could not create user"); }
      const channels = [d.notified?.email && "email", d.notified?.sms && "SMS"].filter(Boolean).join(" & ");
      const pwPart = d.generated ? ` · temp password ${d.password}` : "";
      onSaved(`User created${channels ? ` — credentials sent by ${channels}` : ""}${pwPart}`);
    } catch { setSaving(false); setErr("Network error"); }
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.amModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.amHeader}>
          <div className={styles.amHeadLeft}>
            <span className={styles.amHeadIcon}>
              <i className="ti ti-user-plus" style={{ fontSize: 18 }} aria-hidden="true" />
            </span>
            <div>
              <div className={styles.amTitle}>Create user</div>
              <div className={styles.amSub}>They sign in with the credentials you hand over</div>
            </div>
          </div>
          <button className={styles.amClose} aria-label="Close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.amBody}>
          {err && <div className={styles.err}>{err}</div>}

          <div className={styles.field}>
            <label className={styles.amLabel}>Full name</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Wanjiku" />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Email</label>
            <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@symphony.co.ke" />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Phone</label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Company</label>
            <select className={styles.input} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select company…</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Role</label>
            <select className={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Select a role…</option>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.amLabel}>Region scope</label>
            <div className={styles.scopeBox}>
              <label className={styles.scopeAll}>
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
                All — country-wide
              </label>
              <div className={styles.scopeFilterWrap}>
                <input className={styles.scopeFilter} placeholder="Filter regions…" value={filter}
                  onChange={(e) => setFilter(e.target.value)} disabled={all} />
              </div>
              <div className={styles.scopeList}>
                <div className={styles.scopeGroup}>Security regions</div>
                {shown.map((r) => (
                  <label key={r} className={`${styles.scopeRow} ${all ? styles.scopeRowDisabled : ""}`}>
                    <input type="checkbox" value={r} checked={sel.includes(r)} onChange={() => toggle(r)} disabled={all} />
                    {r}
                  </label>
                ))}
              </div>
              {all
                ? <div className={styles.scopeNote}>Country-wide — every region</div>
                : sel.length > 0 && <div className={styles.scopeNote}>{sel.length} region{sel.length === 1 ? "" : "s"} selected</div>}
            </div>
          </div>

          <div className={styles.pwHead}>
            Password <span className={styles.pwHint}>— leave blank to generate one</span>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Set password</label>
            <div className={styles.amPwWrap}>
              <input className={styles.input} type={showPw ? "text" : "password"}
                placeholder="At least 8 characters, one number" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className={styles.amPwEye} aria-label="Show password" onClick={() => setShowPw((s) => !s)}>
                <i className={showPw ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Confirm password</label>
            <div className={styles.amPwWrap}>
              <input className={styles.input} type={showPw2 ? "text" : "password"}
                placeholder="Repeat the password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <button type="button" className={styles.amPwEye} aria-label="Show password" onClick={() => setShowPw2((s) => !s)}>
                <i className={showPw2 ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.amFooter}>
          <button className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.amCreate} onClick={submit} disabled={saving}>
            <i className="ti ti-key" style={{ fontSize: 16 }} aria-hidden="true" />
            {saving ? "Creating…" : "Create and issue credentials"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Approve registration modal ---------------- */
function ApproveModal({ user, roles, companies, onClose, onSaved }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [companyId, setCompanyId] = useState(user.company_id || "");
  const [role, setRole] = useState("");
  const [all, setAll] = useState(true);
  const [sel, setSel] = useState([]);
  const [filter, setFilter] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (r) => setSel((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const shown = SCOPE_REGIONS.filter((r) => r.toLowerCase().includes(filter.trim().toLowerCase()));

  async function submit() {
    setErr("");
    if (!role) return setErr("Select a role");
    const regions = all ? [] : sel;
    if (!all && regions.length === 0) return setErr("Pick at least one region, or choose country-wide");
    const changePw = pw.trim().length > 0;
    if (changePw && (pw.length < 8 || !/[0-9]/.test(pw)))
      return setErr("Password must be at least 8 characters and include a number");
    setSaving(true);
    try {
      // Just activate the account with the role + region scope (they already set a password).
      const res = await fetch(`/api/mainapp/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", role, regions }),
      });
      const d = await res.json();
      if (!res.ok) { setSaving(false); return setErr(d.error || "Could not approve"); }
      // Optional: only if the admin typed a new password.
      if (changePw) {
        await fetch(`/api/mainapp/users/${user.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setPassword", password: pw }),
        });
      }
      onSaved(changePw ? "Approved — password changed" : "Registration approved");
    } catch { setSaving(false); setErr("Network error"); }
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.amModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.amHeader}>
          <div className={styles.amHeadLeft}>
            <span className={styles.amHeadIcon}>
              <i className="ti ti-user-plus" style={{ fontSize: 18 }} aria-hidden="true" />
            </span>
            <div>
              <div className={styles.amTitle}>Approve registration</div>
              <div className={styles.amSub}>They sign in with the credentials you hand over</div>
            </div>
          </div>
          <button className={styles.amClose} aria-label="Close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.amBody}>
          {err && <div className={styles.err}>{err}</div>}

          <div className={styles.field}>
            <label className={styles.amLabel}>Full name</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Email</label>
            <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Phone</label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Company</label>
            <select className={styles.input} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {!companies.length && <option value="">{user.company || "—"}</option>}
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Role</label>
            <select className={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Select a role…</option>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.amLabel}>Region scope</label>
            <div className={styles.scopeBox}>
              <label className={styles.scopeAll}>
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
                All — country-wide
              </label>
              <div className={styles.scopeFilterWrap}>
                <input
                  className={styles.scopeFilter}
                  placeholder="Filter regions…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  disabled={all}
                />
              </div>
              <div className={styles.scopeList}>
                <div className={styles.scopeGroup}>Security regions</div>
                {shown.map((r) => (
                  <label
                    key={r}
                    className={`${styles.scopeRow} ${all ? styles.scopeRowDisabled : ""}`}
                  >
                    <input
                      type="checkbox"
                      value={r}
                      checked={sel.includes(r)}
                      onChange={() => toggle(r)}
                      disabled={all}
                    />
                    {r}
                  </label>
                ))}
              </div>
              {all
                ? <div className={styles.scopeNote}>Country-wide — every region</div>
                : sel.length > 0 && <div className={styles.scopeNote}>{sel.length} region{sel.length === 1 ? "" : "s"} selected</div>}
            </div>
          </div>

          <div className={styles.pwHead}>
            Password <span className={styles.pwHint}>— they already chose one; fill this in only to change it</span>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Password they set</label>
            <div className={styles.amPwWrap}>
              <input
                className={styles.input}
                type={showPw ? "text" : "password"}
                placeholder="Leave blank to keep their password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <button type="button" className={styles.amPwEye} aria-label="Show password" onClick={() => setShowPw((s) => !s)}>
                <i className={showPw ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.amFooter}>
          <button className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.amCreate} onClick={submit} disabled={saving}>
            <i className="ti ti-key" style={{ fontSize: 16 }} aria-hidden="true" />
            {saving ? "Approving…" : "Create and issue credentials"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Create / Edit modal ---------------- */
// ---------------- Edit user modal (matches prototype agEditUserDialog) ------
function UserModal({ modal, roles, companies, onClose, onSaved }) {
  const u = modal.user || {};
  const [name, setName] = useState(u.name || "");
  const [email, setEmail] = useState(u.email || "");
  const [phone, setPhone] = useState(u.phone || "");
  const [companyId, setCompanyId] = useState(u.company_id || "");
  const [role, setRole] = useState(u.role || (roles[0]?.key || ""));
  const [status, setStatus] = useState(u.status === "Suspended" ? "Suspended" : "Active");

  const initialRegions = Array.isArray(u.regions) ? u.regions : [];
  const [all, setAll] = useState(initialRegions.length === 0);
  const [sel, setSel] = useState(initialRegions);
  const [filter, setFilter] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [curNote, setCurNote] = useState(false);
  const [genOut, setGenOut] = useState("");

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (r) => setSel((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const shown = SCOPE_REGIONS.filter((r) => r.toLowerCase().includes(filter.trim().toLowerCase()));
  const signIn = u.email || u.phone || "—";

  function generate() {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ", a = "abcdefghijkmnopqrstuvwxyz", d = "23456789";
    const pick = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
    const t = pick(A, 2) + pick(a, 4) + pick(d, 3);
    setPw(t); setPw2(t); setGenOut(t); setShowPw(true); setShowPw2(true);
  }

  async function save() {
    setErr("");
    const regions = all ? [] : sel;
    if (!all && regions.length === 0) return setErr("Pick at least one region, or choose country-wide");
    const changePw = pw.trim().length > 0 || pw2.trim().length > 0;
    if (changePw) {
      if (pw.length < 8 || !/[0-9]/.test(pw)) return setErr("New password must be at least 8 characters and include a number");
      if (pw !== pw2) return setErr("The two new passwords do not match");
    }
    setSaving(true);
    const patch = (obj) => fetch(`/api/mainapp/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj),
    });
    try {
      await patch({ action: "update", name: name.trim(), email: email.trim(), phone: phone.trim(), company_id: companyId || null });
      await patch({ action: "setRole", role });
      await patch({ action: "setRegions", regions });
      if (status !== u.status) await patch({ action: status === "Suspended" ? "suspend" : "activate" });
      if (changePw) {
        const r = await patch({ action: "setPassword", password: pw });
        if (!r.ok) { const d = await r.json().catch(() => ({})); setSaving(false); return setErr(d.error || "Could not set password"); }
      }
      onSaved("User updated");
    } catch { setSaving(false); setErr("Network error"); }
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.amModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.amHeader}>
          <div className={styles.amHeadLeft}>
            <span className={styles.amHeadIcon}>
              <i className="ti ti-user-cog" style={{ fontSize: 18 }} aria-hidden="true" />
            </span>
            <div>
              <div className={styles.amTitle}>Edit user</div>
              <div className={styles.amSub}>{(u.name || "")}{" · signs in with "}{signIn}</div>
            </div>
          </div>
          <button className={styles.amClose} aria-label="Close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.amBody}>
          {err && <div className={styles.err}>{err}</div>}

          <div className={styles.field}>
            <label className={styles.amLabel}>Full name</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Email</label>
            <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Phone</label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Company</label>
            <select className={styles.input} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select company…</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Role</label>
            <select className={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Status</label>
            <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.amLabel}>Region scope</label>
            <div className={styles.scopeBox}>
              <label className={styles.scopeAll}>
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
                All — country-wide
              </label>
              <div className={styles.scopeFilterWrap}>
                <input className={styles.scopeFilter} placeholder="Filter regions…" value={filter}
                  onChange={(e) => setFilter(e.target.value)} disabled={all} />
              </div>
              <div className={styles.scopeList}>
                <div className={styles.scopeGroup}>Security regions</div>
                {shown.map((r) => (
                  <label key={r} className={`${styles.scopeRow} ${all ? styles.scopeRowDisabled : ""}`}>
                    <input type="checkbox" value={r} checked={sel.includes(r)} onChange={() => toggle(r)} disabled={all} />
                    {r}
                  </label>
                ))}
              </div>
              {all
                ? <div className={styles.scopeNote} style={{ color: "#059669" }}>Country-wide — every region</div>
                : (sel.length > 0
                    ? <div className={styles.scopeNote}>{sel.length} region{sel.length === 1 ? "" : "s"} selected</div>
                    : <div className={styles.scopeNote} style={{ color: "#dc2626" }}>Nothing selected — tick All or pick regions</div>)}
            </div>
          </div>

          <div className={styles.pwHead}>
            Password <span className={styles.pwHint}>— leave the new fields blank to keep the current one</span>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Current password</label>
            <div className={styles.amPwWrap}>
              <input className={styles.input} readOnly value="••••••••••••"
                style={{ fontFamily: "ui-monospace, monospace", background: "#f8fafc", color: "#64748b", fontWeight: 700 }} />
              <button type="button" className={styles.amPwEye} aria-label="About current password" onClick={() => setCurNote((n) => !n)}>
                <i className="ti ti-eye" style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>
            {curNote && <div className={styles.curNote}>Stored encrypted — it can&apos;t be shown. Set a new one below to change it.</div>}
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>New password</label>
            <div className={styles.amPwWrap}>
              <input className={styles.input} type={showPw ? "text" : "password"} value={pw}
                placeholder="At least 8 characters, one number" onChange={(e) => setPw(e.target.value)} />
              <button type="button" className={styles.amPwEye} aria-label="Show password" onClick={() => setShowPw((s) => !s)}>
                <i className={showPw ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.amLabel}>Confirm new password</label>
            <div className={styles.amPwWrap}>
              <input className={styles.input} type={showPw2 ? "text" : "password"} value={pw2}
                placeholder="Repeat the new password" onChange={(e) => setPw2(e.target.value)} />
              <button type="button" className={styles.amPwEye} aria-label="Show password" onClick={() => setShowPw2((s) => !s)}>
                <i className={showPw2 ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>
          </div>
          <button type="button" className={styles.genPwBtn} onClick={generate}>
            <i className="ti ti-key" style={{ fontSize: 15 }} aria-hidden="true" /> Generate a temporary password
          </button>
          {genOut && (
            <div className={styles.pwOut}>
              Temporary password: <b>{genOut}</b> — filled in above. Click <b>Save changes</b> to apply.
            </div>
          )}
        </div>

        <div className={styles.amFooter}>
          <button className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
