// app/mainapp/admin/companies/components/CompaniesAdmin.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "../../components/admin.module.css";

const PURPOSES = [
  { key: "Client", color: "#2E6CF5" },
  { key: "NOC", color: "#0369A1" },
  { key: "Response", color: "#B91C1C" },
];

function purposeChips(list) {
  return (list || []).map((p) => {
    const c = PURPOSES.find((x) => x.key === p)?.color || "#64748B";
    return (
      <span key={p} className={styles.chip} style={{ background: c + "1A", color: c }}>
        {p}
      </span>
    );
  });
}

export default function CompaniesAdmin() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", purposes: [], contactEmail: "", phone: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/mainapp/companies?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/mainapp/login");
        return;
      }
      const data = await res.json();
      setRows(data.companies || []);
    } finally {
      setLoading(false);
    }
  }, [q, router]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m) {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  }

  function togglePurpose(p) {
    setForm((f) => ({
      ...f,
      purposes: f.purposes.includes(p)
        ? f.purposes.filter((x) => x !== p)
        : [...f.purposes, p],
    }));
  }

  async function save() {
    setError("");
    if (!form.name.trim()) return setError("Company name is required");
    if (form.purposes.length === 0) return setError("Select at least one purpose");
    try {
      const res = await fetch("/api/mainapp/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to create company");
      setOpen(false);
      setForm({ name: "", purposes: [], contactEmail: "", phone: "" });
      flash("Company registered");
      load();
    } catch {
      setError("Network error");
    }
  }

  return (
    <>
      {toast ? <div className={styles.toast}>{toast}</div> : null}

      <div className={styles.head}>
        <div>
          <div className={styles.title}>Companies</div>
          <div className={styles.subtitle}>Registered organisations on the platform</div>
        </div>
        <button className={styles.primaryBtn} onClick={() => setOpen(true)}>
          <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
          Register company
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <i className="ti ti-search" aria-hidden="true" />
          <input
            className={styles.searchIn}
            placeholder="Search companies by name, purpose or contact…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>COMPANY</th>
              <th>PURPOSE</th>
              <th>CONTACT</th>
              <th>SITES</th>
              <th>USERS</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.empty}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className={styles.empty}>No companies yet</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.avatar}>
                        <i className="ti ti-building" style={{ fontSize: 17 }} aria-hidden="true" />
                      </span>
                      <div>
                        <div className={styles.uName}>{c.name}</div>
                        <div className={styles.uMeta}>{c.code}</div>
                      </div>
                    </div>
                  </td>
                  <td><div className={styles.actions}>{purposeChips(c.purposes)}</div></td>
                  <td>
                    <div className={styles.contact}>{c.contact_email}</div>
                    <div className={styles.contactSub}>{c.phone}</div>
                  </td>
                  <td className={styles.uName}>{c.sites}</td>
                  <td className={styles.uName}>{c.users}</td>
                  <td>
                    <span className={`${styles.statusPill} ${styles.stActive}`}>{c.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div className={styles.panelTitle}>Register company</div>
              <button className={styles.panelX} onClick={() => setOpen(false)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className={styles.panelBody}>
              <label className={styles.fLab}>COMPANY NAME</label>
              <input
                className={styles.fIn}
                placeholder="e.g. Acme Security Ltd"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />

              <label className={styles.fLab}>MAIN PURPOSE (select one or more)</label>
              <div className={styles.purps}>
                {PURPOSES.map((p) => {
                  const on = form.purposes.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      className={`${styles.purp} ${on ? styles.purpOn : ""}`}
                      style={on ? { background: p.color } : undefined}
                      onClick={() => togglePurpose(p.key)}
                    >
                      {p.key}
                    </button>
                  );
                })}
              </div>

              <label className={styles.fLab}>CONTACT EMAIL</label>
              <input
                className={styles.fIn}
                type="email"
                placeholder="ops@company.com"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              />

              <label className={styles.fLab}>PHONE NUMBER</label>
              <input
                className={styles.fIn}
                placeholder="+254 ..."
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />

              {error ? <div className={styles.err}>{error}</div> : null}

              <button className={styles.saveBtn} onClick={save}>
                Register company
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
