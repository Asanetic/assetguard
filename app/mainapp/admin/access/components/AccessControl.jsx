// app/mainapp/admin/access/components/AccessControl.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./access.module.css";

const PERMS = [
  { k: "view", name: "View" }, { k: "add", name: "Add" }, { k: "edit", name: "Edit" },
  { k: "delete", name: "Delete" }, { k: "approve", name: "Approve" }, { k: "export", name: "Export" },
  { k: "reports", name: "Reports" }, { k: "dash", name: "Dashboard" },
];
const gkey = (m, p) => `${m}|${p}`;

export default function AccessControl() {
  const [tab, setTab] = useState("roles");
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null); // {kind:'role'|'module', item?}
  const [matrixRole, setMatrixRole] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const loadRoles = useCallback(() => {
    fetch("/api/mainapp/roles").then((r) => r.ok ? r.json() : { roles: [] })
      .then((d) => setRoles(d.roles || [])).catch(() => {});
  }, []);
  const loadModules = useCallback(() => {
    fetch("/api/mainapp/modules").then((r) => r.ok ? r.json() : { modules: [] })
      .then((d) => setModules(d.modules || [])).catch(() => {});
  }, []);
  useEffect(() => { loadRoles(); loadModules(); }, [loadRoles, loadModules]);

  function openPermissions(roleKey) { setMatrixRole(roleKey); setTab("matrix"); }

  async function deleteRole(key, name) {
    if (!window.confirm(`Delete role "${name}"? Users on this role will lose it.`)) return;
    const res = await fetch(`/api/mainapp/roles/${key}`, { method: "DELETE" });
    if (res.ok) { flash("Role deleted"); loadRoles(); } else flash("Delete failed");
  }
  async function toggleModule(m) {
    const res = await fetch(`/api/mainapp/modules/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !m.active }),
    });
    if (res.ok) { loadModules(); } else flash("Update failed");
  }
  async function deleteModule(m) {
    if (!window.confirm(`Delete module "${m.name}"?`)) return;
    const res = await fetch(`/api/mainapp/modules/${m.id}`, { method: "DELETE" });
    if (res.ok) { flash("Module deleted"); loadModules(); } else flash("Delete failed");
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <i className={`ti ti-shield-lock ${styles.headIcon}`} aria-hidden="true" />
        <span className={styles.title}>Access Control</span>
      </div>
      <div className={styles.sub}>Control what each role can see and do across the platform.</div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "matrix" ? styles.tabActive : ""}`} onClick={() => setTab("matrix")}>
          <i className="ti ti-table" aria-hidden="true" /> Permission Matrix
        </button>
        <button className={`${styles.tab} ${tab === "roles" ? styles.tabActive : ""}`} onClick={() => setTab("roles")}>
          <i className="ti ti-id-badge-2" aria-hidden="true" /> Roles
        </button>
        <button className={`${styles.tab} ${tab === "modules" ? styles.tabActive : ""}`} onClick={() => setTab("modules")}>
          <i className="ti ti-apps" aria-hidden="true" /> Modules
        </button>
      </div>

      {tab === "roles" && (
        <RolesTab roles={roles} onAdd={() => setModal({ kind: "role" })}
          onEdit={(r) => setModal({ kind: "role", item: r })}
          onDelete={deleteRole} onPermissions={openPermissions} />
      )}
      {tab === "modules" && (
        <ModulesTab modules={modules} onAdd={() => setModal({ kind: "module" })}
          onEdit={(m) => setModal({ kind: "module", item: m })}
          onToggle={toggleModule} onDelete={deleteModule} />
      )}
      {tab === "matrix" && (
        <MatrixTab roles={roles} modules={modules} initialRole={matrixRole}
          onSaved={() => { flash("Permissions saved"); loadRoles(); }} />
      )}

      {modal?.kind === "role" && (
        <RoleModal item={modal.item} onClose={() => setModal(null)}
          onSaved={(m) => { setModal(null); flash(m); loadRoles(); }} />
      )}
      {modal?.kind === "module" && (
        <ModuleModal item={modal.item} onClose={() => setModal(null)}
          onSaved={(m) => { setModal(null); flash(m); loadModules(); }} />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ---------------- Roles tab ---------------- */
function RolesTab({ roles, onAdd, onEdit, onDelete, onPermissions }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeadLeft}>
          <i className={`ti ti-id-badge-2 ${styles.cardHeadIcon}`} aria-hidden="true" />
          <div>
            <div className={styles.cardTitle}>Roles List</div>
            <div className={styles.cardSub}>Roles added here become assignable on the Users &amp; Roles page.</div>
          </div>
        </div>
        <button className={styles.addBtn} onClick={onAdd}>
          <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" /> Add Role
        </button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>ID</th><th>Role Name</th><th>Permissions</th><th>Users</th><th>Action</th></tr>
          </thead>
          <tbody>
            {roles.map((r, i) => (
              <tr key={r.key}>
                <td className={styles.muted}>{i + 1}</td>
                <td>
                  <span className={styles.roleCell}>
                    <span className={styles.roleIcon} style={{ background: r.bg, color: r.fg }}>
                      <i className={`ti ${r.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
                    </span>
                    {r.name}
                  </span>
                </td>
                <td className={styles.muted}>{r.perm_count} granted</td>
                <td className={styles.muted}>{r.user_count}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.linkBtn} onClick={() => onPermissions(r.key)}>Permissions</button>
                    <button className={styles.editBtn} onClick={() => onEdit(r)}>Edit</button>
                    <button className={styles.delBtn} onClick={() => onDelete(r.key, r.name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Modules tab ---------------- */
/* ---------------- Modules tab ---------------- */
function typeClass(t) {
  return t === "Button" ? styles.typeButton : t === "Data Point" ? styles.typeData : styles.typePage;
}
function ModulesTab({ modules, onAdd, onEdit, onToggle, onDelete }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeadLeft}>
          <i className={`ti ti-apps ${styles.cardHeadIcon}`} aria-hidden="true" />
          <div>
            <div className={styles.cardTitle}>Modules List</div>
            <div className={styles.cardSub}>Modules are pages, data points, buttons and any other grantable item.</div>
          </div>
        </div>
        <button className={styles.addBtn} onClick={onAdd}>
          <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" /> Add Module
        </button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>ID</th><th>Module Name</th><th>Module Key</th><th>Group</th><th>Type</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {modules.map((m, i) => (
              <tr key={m.id}>
                <td className={styles.muted}>{i + 1}</td>
                <td style={{ fontWeight: 700 }}>{m.name}</td>
                <td className={styles.keyCell}>{m.key}</td>
                <td className={styles.muted}>{m.grp}</td>
                <td><span className={`${styles.typeBadge} ${typeClass(m.type)}`}>{m.type}</span></td>
                <td>
                  <button className={`${styles.statusPill} ${m.active ? styles.statusOn : styles.statusOff}`} onClick={() => onToggle(m)}>
                    {m.active ? "ON" : "OFF"}
                  </button>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => onEdit(m)}>Edit</button>
                    <button className={styles.delBtn} onClick={() => onDelete(m)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Permission Matrix tab ---------------- */
function MatrixTab({ roles, modules, initialRole, onSaved }) {
  const [role, setRole] = useState(initialRole || (roles[0]?.key || ""));
  const [grants, setGrants] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (initialRole) setRole(initialRole); }, [initialRole]);
  useEffect(() => {
    if (!role) return;
    setLoading(true);
    fetch(`/api/mainapp/permissions?role=${encodeURIComponent(role)}`)
      .then((r) => (r.ok ? r.json() : { grants: [] }))
      .then((d) => setGrants(new Set((d.grants || []).map((g) => gkey(g.module_key, g.perm_key)))))
      .finally(() => setLoading(false));
  }, [role]);

  const groups = useMemo(() => {
    const g = {}; modules.forEach((m) => { (g[m.grp] = g[m.grp] || []).push(m); }); return g;
  }, [modules]);
  const total = modules.length * PERMS.length;
  const has = (mk, pk) => grants.has(gkey(mk, pk));
  function toggleCell(mk, pk) {
    setGrants((s) => { const n = new Set(s); const k = gkey(mk, pk); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }
  function toggleRow(mk) {
    setGrants((s) => { const n = new Set(s); const on = PERMS.every((p) => n.has(gkey(mk, p.k))); PERMS.forEach((p) => { const k = gkey(mk, p.k); on ? n.delete(k) : n.add(k); }); return n; });
  }
  function setGroup(items, on) {
    setGrants((s) => { const n = new Set(s); items.forEach((m) => PERMS.forEach((p) => { const k = gkey(m.key, p.k); on ? n.add(k) : n.delete(k); })); return n; });
  }
  async function save() {
    setSaving(true);
    const arr = [...grants].map((k) => { const [module_key, perm_key] = k.split("|"); return { module_key, perm_key }; });
    const res = await fetch("/api/mainapp/permissions", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, grants: arr }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeadLeft}>
          <i className={`ti ti-table ${styles.cardHeadIcon}`} aria-hidden="true" />
          <div>
            <div className={styles.cardTitle}>Role Permission Matrix</div>
            <div className={styles.cardSub}>Toggle each permission per module for the selected role.</div>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save permissions"}
        </button>
      </div>
      <div className={styles.permTools}>
        <div>
          <div className={styles.permLabel}>Select Role</div>
          <select className={styles.roleSelect} value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </div>
        <span className={styles.grantedText}>{grants.size} of {total} permissions granted</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.permTable}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Module</th>
              {PERMS.map((p) => <th key={p.k} style={{ textAlign: "center" }}>{p.name}</th>)}
              <th style={{ textAlign: "center" }}>All</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groups).map((grp) => (
              <MatrixGroup key={grp} grp={grp} items={groups[grp]} has={has} toggleCell={toggleCell} toggleRow={toggleRow} setGroup={setGroup} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function MatrixGroup({ grp, items, has, toggleCell, toggleRow, setGroup }) {
  return (
    <>
      <tr className={styles.grpHeadRow}>
        <td colSpan={PERMS.length + 2}>
          <div className={styles.grpHeadInner}>
            <span className={styles.grpHeadLeft}>{grp}<span className={styles.grpCount}>{items.length} modules</span></span>
            <span className={styles.grpBtns}>
              <button className={styles.grantAll} onClick={() => setGroup(items, true)}>Grant all</button>
              <button className={styles.revokeAll} onClick={() => setGroup(items, false)}>Revoke all</button>
            </span>
          </div>
        </td>
      </tr>
      {items.map((m) => (
        <tr key={m.id}>
          <td><span className={styles.permModule}>{m.name}</span><span className={`${styles.typeBadge} ${typeClass(m.type)}`}>{m.type}</span></td>
          {PERMS.map((p) => (
            <td key={p.k} style={{ textAlign: "center" }}>
              <button className={has(m.key, p.k) ? styles.onPill : styles.offPill} onClick={() => toggleCell(m.key, p.k)}>
                {has(m.key, p.k) ? "ON" : "OFF"}
              </button>
            </td>
          ))}
          <td style={{ textAlign: "center" }}>
            <button className={styles.toggleRowBtn} onClick={() => toggleRow(m.key)}>Toggle</button>
          </td>
        </tr>
      ))}
    </>
  );
}

/* ---------------- Role modal ---------------- */
const ICON_CHOICES = ["ti-shield", "ti-crown", "ti-shield-cog", "ti-briefcase", "ti-user-cog", "ti-shield-check", "ti-user-shield", "ti-shield-half", "ti-run", "ti-tool", "ti-headset"];
function RoleModal({ item, onClose, onSaved }) {
  const editing = !!item;
  const [name, setName] = useState(item?.name || "");
  const [icon, setIcon] = useState(item?.icon || "ti-shield");
  const [bg, setBg] = useState(item?.bg || "#EDE9FE");
  const [fg, setFg] = useState(item?.fg || "#6D28D9");
  const [description, setDescription] = useState(item?.description || "");
  const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  async function save() {
    setErr(""); if (!name.trim()) return setErr("Role name is required");
    setSaving(true);
    const url = editing ? `/api/mainapp/roles/${item.key}` : "/api/mainapp/roles";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, bg, fg, description }),
    });
    const d = await res.json(); setSaving(false);
    if (!res.ok) return setErr(d.error || "Save failed");
    onSaved(editing ? "Role updated" : "Role created");
  }
  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>{editing ? "Edit role" : "Add role"}</div>
        <div className={styles.modalSub}>{editing ? item.key : "New roles become assignable on Users & Roles"}</div>
        {err && <div className={styles.err}>{err}</div>}
        <div className={styles.field}>
          <label className={styles.label}>Role name</label>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Regional Supervisor" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Icon</label>
          <select className={styles.input} value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICON_CHOICES.map((ic) => <option key={ic} value={ic}>{ic.replace("ti-", "")}</option>)}
          </select>
        </div>
        <div className={styles.field} style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className={styles.label}>Tint background</label>
            <input className={styles.input} type="text" value={bg} onChange={(e) => setBg(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className={styles.label}>Icon color</label>
            <input className={styles.input} type="text" value={fg} onChange={(e) => setFg(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span className={styles.roleIcon} style={{ background: bg, color: fg, width: 42, height: 42 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 18 }} />
            </span>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <input className={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" />
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Save" : "Add role"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Module modal ---------------- */
function ModuleModal({ item, onClose, onSaved }) {
  const editing = !!item;
  const [name, setName] = useState(item?.name || "");
  const [key, setKey] = useState(item?.key || "");
  const [grp, setGrp] = useState(item?.grp || "");
  const [type, setType] = useState(item?.type || "Page");
  const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  async function save() {
    setErr("");
    if (!name.trim() || !grp.trim()) return setErr("Name and group are required");
    if (!editing && !key.trim()) return setErr("Key is required");
    setSaving(true);
    const url = editing ? `/api/mainapp/modules/${item.id}` : "/api/mainapp/modules";
    const payload = editing ? { name, grp, type } : { name, key, grp, type };
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json(); setSaving(false);
    if (!res.ok) return setErr(d.error || "Save failed");
    onSaved(editing ? "Module updated" : "Module created");
  }
  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>{editing ? "Edit module" : "Add module"}</div>
        <div className={styles.modalSub}>{editing ? item.key : "Add a page, button or data point"}</div>
        {err && <div className={styles.err}>{err}</div>}
        <div className={styles.field}>
          <label className={styles.label}>Module name</label>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. All Sites" />
        </div>
        {!editing && (
          <div className={styles.field}>
            <label className={styles.label}>Key</label>
            <input className={styles.input} value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. sites_all" />
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label}>Group</label>
          <input className={styles.input} value={grp} onChange={(e) => setGrp(e.target.value)} placeholder="e.g. Sites" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Type</label>
          <select className={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
            <option>Page</option><option>Button</option><option>Data Point</option>
          </select>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Save" : "Add module"}</button>
        </div>
      </div>
    </div>
  );
}
