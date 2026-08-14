// app/mainapp/notifications/components/Notifications.jsx
// Outgoing messages — who was alerted about each critical alarm, on which channel,
// and whether it was delivered. Layout follows the prototype's Notifications screen:
// four delivery stats, a by-channel breakdown, the configured providers, and the
// recent-notifications log (searchable + filterable). Email + SMS today; push &
// WhatsApp are shown as coming soon.
"use client";

import { useEffect, useState } from "react";
import styles from "./notifications.module.css";

function relTime(v) {
  if (!v) return "—";
  const t = new Date(v).getTime(); if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const dd = Math.round(h / 24); return dd === 1 ? "yesterday" : `${dd} days ago`;
}
function fmtEAT(v) {
  if (!v) return "";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " EAT"; }
  catch { return ""; }
}

// The four channels — email + sms live; push + whatsapp are planned.
const CHANNELS = [
  { key: "sms",      label: "SMS",      icon: "ti-message-2",     color: "#059669", live: true },
  { key: "email",    label: "Email",    icon: "ti-mail",          color: "#2E6CF5", live: true },
  { key: "whatsapp", label: "WhatsApp", icon: "ti-brand-whatsapp", color: "#25D366", live: false },
  { key: "push",     label: "Push",     icon: "ti-bell",          color: "#7C3AED", live: false },
];
// Status → pill. We don't have carrier delivery receipts, so a provider-accepted
// message is "Sent"; a provider rejection is "Not sent"; and when a site has no
// registered contacts we still log the event as "No contacts".
function statusPill(status) {
  if (status === "failed")     return { cls: "pFail", icon: "ti-alert-triangle", label: "Not sent" };
  if (status === "no_contact") return { cls: "pNone", icon: "ti-user-off",       label: "No contacts" };
  if (status === "pending")    return { cls: "pPend", icon: "ti-clock",          label: "Pending" };
  return { cls: "pSent", icon: "ti-check", label: "Sent" };
}
const NONE_CH = { label: "—", icon: "ti-user-off", color: "#94A3B8" };

