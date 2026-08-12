// app/mainapp/lib/ackView.js
// Per-side acknowledge view for the alarm list + map — mirrors the profile logic.
// The Acknowledge button and the status a viewer SEES depend on THEIR side:
//   • A monitoring-company user sees the alarm as needing acknowledgement (and can
//     click Acknowledge) until the MONITORING side has acked — regardless of the
//     security side, which is invisible to them. And vice-versa.
//   • Admins (both sides) see it acknowledged only once both sides have acked.
export function ackView(alarm, viewer = {}) {
  if (alarm.status === "Closed") return { status: "Closed", canAck: false, acked: true };
  const monAck = !!alarm.ack_monitoring_at;
  const secAck = !!alarm.ack_security_at;

  // The security company only handles Critical alarms; on lower tiers the security
  // side doesn't apply, so only the monitoring side counts.
  const critical = alarm.priority === "Critical";

  const sides = [];
  if (viewer.canAckMonitoring) sides.push("monitoring");
  if (viewer.canAckSecurity && critical) sides.push("security");

  if (!sides.length) {
    // Viewer can't acknowledge (no side) — show a neutral status, no button.
    const anyAck = monAck || secAck;
    return { status: anyAck ? "Acknowledged" : "Open", canAck: false, acked: anyAck };
  }

  const mineAcked = sides.every((s) => (s === "monitoring" ? monAck : secAck));
  const canAck = sides.some((s) => (s === "monitoring" ? !monAck : !secAck));
  return { status: mineAcked ? "Acknowledged" : "Open", canAck, acked: mineAcked };
}
