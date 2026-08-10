// app/mainapp/lib/alarmSound.js
// The AssetGuard alarm buzzer — synthesised with the Web Audio API exactly as in
// the prototype (agAlarmTone): a single square oscillator whose frequency
// alternates between two notes (880 / 620 Hz) every half-second — the classic
// two-note alert. Nothing plays until the person has clicked something, because
// no browser allows sound before that.

const AG_SOUND = { ctx: null, node: null, on: false };

/** Turn the two-tone alarm on (true) or off (false). Returns the resulting state. */
export function agAlarmTone(on) {
  try {
    if (on) {
      if (AG_SOUND.on) return true;
      const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      AG_SOUND.ctx = AG_SOUND.ctx || new AC();
      if (AG_SOUND.ctx.state === "suspended") AG_SOUND.ctx.resume();
      const ctx = AG_SOUND.ctx;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "square";
      gain.gain.value = 0.0001;                       // eased in, never a click
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.05);
      // two notes, half a second each — recognisable as an alarm without being
      // painful over a long shift
      const hi = 880, lo = 620;
      let t = 0;
      AG_SOUND.node = { osc, gain, timer: setInterval(() => {
        t++; osc.frequency.setValueAtTime(t % 2 ? lo : hi, ctx.currentTime);
      }, 500) };
      osc.frequency.setValueAtTime(hi, ctx.currentTime);
      AG_SOUND.on = true;
      return true;
    }
    if (!AG_SOUND.on) return false;
    const n = AG_SOUND.node;
    if (n) {
      clearInterval(n.timer);
      try {
        n.gain.gain.exponentialRampToValueAtTime(0.0001, AG_SOUND.ctx.currentTime + 0.08);
        n.osc.stop(AG_SOUND.ctx.currentTime + 0.1);
      } catch (e) { /* already stopped */ }
    }
    AG_SOUND.node = null; AG_SOUND.on = false;
    return false;
  } catch (e) { return false; }
}

// Thin wrappers so callers read naturally; the behaviour is the prototype's.
export function startAlarmSound() { agAlarmTone(true); }
export function stopAlarmSound() { agAlarmTone(false); }
export function resumeAudio() {
  try {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    AG_SOUND.ctx = AG_SOUND.ctx || new AC();
    if (AG_SOUND.ctx.state === "suspended") AG_SOUND.ctx.resume();
  } catch (e) { /* ignore */ }
}
export function isAlarmPlaying() { return AG_SOUND.on; }
