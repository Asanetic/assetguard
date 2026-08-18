// app/mainapp/ports/parse-errors/components/ParseErrors.jsx
// The frames that failed to parse — malformed or unknown-format packets — with
// the raw bytes and the parser's error, newest first. Self-contained styling so
// it drops in without touching the ports page layout.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function fmt(iso) { try { return new Date(iso).toLocaleString(); } catch { return "—"; } }

export default function ParseErrors() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const t = useRef(null);

  async function load() {
    try {
      const r = await fetch("/api/mainapp/ports/parse-errors?limit=500", { cache: "no-store" });
      if (r.ok) setRows((await r.json()).errors || []);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); t.current = setInterval(load, 5000); return () => clearInterval(t.current); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.device || ""} ${r.data || ""} ${r.error || ""} ${r.port || ""}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div style={S.page}>
      <div>
        <div style={S.title}>Parse errors</div>
        <div style={S.sub}>Frames that could not be parsed — malformed or unknown format</div>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <input style={S.search} placeholder="Search device, payload, error…" value={q} onChange={(e) => setQ(e.target.value)} />
          <a style={S.back} href="/mainapp/ports">← Back to ports</a>
        </div>
        <div style={S.count}>{filtered.length}{q ? ` of ${rows.length}` : ""} error{filtered.length === 1 ? "" : "s"}</div>

        <div style={S.list}>
          {loading && rows.length === 0 && <div style={S.empty}>Loading…</div>}
          {!loading && filtered.length === 0 && <div style={S.empty}>No parse errors. 🎉</div>}
          {filtered.map((r) => (
            <div key={r.id} style={S.row}>
              <div style={S.meta}>
                <span style={S.time}>{fmt(r.received_at)}</span>
                <span style={S.port}>:{r.port ?? "—"}</span>
                <span style={S.dev}>{r.device || "unknown device"}</span>
                {r.src_ip ? <span style={S.ip}>{r.src_ip}{r.src_port ? `:${r.src_port}` : ""}</span> : null}
              </div>
              {r.error ? <div style={S.err}>{r.error}</div> : null}
              <div style={S.data}>{r.data}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 },
  title: { fontSize: 22, fontWeight: 800, color: "#0F274A" },
  sub: { fontSize: 13, color: "#64748B", marginTop: 2 },
  card: { background: "#fff", border: "1px solid #EEF2F7", borderRadius: 14, padding: "18px 20px" },
  search: { flex: "1 1 260px", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 },
  back: { color: "#2E6CF5", fontSize: 13, fontWeight: 700, textDecoration: "none" },
  count: { fontSize: 12, color: "#94A3B8", margin: "10px 0" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: { border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 12px", background: "#FafBfc" },
  meta: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12 },
  time: { color: "#64748B", fontWeight: 600 },
  port: { color: "#2E6CF5", fontWeight: 700 },
  dev: { color: "#0F274A", fontWeight: 700 },
  ip: { color: "#94A3B8" },
  err: { marginTop: 6, fontSize: 12.5, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 8px", display: "inline-block" },
  data: { marginTop: 6, fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: "#334155", wordBreak: "break-all" },
  empty: { color: "#94A3B8", textAlign: "center", padding: 24, fontSize: 13 },
};
