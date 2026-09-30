// app/mainapp/admin/users/components/UsersAdmin.jsx
// Users & Roles — matches the AssetGuard prototype. Wired to the real API.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./users.module.css";
import { useFacets } from "../../../lib/useFacets.js";

// Fallback security regions (used only until the live facets load / on an empty DB).
// Region-scope options come ONLY from real data — GET /api/mainapp/facets
// (registered response_regions + distinct sites.security_region). No hardcoded seed.
const scopeRegionsFrom = (facets) => (Array.isArray(facets?.securityRegions) ? facets.securityRegions : []);

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
  const facets = useFacets();
  const SCOPE = scopeRegionsFrom(facets);            // live security regions
  const REGION_OPTS = ["Country-wide", ...SCOPE];
  const [companies, setCompanies] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [tab, setTab] = useState("users"); // users | pending | requests
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | Active | Suspended | Rejected
  const [presence, setPresence] = useState("");         // "" | online | offline
  const [regFilter, setRegFilter] = useState("");       // "" | Country-wide | <region>
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', user?}
  const [confirmDel, setConfirmDel] = useState(null); // user pending delete
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false); // site-assignment import dialog
  const [importUsersOpen, setImportUsersOpen] = useState(false); // bulk user import
  const [selected, setSelected] = useState(() => new Set()); // ids picked for mass delete
  const [bulkOpen, setBulkOpen] = useState(false);   // mass-delete confirm
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false); // bulk role/region edit
  const [bulkEditBusy, setBulkEditBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(null);      // "Suspended" | "Active" — confirm target
  const [bulkStatusBusy, setBulkStatusBusy] = useState(false);

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

  // Keep "Online" live without a loading flash: every 45s pull the users list
  // and merge ONLY the presence fields into the rows we already show, so open
  // dropdowns and any in-row edits are never disturbed.
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const d = await fetch("/api/mainapp/users").then((r) => (r.ok ? r.json() : null));
        if (!d || !Array.isArray(d.users)) return;
        const presence = new Map(d.users.map((u) => [u.id, { online: u.online, last_seen: u.last_seen }]));
        setUsers((prev) => prev.map((u) => (presence.has(u.id) ? { ...u, ...presence.get(u.id) } : u)));
      } catch { /* ignore a missed poll */ }
    }, 45000);
    return () => clearInterval(t);
  }, []);
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
    if (statusFilter) list = list.filter((u) => u.status === statusFilter);
    if (presence === "online") list = list.filter((u) => !!u.online);
    else if (presence === "offline") list = list.filter((u) => !u.online);
    if (regFilter) {
      list = list.filter((u) => {
        const scope = u.regions && u.regions.length ? u.regions[0] : "Country-wide";
        return scope === regFilter;
      });
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((u) =>
        [u.name, u.email, u.phone, u.company].some((v) => String(v || "").toLowerCase().includes(s)));
    }
    return list;
  }, [users, tab, roleFilter, statusFilter, presence, regFilter, q]);

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

  // ---- mass selection / delete ----
  const toggleSel = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisibleSelected = visible.length > 0 && visible.every((u) => selected.has(u.id));
  const toggleSelAll = () => setSelected((s) => {
    const n = new Set(s);
    if (visible.every((u) => n.has(u.id))) visible.forEach((u) => n.delete(u.id));
    else visible.forEach((u) => n.add(u.id));
    return n;
  });
  useEffect(() => { setSelected(new Set()); }, [tab]);

  async function doBulkDelete() {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/mainapp/users", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setBulkBusy(false); return flash(d.error || "Delete failed"); }
      setBulkOpen(false); setSelected(new Set());
      flash(`Deleted ${d.deleted} user${d.deleted === 1 ? "" : "s"}${d.skippedSelf ? " (your own account was kept)" : ""}`);
      load();
    } catch { flash("Network error"); }
    finally { setBulkBusy(false); }
  }

  // Bulk-apply a role and/or a region scope to every selected user in one call.
  // `role` "" means leave role unchanged; `region` null means leave region
  // unchanged. "Country-wide" clears the region array.
  async function doBulkEdit({ role, region }) {
    const ids = [...selected];
    if (!ids.length) return;
    const payload = { ids };
    if (role) payload.role = role;
    if (region !== null && region !== undefined) payload.regions = region === "Country-wide" ? [] : [region];
    if (!payload.role && !payload.regions) return flash("Pick a role or a region to apply");
    setBulkEditBusy(true);
    try {
      const res = await fetch("/api/mainapp/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setBulkEditBusy(false); return flash(d.error || "Update failed"); }
      setBulkEditOpen(false); setSelected(new Set());
      const n = Math.max(d.roleUpdated || 0, d.regionUpdated || 0);
      flash(`Updated ${n} user${n === 1 ? "" : "s"}${d.skippedSelfRole ? " (your own role kept)" : ""}`);
      load();
    } catch { flash("Network error"); }
    finally { setBulkEditBusy(false); }
  }

  // Bulk-suspend or bulk-reactivate every selected user. Your own account is
  // skipped server-side so a mass suspend can't lock you out.
  async function doBulkStatus(status) {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkStatusBusy(true);
    try {
      const res = await fetch("/api/mainapp/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setBulkStatusBusy(false); return flash(d.error || "Update failed"); }
      setBulkStatus(null); setSelected(new Set());
      const verb = status === "Suspended" ? "Suspended" : "Reactivated";
      const n = d.statusUpdated || 0;
      flash(`${verb} ${n} user${n === 1 ? "" : "s"}${d.skippedSelfStatus ? " (your own account kept)" : ""}`);
      load();
    } catch { flash("Network error"); }
    finally { setBulkStatusBusy(false); }
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
        {tab !== "requests" && (
          <>
            <select className={styles.roleFilter} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select className={styles.roleFilter} value={presence} onChange={(e) => setPresence(e.target.value)}>
              <option value="">Online &amp; offline</option>
              <option value="online">Online now</option>
              <option value="offline">Offline</option>
            </select>
            <select className={styles.roleFilter} value={regFilter} onChange={(e) => setRegFilter(e.target.value)}>
              <option value="">All regions</option>
              {REGION_OPTS.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
            </select>
            {(roleFilter || statusFilter || presence || regFilter) && (
              <button
                className={styles.btnGhost}
                onClick={() => { setRoleFilter(""); setStatusFilter(""); setPresence(""); setRegFilter(""); }}
                title="Clear all filters"
              >
                Clear filters
              </button>
            )}
          </>
        )}
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.createBtn} style={{ background: "#fff", color: "#334155", border: "1px solid #e2e8f0" }}
            onClick={() => setImportUsersOpen(true)}>
            <i className="ti ti-users-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            Import users
          </button>
          <button className={styles.createBtn} style={{ background: "#fff", color: "#334155", border: "1px solid #e2e8f0" }}
            onClick={() => setImportOpen(true)}>
            <i className="ti ti-upload" style={{ fontSize: 16 }} aria-hidden="true" />
            Import site assignments
          </button>
          <button className={styles.createBtn} onClick={() => setModal({ mode: "create" })}>
            <i className="ti ti-user-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            Create user
          </button>
        </div>
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
          {tab === "users" && selected.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 14px", background: "#EFF4FF", border: "1px solid #BFD3FF", borderRadius: 10, margin: "0 0 10px" }}>
              <span style={{ fontWeight: 700, color: "#1E40AF" }}>{selected.size} selected</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className={styles.btnGhost} onClick={() => setSelected(new Set())}>Clear</button>
                <button className={styles.btnPrimary} onClick={() => setBulkEditOpen(true)}>
                  <i className="ti ti-edit" style={{ fontSize: 15 }} aria-hidden="true" /> Change role / region
                </button>
                <button className={styles.btnGhost} onClick={() => setBulkStatus("Suspended")}>
                  <i className="ti ti-ban" style={{ fontSize: 15 }} aria-hidden="true" /> Suspend
                </button>
                <button className={styles.btnGhost} onClick={() => setBulkStatus("Active")}>
                  <i className="ti ti-user-check" style={{ fontSize: 15 }} aria-hidden="true" /> Reactivate
                </button>
                <button className={styles.delConfirmBtn} onClick={() => setBulkOpen(true)}>
                  <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" /> Delete selected
                </button>
              </div>
            </div>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                {tab === "users" && (
                  <th style={{ width: 34 }}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelAll} aria-label="Select all" />
                  </th>
                )}
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
                <tr><td colSpan={8}><div className={styles.empty}>Loading…</div></td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={8}><div className={styles.empty}>No users here.</div></td></tr>
              ) : (
                visible.map((u) => (
                  <tr key={u.id}>
                    {tab === "users" && (
                      <td style={{ width: 34 }}>
                        <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSel(u.id)} aria-label={`Select ${u.name}`} />
                      </td>
                    )}
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.avatarWrap}>
                          <span className={styles.avatar}>{initials(u.name)}</span>
                          {u.online && <span className={styles.avatarOnline} title="Online now" aria-label="Online" />}
                        </span>
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
                            {REGION_OPTS.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
                          </select>
                        </div>
                      </td>
                    )}
                    <td>
                      <span className={`${styles.statusPill} ${STATUS_CLASS[u.status] || ""}`}>
                        <span className={styles.dot} />{u.status}
                      </span>
                    </td>
                    <td className={styles.lastActive}>
                      {u.online
                        ? <span className={styles.onlineTag}><span className={styles.onlineDot} />Online</span>
                        : ago(u.last_seen)}
                    </td>
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
        return <UserModal modal={modal} roles={roles} companies={companies} regions={REGION_OPTS}
          onClose={() => setModal(null)} onSaved={afterSave} />;
      })()}

      {importOpen && (
        <SiteScopeImportDialog onClose={() => setImportOpen(false)}
          onImported={(msg) => { setImportOpen(false); flash(msg); load(); }} />
      )}

      {importUsersOpen && (
        <UserImportDialog regions={SCOPE} onClose={() => setImportUsersOpen(false)}
          onImported={(msg) => { setImportUsersOpen(false); flash(msg); load(); }} />
      )}

      {bulkOpen && (
        <div className={styles.scrim} onClick={() => !bulkBusy && setBulkOpen(false)}>
          <div className={styles.modal} style={{ maxWidth: 420, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <span className={styles.delIcon}><i className="ti ti-trash" style={{ fontSize: 24 }} aria-hidden="true" /></span>
            <div className={styles.modalTitle}>Delete {selected.size} user{selected.size === 1 ? "" : "s"}?</div>
            <div className={styles.modalSub}>
              This permanently removes the selected user{selected.size === 1 ? "" : "s"}. Your own account is kept automatically. This can&apos;t be undone.
            </div>
            <div className={styles.modalActions} style={{ justifyContent: "center" }}>
              <button className={styles.btnGhost} onClick={() => setBulkOpen(false)} disabled={bulkBusy}>Cancel</button>
              <button className={styles.delConfirmBtn} onClick={doBulkDelete} disabled={bulkBusy}>
                <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
                {bulkBusy ? "Deleting…" : `Delete ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkEditOpen && (
        <BulkEditModal
          count={selected.size}
          roles={roles}
          regions={REGION_OPTS}
          busy={bulkEditBusy}
          onClose={() => !bulkEditBusy && setBulkEditOpen(false)}
          onApply={doBulkEdit}
        />
      )}

      {bulkStatus && (
        <div className={styles.scrim} onClick={() => !bulkStatusBusy && setBulkStatus(null)}>
          <div className={styles.modal} style={{ maxWidth: 420, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <span
              className={styles.delIcon}
              style={bulkStatus === "Active" ? { background: "#dcfce7", color: "#16a34a" } : { background: "#fef3c7", color: "#b45309" }}
            >
              <i className={`ti ${bulkStatus === "Active" ? "ti-user-check" : "ti-ban"}`} style={{ fontSize: 24 }} aria-hidden="true" />
            </span>
            <div className={styles.modalTitle}>
              {bulkStatus === "Active" ? "Reactivate" : "Suspend"} {selected.size} user{selected.size === 1 ? "" : "s"}?
            </div>
            <div className={styles.modalSub}>
              {bulkStatus === "Active"
                ? "The selected users will be able to sign in again."
                : "The selected users are signed out and blocked from signing in until reactivated. Your own account is kept automatically."}
            </div>
            <div className={styles.modalActions} style={{ justifyContent: "center" }}>
              <button className={styles.btnGhost} onClick={() => setBulkStatus(null)} disabled={bulkStatusBusy}>Cancel</button>
              <button className={styles.btnPrimary} onClick={() => doBulkStatus(bulkStatus)} disabled={bulkStatusBusy}>
                {bulkStatusBusy
                  ? "Applying…"
                  : bulkStatus === "Active" ? `Reactivate ${selected.size}` : `Suspend ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

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

/* ---------------- Bulk role / region edit ---------------- */
// Applies to every currently-selected user. Either field can be left as
// "Keep unchanged", so an admin can change only the role, only the region, or
// both in one pass. The Apply button stays disabled until at least one field is
// set, so an empty submit can't quietly touch every selected row.
function BulkEditModal({ count, roles, regions, busy, onClose, onApply }) {
  const [role, setRole] = useState("");        // "" = keep unchanged
  const [region, setRegion] = useState("__keep__"); // sentinel = keep unchanged
  const nothingChosen = !role && region === "__keep__";

  const apply = () => {
    if (nothingChosen) return;
    onApply({ role: role || "", region: region === "__keep__" ? null : region });
  };

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Change role / region</div>
        <div className={styles.modalSub}>
          Applies to the {count} selected user{count === 1 ? "" : "s"}. Leave a field on
          “Keep unchanged” to touch only the other. Your own role is never changed here.
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Role</label>
          <select className={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Keep unchanged</option>
            {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Region scope</label>
          <select className={styles.input} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="__keep__">Keep unchanged</option>
            {regions.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
          </select>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnGhost} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={styles.btnPrimary} onClick={apply} disabled={busy || nothingChosen}>
            {busy ? "Applying…" : `Apply to ${count}`}
          </button>
        </div>
      </div>
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
  const facets = useFacets();
  const SCOPE = scopeRegionsFrom(facets);
  const shown = SCOPE.filter((r) => r.toLowerCase().includes(filter.trim().toLowerCase()));

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
  const facets = useFacets();
  const SCOPE = scopeRegionsFrom(facets);
  const shown = SCOPE.filter((r) => r.toLowerCase().includes(filter.trim().toLowerCase()));

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
  // Site visibility override: "" = inherit the global default, else region/list.
  const [siteScopeMode, setSiteScopeMode] = useState(
    u.site_scope_mode === "region" || u.site_scope_mode === "list" ? u.site_scope_mode : ""
  );

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [curNote, setCurNote] = useState(false);
  const [genOut, setGenOut] = useState("");

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (r) => setSel((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const facets = useFacets();
  const SCOPE = scopeRegionsFrom(facets);
  const shown = SCOPE.filter((r) => r.toLowerCase().includes(filter.trim().toLowerCase()));
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
      // Assigned-list scope is a field-technician feature; for any other role the
      // override is cleared so a leftover setting can't linger after a role change.
      await patch({ action: "setSiteScope", mode: role === "field_tech" ? (siteScopeMode || null) : null });
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

          {role === "field_tech" && (
            <div className={styles.field}>
              <label className={styles.amLabel}>Site visibility <span className={styles.pwHint}>— field technicians only</span></label>
              <select className={styles.input} value={siteScopeMode} onChange={(e) => setSiteScopeMode(e.target.value)}>
                <option value="">Use global default</option>
                <option value="region">Region-controlled</option>
                <option value="list">Assigned sites (imported list)</option>
              </select>
              <div className={styles.scopeNote}>
                {siteScopeMode === "list"
                  ? `Sees only assigned sites — ${u.site_count || 0} assigned. Use “Import site assignments” to set them.`
                  : siteScopeMode === "region"
                    ? "Scoped by the region scope above."
                    : "Follows the global default set in Settings."}
              </div>
            </div>
          )}

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

/* ---- Site-assignment import (User + Site ID -> user_sites, mode = list) ---- */
function ssParseCSV(text) {
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
const ssNorm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

function SiteScopeImportDialog({ onClose, onImported }) {
  const [rows, setRows] = useState(null); // parsed [{user, site}]
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  function downloadTemplate() {
    const csv = "User,Site ID\njane.doe@symphony.co.ke,NBI-HQ-001\njane.doe@symphony.co.ke,NBI-HQ-002\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assetguard-site-assignments-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setResult(null);
    const reader = new FileReader();
    reader.onload = () => build(String(reader.result || ""), f.name);
    reader.onerror = () => setErr(`${f.name} could not be read.`);
    reader.readAsText(f);
  }

  function build(text, name) {
    const grid = ssParseCSV(text);
    if (!grid.length) { setErr("The file is empty."); return; }
    const head = grid[0].map(ssNorm);
    const uCol = head.findIndex((h) => ["user", "email", "user email", "user (email)"].includes(h));
    const sCol = head.findIndex((h) => ["site id", "site", "site code", "code"].includes(h));
    if (uCol < 0 || sCol < 0) {
      setErr(`Needs "User" and "Site ID" columns. This file has: ${grid[0].join(", ")}`);
      return;
    }
    const parsed = grid.slice(1)
      .map((r) => ({ user: (r[uCol] || "").trim(), site: (r[sCol] || "").trim() }))
      .filter((r) => r.user && r.site);
    if (!parsed.length) { setErr("No usable rows found."); return; }
    setRows(parsed); setFileName(name); setErr("");
  }

  async function confirm() {
    if (!rows) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/mainapp/users/site-scope/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, setListMode: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setBusy(false); return setErr(d.error || "Import failed"); }
      setResult(d); setBusy(false);
    } catch { setBusy(false); setErr("Network error"); }
  }

  return (
    <div className={styles.scrim} onClick={() => !busy && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Import field technician sites</div>
        <div className={styles.modalSub} style={{ textAlign: "left" }}>
          Two columns — <b>User</b> (email) and <b>Site ID</b> (site code). This assigns sites to
          <b> field technicians</b> only: each matched technician is set to “Assigned sites” visibility and
          given exactly the sites listed (other roles stay region-controlled). Repeat a technician across
          rows for multiple sites.{" "}
          <button type="button" onClick={downloadTemplate}
            style={{ border: "none", background: "none", color: "#2E6CF5", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Download template
          </button>
        </div>

        <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={onPick} />

        {!result ? (
          <>
            <button type="button" className={styles.btnPrimary} style={{ marginTop: 8 }}
              onClick={() => inputRef.current && inputRef.current.click()}>
              <i className="ti ti-file-upload" style={{ fontSize: 15 }} aria-hidden="true" /> Choose CSV file
            </button>
            {rows ? <div className={styles.scopeNote} style={{ marginTop: 10 }}>{fileName} — {rows.length} row{rows.length === 1 ? "" : "s"} ready.</div> : null}
            {err ? <div className={styles.err} style={{ marginTop: 10 }}>{err}</div> : null}
            <div className={styles.modalActions} style={{ marginTop: 14 }}>
              <button className={styles.btnGhost} onClick={onClose} disabled={busy}>Cancel</button>
              <button className={styles.btnPrimary} onClick={confirm} disabled={busy || !rows}>
                {busy ? "Importing…" : rows ? `Import ${rows.length} row${rows.length === 1 ? "" : "s"}` : "Import"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.scopeNote} style={{ marginTop: 10, color: "#059669" }}>
              Assigned {result.imported} site(s) across {result.users} user(s).
              {result.skipped ? ` Skipped ${result.skipped}.` : ""}
            </div>
            {(result.unknownUsers?.length || result.unknownSites?.length || result.notTechnicians?.length) ? (
              <div className={styles.scopeNote} style={{ color: "#B45309" }}>
                {result.notTechnicians?.length ? `Not field technicians (skipped): ${result.notTechnicians.slice(0, 8).join(", ")}${result.notTechnicians.length > 8 ? "…" : ""}. ` : ""}
                {result.unknownUsers?.length ? `Unknown users: ${result.unknownUsers.slice(0, 8).join(", ")}${result.unknownUsers.length > 8 ? "…" : ""}. ` : ""}
                {result.unknownSites?.length ? `Unknown site IDs: ${result.unknownSites.slice(0, 8).join(", ")}${result.unknownSites.length > 8 ? "…" : ""}.` : ""}
              </div>
            ) : null}
            <div className={styles.modalActions} style={{ marginTop: 14 }}>
              <button className={styles.btnPrimary} onClick={() => onImported(`Imported ${result.imported} assignment(s)`)}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Bulk user import (CSV / Excel) ----------------
   Columns: Name, Email, Phone, Company, Role, Region (security region).
   Password for every imported user = their NAME with spaces removed. */
function UserImportDialog({ regions = [], onClose, onImported }) {
  const [rows, setRows] = useState(null);   // [{name,email,phone,company,role,region}]
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const IDX = (head, names) => head.findIndex((h) => names.includes(h));

  function fromGrid(grid) {
    if (!grid.length) { setErr("The file is empty."); return; }
    const head = grid[0].map(ssNorm);
    const cN = IDX(head, ["name", "full name", "user name"]);
    const cE = IDX(head, ["email", "email address", "user email"]);
    const cP = IDX(head, ["phone", "phone number", "mobile", "msisdn"]);
    const cC = IDX(head, ["company", "company name"]);
    const cR = IDX(head, ["role"]);
    const cReg = IDX(head, ["region", "security region", "region (security region)", "region scope"]);
    if (cN < 0 || cE < 0) {
      setErr(`Needs at least "Name" and "Email" columns. This file has: ${grid[0].join(", ")}`);
      return;
    }
    const parsed = grid.slice(1).map((r) => ({
      name: (r[cN] || "").trim(),
      email: (r[cE] || "").trim(),
      phone: cP >= 0 ? (r[cP] || "").trim() : "",
      company: cC >= 0 ? (r[cC] || "").trim() : "",
      role: cR >= 0 ? (r[cR] || "").trim() : "",
      region: cReg >= 0 ? (r[cReg] || "").trim() : "",
    })).filter((r) => r.name && r.email);
    if (!parsed.length) { setErr("No usable rows (each needs a Name and Email)."); return; }
    setRows(parsed); setErr("");
  }

  async function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setResult(null); setFileName(f.name);
    try {
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        const XLSX = await import("xlsx");
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        fromGrid(XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }).map((r) => r.map((c) => String(c ?? ""))));
      } else {
        const text = await f.text();
        fromGrid(ssParseCSV(text));
      }
    } catch { setErr(`${f.name} could not be read. Use a valid .csv or .xlsx.`); }
  }

  function downloadTemplate() {
    const csv = "Name,Email,Phone,Company,Role,Region\nJane Wanjiku,jane.wanjiku@symphony.co.ke,+254720114880,Symphony Technologies Limited,Field Responder,Nairobi North\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assetguard-users-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function confirm() {
    if (!rows) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/mainapp/users/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: rows }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setBusy(false); return setErr(d.error || "Import failed"); }
      setResult(d); setBusy(false);
    } catch { setBusy(false); setErr("Network error"); }
  }

  const skipped = result?.skipped || [];
  const errors = result?.errors || [];

  return (
    <div className={styles.scrim} onClick={() => !busy && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Import users</div>
        <div className={styles.modalSub} style={{ textAlign: "left" }}>
          Columns: <b>Name</b>, <b>Email</b>, <b>Phone</b>, <b>Company</b>, <b>Role</b>, <b>Region</b> (security region).
          Each new user is Active, and their <b>password is their name with spaces removed</b> (e.g. “Jane Wanjiku” → <code>JaneWanjiku</code>).
          Company &amp; role are matched to registered records; region must be a registered security region{regions.length ? ` (e.g. ${regions.slice(0, 3).join(", ")}${regions.length > 3 ? "…" : ""})` : ""}.{" "}
          <button type="button" onClick={downloadTemplate}
            style={{ border: "none", background: "none", color: "#2E6CF5", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Download template
          </button>
        </div>

        <input ref={inputRef} type="file" accept=".csv,text/csv,.xlsx,.xls" style={{ display: "none" }} onChange={onPick} />

        {!result ? (
          <>
            <button type="button" className={styles.btnPrimary} style={{ marginTop: 8 }}
              onClick={() => inputRef.current && inputRef.current.click()}>
              <i className="ti ti-file-upload" style={{ fontSize: 15 }} aria-hidden="true" /> Choose CSV or Excel file
            </button>
            {rows ? <div className={styles.scopeNote} style={{ marginTop: 10 }}>{fileName} — {rows.length} user{rows.length === 1 ? "" : "s"} ready.</div> : null}
            {err ? <div className={styles.err} style={{ marginTop: 10 }}>{err}</div> : null}
            <div className={styles.modalActions} style={{ marginTop: 14 }}>
              <button className={styles.btnGhost} onClick={onClose} disabled={busy}>Cancel</button>
              <button className={styles.btnPrimary} onClick={confirm} disabled={busy || !rows}>
                {busy ? "Importing…" : rows ? `Import ${rows.length} user${rows.length === 1 ? "" : "s"}` : "Import"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.scopeNote} style={{ marginTop: 10, color: "#059669" }}>
              Created {result.created} user{result.created === 1 ? "" : "s"}.
              {skipped.length ? ` Skipped ${skipped.length}.` : ""}{errors.length ? ` ${errors.length} error(s).` : ""}
            </div>
            {skipped.length ? (
              <div className={styles.scopeNote} style={{ color: "#B45309" }}>
                Skipped: {skipped.slice(0, 8).map((s) => `${s.email} (${s.reason})`).join(", ")}{skipped.length > 8 ? "…" : ""}
              </div>
            ) : null}
            {errors.length ? (
              <div className={styles.err} style={{ marginTop: 6 }}>
                Errors: {errors.slice(0, 8).map((s) => `${s.email || s.name} (${s.reason})`).join(", ")}{errors.length > 8 ? "…" : ""}
              </div>
            ) : null}
            <div className={styles.modalActions} style={{ marginTop: 14 }}>
              <button className={styles.btnPrimary} onClick={() => onImported(`Imported ${result.created} user(s)`)}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
