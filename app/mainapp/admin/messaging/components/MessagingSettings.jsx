// app/mainapp/admin/messaging/components/MessagingSettings.jsx
// Email & SMS settings — edit the SMTP email transport and the SMS API from one
// admin page. Ships with the values the app uses today (Gmail SMTP + Asanetic
// SMS) as editable defaults; changes persist server-side and are audited.
//
// Secrets (SMTP password, SMS API key) are never sent back to the browser — the
// fields show a "leave blank to keep current" placeholder and only overwrite the
// stored secret when you type a new value.
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./messaging.module.css";

const EMAIL_FALLBACK = {
  enabled: true, host: "smtp.gmail.com", port: 465,
  user: "AssetGuard@Symphony.Co.Ke", fromName: "AssetGuard",
  fromEmail: "AssetGuard@Symphony.Co.Ke", passwordSet: false,
};
const SMS_FALLBACK = {
  enabled: true, provider: "Asanetic", apiUrl: "https://asanetic.com/sms/sendsms",
  senderId: "", apiKeySet: false,
};

export default function MessagingSettings() {
  const [email, setEmail] = useState(EMAIL_FALLBACK);
  const [sms, setSms] = useState(SMS_FALLBACK);
  const [emailPass, setEmailPass] = useState(""); // only sent if typed
  const [smsKey, setSmsKey] = useState("");        // only sent if typed
  const [showPass, setShowPass] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState({ text: "", tone: "" });
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const [emailTo, setEmailTo] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [emailTest, setEmailTest] = useState({ state: "idle", msg: "" });
  const [smsTest, setSmsTest] = useState({ state: "idle", msg: "" });

  function flashToast(t) {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/mainapp/messaging-config", { cache: "no-store" });
        if (res.ok) {
          const { config } = await res.json();
          if (alive && config) {
            if (config.email) setEmail((e) => ({ ...e, ...config.email }));
            if (config.sms) setSms((s) => ({ ...s, ...config.sms }));
          }
        }
      } catch { /* keep fallback defaults */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  const setE = (k, v) => setEmail((e) => ({ ...e, [k]: v }));
  const setS = (k, v) => setSms((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true); setSaveNote({ text: "", tone: "" });
    try {
      const payload = {
        email: {
          enabled: email.enabled, host: email.host, port: Number(email.port),
          user: email.user, fromName: email.fromName, fromEmail: email.fromEmail,
          ...(emailPass.trim() ? { pass: emailPass } : {}),
        },
        sms: {
          enabled: sms.enabled, provider: sms.provider, apiUrl: sms.apiUrl, senderId: sms.senderId,
          ...(smsKey.trim() ? { apiKey: smsKey } : {}),
        },
      };
      const res = await fetch("/api/mainapp/messaging-config", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.config?.email) setEmail((e) => ({ ...e, ...data.config.email }));
      if (data.config?.sms) setSms((s) => ({ ...s, ...data.config.sms }));
      setEmailPass(""); setSmsKey("");
      setSaveNote({ text: "Saved — notifications now use these settings.", tone: "ok" });
      flashToast("Messaging settings saved");
    } catch (err) {
      setSaveNote({ text: err.message || "Save failed", tone: "err" });
    } finally { setSaving(false); }
  }

  async function sendTest(channel) {
    const to = channel === "email" ? emailTo : smsTo;
    const setT = channel === "email" ? setEmailTest : setSmsTest;
    if (!to.trim()) { setT({ state: "err", msg: "Enter a recipient first." }); return; }
    setT({ state: "loading", msg: "Sending…" });
    try {
      const config = channel === "email"
        ? { enabled: email.enabled, host: email.host, port: Number(email.port), user: email.user,
            fromName: email.fromName, fromEmail: email.fromEmail, ...(emailPass.trim() ? { pass: emailPass } : {}) }
        : { enabled: sms.enabled, provider: sms.provider, apiUrl: sms.apiUrl, senderId: sms.senderId,
            ...(smsKey.trim() ? { apiKey: smsKey } : {}) };
      const res = await fetch("/api/mainapp/messaging-config/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to: to.trim(), config }),
      });
      const data = await res.json();
      if (data.status === "success") setT({ state: "ok", msg: data.message || "Sent." });
      else setT({ state: "err", msg: data.message || data.error || "Failed to send." });
    } catch (err) {
      setT({ state: "err", msg: err.message || "Failed to send." });
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Email &amp; SMS</div>
          <div className={styles.sub}>Configure how AssetGuard sends notifications — SMTP email and the SMS API</div>
        </div>
      </div>

      {/* EMAIL / SMTP */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#dbe7fe", color: "#2e6cf5" }}><i className="ti ti-mail" /></span>
          Email (SMTP)
          <span className={styles.cardHActions}>
            <span className={`${styles.pill} ${email.enabled ? styles.pillOn : styles.pillOff}`}>
              <span className={styles.dot} style={{ background: email.enabled ? "#059669" : "#94a3b8" }} />
              {email.enabled ? "Enabled" : "Disabled"}
            </span>
          </span>
        </div>
        <div className={styles.cardSub}>Outbound email transport. Defaults to Gmail / Google Workspace SMTP.</div>

        <div className={styles.g3}>
          <div className={styles.field}>
            <label className={styles.lab}>SMTP HOST</label>
            <input className={styles.in} value={email.host} onChange={(e) => setE("host", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>PORT <span className={styles.labHint}>465 SSL · 587 TLS</span></label>
            <input className={styles.in} value={email.port} onChange={(e) => setE("port", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>STATUS</label>
            <label className={styles.switch} style={{ height: 40 }}>
              <input type="checkbox" checked={!!email.enabled} onChange={(e) => setE("enabled", e.target.checked)} />
              Sending enabled
            </label>
          </div>
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>SMTP USERNAME</label>
            <input className={styles.in} value={email.user} onChange={(e) => setE("user", e.target.value)} autoComplete="off" />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>SMTP PASSWORD <span className={styles.labHint}>Gmail app password</span></label>
            <div className={styles.keyRow}>
              <input className={`${styles.in} ${styles.mono}`} type={showPass ? "text" : "password"}
                placeholder={email.passwordSet ? "•••••••••• (leave blank to keep current)" : "Enter app password"}
                value={emailPass} onChange={(e) => setEmailPass(e.target.value)} autoComplete="new-password" spellCheck={false} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass((s) => !s)} aria-label={showPass ? "Hide" : "Show"}>
                <i className={showPass ? "ti ti-eye-off" : "ti ti-eye"} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>FROM NAME</label>
            <input className={styles.in} value={email.fromName} onChange={(e) => setE("fromName", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>FROM EMAIL</label>
            <input className={styles.in} value={email.fromEmail} onChange={(e) => setE("fromEmail", e.target.value)} />
          </div>
        </div>

        <div className={styles.help}>
          For Gmail / Workspace, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">app password</a>
          {" "}(not the account password) as the SMTP password, with 2-Step Verification on. Host <code>smtp.gmail.com</code>, port <code>465</code>.
        </div>

        <div className={styles.testWrap}>
          <div className={styles.testRow}>
            <div className={styles.field}>
              <label className={styles.lab}>SEND A TEST EMAIL TO</label>
              <input className={styles.in} placeholder="you@example.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
            </div>
            <button type="button" className={styles.btnGhost} style={{ height: 40, padding: "0 16px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
              onClick={() => sendTest("email")} disabled={emailTest.state === "loading"}>
              {emailTest.state === "loading" ? "Sending…" : "Send test email"}
            </button>
          </div>
          {emailTest.msg ? <div className={`${styles.testMsg} ${emailTest.state === "ok" ? styles.testOk : emailTest.state === "err" ? styles.testErr : ""}`}>{emailTest.msg}</div> : null}
        </div>
      </div>

      {/* SMS */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#d1fae5", color: "#059669" }}><i className="ti ti-message-2" /></span>
          SMS API
          <span className={styles.cardHActions}>
            <span className={`${styles.pill} ${sms.enabled ? styles.pillOn : styles.pillOff}`}>
              <span className={styles.dot} style={{ background: sms.enabled ? "#059669" : "#94a3b8" }} />
              {sms.enabled ? "Enabled" : "Disabled"}
            </span>
          </span>
        </div>
        <div className={styles.cardSub}>Outbound SMS gateway. Defaults to the Asanetic SMS API.</div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>PROVIDER</label>
            <input className={styles.in} value={sms.provider} onChange={(e) => setS("provider", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>STATUS</label>
            <label className={styles.switch} style={{ height: 40 }}>
              <input type="checkbox" checked={!!sms.enabled} onChange={(e) => setS("enabled", e.target.checked)} />
              Sending enabled
            </label>
          </div>
        </div>

        <div className={styles.field} style={{ marginBottom: 10 }}>
          <label className={styles.lab}>API ENDPOINT URL</label>
          <input className={`${styles.in} ${styles.mono}`} value={sms.apiUrl} onChange={(e) => setS("apiUrl", e.target.value)} />
        </div>

        <div className={styles.g2}>
          <div className={styles.field}>
            <label className={styles.lab}>API KEY / TOKEN <span className={styles.labHint}>sent as “pushsms”</span></label>
            <div className={styles.keyRow}>
              <input className={`${styles.in} ${styles.mono}`} type={showKey ? "text" : "password"}
                placeholder={sms.apiKeySet ? "•••••••••• (leave blank to keep current)" : "Optional — leave blank if IP-whitelisted"}
                value={smsKey} onChange={(e) => setSmsKey(e.target.value)} autoComplete="off" spellCheck={false} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowKey((s) => !s)} aria-label={showKey ? "Hide" : "Show"}>
                <i className={showKey ? "ti ti-eye-off" : "ti ti-eye"} />
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>SENDER ID <span className={styles.labHint}>optional</span></label>
            <input className={styles.in} placeholder="e.g. ASSETGUARD" value={sms.senderId} onChange={(e) => setS("senderId", e.target.value)} />
          </div>
        </div>

        <div className={styles.help}>
          The current gateway posts <code>recp</code> (number) and <code>body</code> (message) form fields; the API key rides in <code>pushsms</code>.
          If your Asanetic account authenticates by whitelisted server IP, you can leave the key blank.
        </div>

        <div className={styles.testWrap}>
          <div className={styles.testRow}>
            <div className={styles.field}>
              <label className={styles.lab}>SEND A TEST SMS TO</label>
              <input className={styles.in} placeholder="+2547XXXXXXXX" value={smsTo} onChange={(e) => setSmsTo(e.target.value)} />
            </div>
            <button type="button" className={styles.btnGhost} style={{ height: 40, padding: "0 16px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
              onClick={() => sendTest("sms")} disabled={smsTest.state === "loading"}>
              {smsTest.state === "loading" ? "Sending…" : "Send test SMS"}
            </button>
          </div>
          {smsTest.msg ? <div className={`${styles.testMsg} ${smsTest.state === "ok" ? styles.testOk : smsTest.state === "err" ? styles.testErr : ""}`}>{smsTest.msg}</div> : null}
        </div>
      </div>

      {/* SAVE */}
      <div className={`${styles.card} ${styles.saveBar}`}>
        <span className={`${styles.saveNote} ${saveNote.tone === "ok" ? styles.saveOk : saveNote.tone === "err" ? styles.saveErr : ""}`}>
          {saveNote.text || (loaded ? "Changes apply to every email and SMS the platform sends." : "Loading…")}
        </span>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
