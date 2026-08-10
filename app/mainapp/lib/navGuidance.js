// app/mainapp/lib/navGuidance.js
// Turn-by-turn navigation guidance for Track Device — the "blue speaker". This is
// SEPARATE from the alarm buzzer (alarmSound.js). Guidance is a short generated
// "ping" (Web Audio) followed by the spoken maneuver (SpeechSynthesis). Muting
// the blue speaker silences guidance without touching the alarm buzzer.

let muted = false;
let ctx = null;

function ensureCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  return ctx;
}

// A soft ascending two-tone "ping" — the generated guidance cue.
function ping() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  [[660, 0], [990, 0.14]].forEach(([f, t]) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = f;
    o.connect(g); g.connect(c.destination);
    const t0 = c.currentTime + t;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    o.start(t0); o.stop(t0 + 0.2);
  });
}

/** Speak a maneuver instruction (with a generated ping first). No-op if muted. */
export function announce(text) {
  if (muted || !text) return;
  ping();
  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.rate = 1; u.pitch = 1; u.volume = 1;
      window.speechSynthesis.speak(u);
    }
  } catch (e) { /* speech optional */ }
}

export function cancelGuidance() {
  try { if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
}

export function setGuidanceMuted(m) {
  muted = !!m;
  if (muted) cancelGuidance();
  else { const c = ensureCtx(); if (c && c.state === "suspended") c.resume().catch(() => {}); }
}
export function isGuidanceMuted() { return muted; }
