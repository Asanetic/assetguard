// app/mainapp/alarmconfig/components/AlarmConfig.jsx
// Alarm threshold editor — edit one device inline, or select many and apply a
// threshold set in one batch operation. Fields + ranges come from the API
// (single source of truth in the alarm engine). Admin only (PATCH is gated).
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./alarmconfig.module.css";

export default function AlarmConfig() {
  const [fields, setFields] = useState([]);
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [batchVals, setBatchVals] = useState({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await fetch("/api/mainapp/devices/alarm-config", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Failed to load"); return; }
      setFields(d.fields || []);
      setRows(d.devices || []);
    } catch { setErr("Network error"); }
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.device_id} ${r.imei} ${r.site}`.toLowerCase().includes(s));
  }, [rows, q]);

  const allSelected = shown.length > 0 && shown.every((r) => sel.has(r.id));
  function toggleAll() {
    const next = new Set(sel);
    if (allSelected) shown.forEach((r) => next.delete(r.id));
    else shown.forEach((r) => next.add(r.id));
    setSel(next);
  }
  function toggle(id) {
    const next = new Set(sel); next.has(id) ? next.delete(id) : next.add(id); setSel(next);
  }

  function startEdit(row) { setEditingId(row.id); setEditVals({ ...row.thresholds }); setMsg(""); setErr(""); }
  function cancelEdit() { setEditingId(null); setEditVals({}); }

  async function patch(ids, thresholds, label) {
    setBusy(true); setErr(""); setMsg("");
    try {
      const r = await fetch("/api/mainapp/devices/alarm-config", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, thresholds }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Update failed"); return false; }
      setMsg(`${label} — ${d.updated} device${d.updated === 1 ? "" : "s"} updated.`);
      await load();
      return true;
    } catch { setErr("Network error"); return false; }
    finally { setBusy(false); }
  }

  async function saveEdit() {
    const ok = await patch([editingId], editVals, "Saved");
    if (ok) cancelEdit();
  }
  async function applyBatch() {
    const thresholds = {};
    for (const f of fields) if (batchVals[f.key] !== "" && batchVals[f.key] != null) thresholds[f.key] = batchVals[f.key];
    if (!Object.keys(thresholds).length) { setErr("Enter at least one threshold to apply."); return; }
    const ok = await patch([...sel], thresholds, "Batch applied");
    if (ok) { setBatchVals({}); setSel(new Set()); }
  }

  const selCount = sel.size;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Alarm thresholds</div>
          <div className={styles.sub}>Edit one device inline, or select several and apply a set in batch. Blank batch fields are left unchanged.</div>
        </div>
        <input className={styles.search} placeholder="Search device / site / IMEI" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {err && <div className={styles.err}>{err}</div>}
      {msg && <div className={styles.ok}>{msg}</div>}

      {/* Batch bar */}
      <div className={`${styles.card} ${styles.batch}`}>
        <div className={styles.batchHead}>
          <span className={styles.batchTitle}>Batch apply</span>
          <span className={styles.batchCount}>{selCount} selected</span>
        </div>
        <div className={styles.batchGrid}>
          {fields.map((f) => (
            <label key={f.key} className={styles.bField} title={f.help}>
              <span className={styles.bLabel}>{f.label} <em>{f.unit}</em></span>
              <input
                className={styles.num} type="number" placeholder="—"
                min={f.min} max={f.max} value={batchVals[f.key] ?? ""}
                onChange={(e) => setBatchVals((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <button className={styles.apply} disabled={busy || selCount === 0} onClick={applyBatch}>
          {busy ? "Applying…" : `Apply to ${selCount} selected`}
        </button>
      </div>

      {/* Device table */}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.chkCol}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th>Device</th><th>Site</th>
                {fields.map((f) => <th key={f.key} className={styles.numCol}>{f.label}<span className={styles.unit}>{f.unit}</span></th>)}
                <th className={styles.actCol}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const editing = editingId === r.id;
                return (
                  <tr key={r.id} className={sel.has(r.id) ? styles.selRow : ""}>
                    <td className={styles.chkCol}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td><div className={styles.dev}>{r.device_id || r.imei}</div><div className={styles.imei}>{r.imei}</div></td>
                    <td className={styles.mut}>{r.site || "—"}</td>
                    {fields.map((f) => (
                      <td key={f.key} className={styles.numCol}>
                        {editing
                          ? <input className={styles.num} type="number" min={f.min} max={f.max}
                              value={editVals[f.key] ?? ""} onChange={(e) => setEditVals((v) => ({ ...v, [f.key]: e.target.value }))} />
                          : <span>{r.thresholds[f.key]}</span>}
                      </td>
                    ))}
                    <td className={styles.actCol}>
                      {editing
                        ? <div className={styles.rowActs}>
                            <button className={styles.save} disabled={busy} onClick={saveEdit}>Save</button>
                            <button className={styles.cancel} disabled={busy} onClick={cancelEdit}>Cancel</button>
                          </div>
                        : <button className={styles.edit} onClick={() => startEdit(r)}>Edit</button>}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={fields.length + 4} className={styles.empty}>No devices.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
