// app/OfflineIndicator.jsx
// A global "no internet" indicator, fixed at the bottom-right. Mounted once in
// the root layout so it shows on every page (login and app alike).
//
// Two detectors, because the browser's own `navigator.onLine` only knows whether
// the DEVICE has a network interface — not whether the internet/server is
// actually reachable (router up, WAN down):
//   1. The 'offline'/'online' window events — instant on a device-level drop.
//   2. A lightweight same-origin heartbeat every few seconds — catches the case
//      where the device thinks it's online but nothing actually gets through.
// Offline is shown the moment either says so; it clears as soon as a heartbeat
// succeeds again (and shows a brief "Back online" so the change is legible).
"use client";

import { useEffect, useRef, useState } from "react";

const HEARTBEAT_MS = 8000;   // how often to probe
const PROBE_TIMEOUT_MS = 5000;
const FAILS_TO_OFFLINE = 2;  // consecutive probe failures before we call it offline

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);      // assume online until proven otherwise
  const [justBack, setJustBack] = useState(false); // brief "Back online" flash
  const failsRef = useRef(0);
  const wasOfflineRef = useRef(false);
  const backTimer = useRef(null);

  useEffect(() => {
    let alive = true;

    function goOffline() {
      if (!alive) return;
      wasOfflineRef.current = true;
      setOnline(false);
    }
    function goOnline() {
      if (!alive) return;
      failsRef.current = 0;
      setOnline(true);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setJustBack(true);
        if (backTimer.current) clearTimeout(backTimer.current);
        backTimer.current = setTimeout(() => alive && setJustBack(false), 2500);
      }
    }

    // 1) Instant device-level events.
    const onOff = () => goOffline();
    const onOn = () => { /* verify with a probe rather than trusting the event */ probe(); };
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);

    // 2) Heartbeat probe — a tiny same-origin GET that fails fast when nothing
    //    is reachable. favicon is always present and cheap; cache is bypassed.
    async function probe() {
      if (typeof navigator !== "undefined" && navigator.onLine === false) { goOffline(); return; }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
      try {
        await fetch(`/favicon.ico?ping=${Date.now()}`, { method: "GET", cache: "no-store", signal: ctrl.signal });
        clearTimeout(t);
        goOnline();
      } catch {
        clearTimeout(t);
        failsRef.current += 1;
        if (failsRef.current >= FAILS_TO_OFFLINE) goOffline();
      }
    }

    // Seed from the current state, then run on a cadence.
    if (typeof navigator !== "undefined" && navigator.onLine === false) goOffline();
    probe();
    const id = setInterval(probe, HEARTBEAT_MS);

    return () => {
      alive = false;
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
      clearInterval(id);
      if (backTimer.current) clearTimeout(backTimer.current);
    };
  }, []);

  if (online && !justBack) return null;

  const offline = !online;
  const bg = offline ? "#DC2626" : "#10B981";
  const label = offline ? "No internet connection" : "Back online";
  const sub = offline ? "Trying to reconnect…" : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 20,
        bottom: 88, // sits above the floating speaker/buzzer button
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "min(92vw, 340px)",
        padding: "11px 14px",
        borderRadius: 12,
        background: bg,
        color: "#fff",
        boxShadow: "0 10px 30px rgba(15,23,42,0.28)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
        fontSize: 13.5,
        lineHeight: 1.35,
        animation: "agOfflineIn 160ms ease-out",
      }}
    >
      <style>{`@keyframes agOfflineIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes agPulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <i
        className={`ti ${offline ? "ti-wifi-off" : "ti-wifi"}`}
        aria-hidden="true"
        style={{ fontSize: 19, flex: "none", animation: offline ? "agPulse 1.4s ease-in-out infinite" : "none" }}
      />
      <div>
        <div style={{ fontWeight: 800 }}>{label}</div>
        {sub && <div style={{ fontWeight: 500, opacity: 0.92, fontSize: 12.5 }}>{sub}</div>}
      </div>
    </div>
  );
}
