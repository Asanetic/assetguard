// app/mainapp/request-access/components/RequestAccessForm.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./request-access.module.css";

const COMPANIES = [
  "Symphony Technologies Limited",
  "Acme Logistics Ltd",
  "Savanna Freight Co.",
  "Twiga Distributors",
  "Baraka Motors Group",
];

export default function RequestAccessForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", note: "" });
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const required = ["name", "email", "phone", "company", "note"];
    if (required.some((k) => !String(form[k]).trim())) return setMsg("Fill in all required fields");
    setMsg("");
    setSending(true);
    try {
      const res = await fetch("/api/mainapp/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: "+254" + form.phone.replace(/\s+/g, "").replace(/^0+/, ""),
          company: form.company,
          problem: form.note.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setSending(false); return setMsg(d.error || "Could not send your request"); }
      setDone(true);
      setTimeout(() => router.push("/mainapp/login"), 1800);
    } catch {
      setSending(false);
      setMsg("Network error. Please try again.");
    }
  }

  return (
    <section className={styles.formPanel}>
      <form className={styles.formInner} onSubmit={submit} noValidate>
        <div className={styles.title}>Request access</div>
        <div className={styles.sub}>Send a request and your administrator will set up your account</div>

        <div className={styles.field}>
          <label className={styles.lab} htmlFor="agcName">Full name <span className={styles.req}>*</span></label>
          <input className={styles.in} id="agcName" type="text" placeholder="Jane Wanjiku"
            value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>

        <div className={styles.field}>
          <label className={styles.lab} htmlFor="agcEmail">Work email <span className={styles.req}>*</span></label>
          <input className={styles.in} id="agcEmail" type="email" placeholder="jane@symphony.com"
            value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>

        <div className={styles.field}>
          <label className={styles.lab} htmlFor="agcPhone">Phone number <span className={styles.req}>*</span></label>
          <div className={styles.phoneRow}>
            <span className={styles.phonePrefix}>
              +254 <i className="ti ti-chevron-down" style={{ fontSize: 14 }} aria-hidden="true" />
            </span>
            <input className={styles.in} id="agcPhone" type="tel" inputMode="tel" placeholder="712 345 678"
              style={{ flex: 1, width: "auto" }} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.lab} htmlFor="agcCo">Company <span className={styles.req}>*</span></label>
          <select className={styles.in} id="agcCo" value={form.company} onChange={(e) => set("company", e.target.value)}>
            <option value="">Select your company</option>
            {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.field18}>
          <label className={styles.lab} htmlFor="agcNote">What is stopping you from registering? <span className={styles.req}>*</span></label>
          <textarea className={`${styles.in} ${styles.textarea}`} id="agcNote"
            placeholder="Describe the problem — e.g. my phone number failed to verify, the email code never arrived, or my company is not on the list"
            value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>

        {msg ? <div className={styles.msg}>{msg}</div> : null}

        <button className={`${styles.submit} ${done ? styles.submitOk : ""}`} type="submit" disabled={sending || done}>
          {done ? "Request sent" : sending ? "Sending…" : "Send request"}
        </button>

        <div className={styles.divider}>
          <div className={styles.dividerTitle}>Or reach the administrator directly</div>
          <div className={styles.adminRow}>
            <span className={styles.chip} style={{ background: "#FEF3C7", color: "#B45309" }}>
              <i className="ti ti-mail" style={{ fontSize: 15 }} aria-hidden="true" />
            </span>
            <span className={styles.adminText}>admin@symphony.com</span>
          </div>
          <div className={styles.adminRow}>
            <span className={styles.chip} style={{ background: "#D1FAE5", color: "#047857" }}>
              <i className="ti ti-phone" style={{ fontSize: 15 }} aria-hidden="true" />
            </span>
            <span className={styles.adminText}>+254 700 123 456</span>
          </div>
        </div>

        <div className={styles.loginRow}>
          Already have an account?{" "}
          <button type="button" className={styles.loginLink} onClick={() => router.push("/mainapp/login")}>Log in</button>
        </div>

        <div className={styles.secured}>
          <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" /> Secured by Symphony Technologies Limited — AssetGuard v1.0
        </div>
      </form>
    </section>
  );
}