export default function Notifications() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    try {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      if (channel) p.set("channel", channel);
      if (q.trim()) p.set("q", q.trim());
      const r = await fetch(`/api/mainapp/notifications?${p}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Failed to load"); return; }
      setData(j); setErr("");
    } catch { setErr("Network error"); } finally { setLoading(false); }
  }
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); /* eslint-disable-next-line */ }, [status, channel]);

  const rows = data?.notifications || [];
  const st = data?.stats || {};
  const chData = data?.channels || {};
  const providers = data?.providers || [];

  // Stat cards (today), summed from the log.
  const delivered = st.sent_today ?? 0;      // provider accepted
  const failed = st.failed_today ?? 0;       // provider rejected
  const noContact = st.nocontact_today ?? 0; // site had no recipients
  const totalToday = st.today ?? 0;
  const attempts = delivered + failed;
  const rate = attempts ? ((delivered / attempts) * 100).toFixed(1) : "0.0";

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Notifications</div>
          <div className={styles.sub}>Outgoing messages — every critical alarm is sent to all contacts registered on its site. Delivery &amp; failures across channels.</div>
        </div>
      </div>

      {/* delivery stats (today) */}
      <div className={styles.stats}>
        <Stat k="SENT TODAY" v={delivered.toLocaleString()} sub={`${rate}% of attempts`} icon="ti-circle-check" color="#059669" bg="#D1FAE5" />
        <Stat k="NOT SENT" v={failed} sub={failed ? "provider rejected" : "all clear"} icon="ti-alert-triangle" color="#DC2626" bg="#FEE2E2" warn={failed > 0} />
        <Stat k="NO CONTACTS" v={noContact} sub={noContact ? "site had no recipients" : "every alarm reached someone"} icon="ti-user-off" color="#B45309" bg="#FEF3C7" warn={noContact > 0} />
        <Stat k="TOTAL TODAY" v={totalToday.toLocaleString()} sub="all notification events" icon="ti-send" color="#2E6CF5" bg="#DBE7FE" />
      </div>

      {/* by channel */}
      <div className={styles.card}>
        <div className={styles.cardHead}>By channel</div>
        {CHANNELS.map((c, i) => {
          const d = chData[c.key] || { sent: 0, delivered: 0, failed: 0, pending: 0 };
          const pct = d.sent ? ((d.delivered / d.sent) * 100).toFixed(0) : 0;
          return (
            <div key={c.key} className={`${styles.chRow} ${i === CHANNELS.length - 1 ? styles.chLast : ""}`}>
              <span className={styles.chIcon} style={{ background: `${c.color}1a`, color: c.color }}><i className={`ti ${c.icon}`} /></span>
              <div className={styles.chMid}>
                <div className={styles.chName}>{c.label}{!c.live && <span className={styles.soon}>coming soon</span>}</div>
                <div className={styles.chBar}><div className={styles.chBarFill} style={{ width: `${pct}%`, background: c.color }} /></div>
              </div>
              <div className={styles.chNums}>
                {c.live ? (
                  <>
                    <b>{(d.sent || 0).toLocaleString()}</b> sent · <span className={styles.ok}>{(d.delivered || 0).toLocaleString()}</span> ok · <span className={styles.bad}>{d.failed || 0}</span> failed
                    <div className={styles.chPct}>{pct}% delivered</div>
                  </>
                ) : <span className={styles.chPlanned}>Planned — not yet sending</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* providers (real config) */}
      <div className={styles.card}>
        <div className={styles.cardHead}>Providers</div>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr>{["PROVIDER", "CHANNEL", "FROM / SENDER", "SENT TODAY", "STATUS"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.channel}>
                  <td className={styles.provName}>{p.name}</td>
                  <td>{p.channel}</td>
                  <td className={styles.muted2}>{p.from || "—"}</td>
                  <td><b>{(p.sentToday || 0).toLocaleString()}</b></td>
                  <td>{!p.configured
                    ? <span className={`${styles.pill} ${styles.pPend}`}>Not configured</span>
                    : p.enabled
                      ? <span className={`${styles.pill} ${styles.pSent}`}><i className="ti ti-check" />Active</span>
                      : <span className={`${styles.pill} ${styles.pOff}`}>Disabled</span>}
                  </td>
                </tr>
              ))}
              <tr><td className={styles.provName}>WhatsApp / Push</td><td>WhatsApp · Push</td><td className={styles.muted2}>—</td><td>—</td><td><span className={`${styles.pill} ${styles.pOff}`}>Coming soon</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className={styles.provHint}><i className="ti ti-info-circle" /> Configure Email &amp; SMS credentials under <a href="/mainapp/admin/messaging">Admin → Email &amp; SMS</a>.</div>
      </div>

      {/* recent notifications log */}
      <div className={styles.card}>
        <div className={styles.logHead}>
          <span className={styles.cardHeadInline}>Recent notifications</span>
          <div className={styles.controls}>
            <input className={styles.search} placeholder="Search recipient, name, site, device, alarm…" value={q}
                   onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
            <div className={styles.seg}>
              {["", "email", "sms"].map((c) => <button key={c || "all"} className={channel === c ? styles.segOn : ""} onClick={() => setChannel(c)}>{c ? (c === "sms" ? "SMS" : "Email") : "All"}</button>)}
            </div>
            <div className={styles.seg}>
              {[["", "All"], ["sent", "Sent"], ["failed", "Not sent"], ["no_contact", "No contacts"]].map(([s, lbl]) => <button key={s || "all"} className={status === s ? styles.segOn : ""} onClick={() => setStatus(s)}>{lbl}</button>)}
            </div>
          </div>
        </div>

        {loading && !data && <div className={styles.muted}>Loading…</div>}
        {err && <div className={styles.err}>{err}</div>}
        {!loading && rows.length === 0 && !err && <div className={styles.muted}>No notifications yet. They appear here as critical alarms are raised.</div>}

        {rows.length > 0 && (
          <div className={styles.tblWrap}>
            <table className={styles.tbl}>
              <thead><tr>{["TIME", "CHANNEL", "RECIPIENT", "EVENT", "STATUS"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((n) => {
                  const c = n.channel === "none" ? NONE_CH : (CHANNELS.find((x) => x.key === n.channel) || { label: n.channel, icon: "ti-send", color: "#94A3B8" });
                  const sp = statusPill(n.status);
                  return (
                    <tr key={n.id}>
                      <td className={styles.when} title={fmtEAT(n.created_at)}>{relTime(n.created_at)}</td>
                      <td><span className={styles.ch} style={{ color: c.color }}><i className={`ti ${c.icon}`} />{c.label}</span></td>
                      <td><div className={styles.recip}>{n.name || n.recipient}</div><div className={styles.recipSub}>{n.recipient}{n.role ? ` · ${n.role}` : ""}</div></td>
                      <td><a className={styles.alarmLink} href={n.alarm_id ? `/mainapp/alarms/${encodeURIComponent(n.alarm_id)}` : "#"}>{n.subject || n.alarm_id || "—"}</a><div className={styles.recipSub}>{n.site || ""}{n.device_id ? ` · ${n.device_id}` : ""}</div></td>
                      <td><span className={`${styles.pill} ${styles[sp.cls]}`} title={n.error || ""}><i className={`ti ${sp.icon}`} />{sp.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ k, v, sub, icon, color, bg, warn }) {
  return (
    <div className={`${styles.stat} ${warn ? styles.statWarn : ""}`}>
      <div className={styles.statBody}>
        <div className={styles.statK}>{k}</div>
        <div className={styles.statV}>{v}</div>
        <div className={styles.statSub}>{sub}</div>
      </div>
      <div className={styles.statIcon} style={{ background: bg, color }}><i className={`ti ${icon}`} /></div>
    </div>
  );
}
