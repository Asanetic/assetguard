// app/api/apiUtils/authUtils/alarmPerms.js
// Pure permission logic for the View Alarm actions — shared by the GET (to tell
// the client what it may do) and the ack/close routes (to enforce it). Decisions
// per claude/alarms-and-severity.md:
//   • Acknowledge SIDE is by company purpose: NOC => monitoring, Response =>
//     security. Admins act on the monitoring side. Each side acks independently.
//   • Close: monitoring NOC + admin/superadmin + managers/assistant managers.
//   • Track & respond: Response-company users + admins.
//   • Navigation directions: admin/superadmin only (responders auto-navigate).

const ADMIN = new Set(["admin", "superadmin"]);
const MANAGERS = new Set(["company_mgr", "asst_mgr"]);          // senior (non-admin) users
const SENIOR = new Set(["admin", "superadmin", "company_mgr", "asst_mgr"]);

export function alarmPerms({ role, purposes } = {}) {
  const r = String(role || "").toLowerCase();
  const p = (purposes || []).map((x) => String(x).toLowerCase());
  const isAdmin = ADMIN.has(r);
  const hasNOC = p.includes("noc");
  const hasResp = p.includes("response");
  // Company classification drives the ack side (matches the Companies admin):
  //   Response (or Response + NOC) => SECURITY company;  NOC only => MONITORING.
  const isSecurityCompany = hasResp;
  const isMonitoringCompany = hasNOC && !hasResp;
  const isNoc = r === "noc";
  const isSecRole = r === "field_resp" || r.startsWith("sec_");

  // Each user acknowledges for exactly ONE side, taken from their company — a
  // security-company user (incl. its NOC) always acks for Security, a monitoring-
  // company user for Monitoring. Only platform admins may choose either side.
  let canAckMonitoring = false, canAckSecurity = false;
  if (isAdmin) { canAckMonitoring = true; canAckSecurity = true; }
  else if (isSecurityCompany) { canAckSecurity = true; }
  else if (isMonitoringCompany) { canAckMonitoring = true; }
  else if (isSecRole) { canAckSecurity = true; }                 // no company purpose → role fallback
  else if (isNoc || MANAGERS.has(r)) { canAckMonitoring = true; }

  const canAck = canAckMonitoring || canAckSecurity;
  const canChooseSide = isAdmin;                                  // ONLY admins get the toggle
  const side = isAdmin ? "monitoring" : (canAckSecurity ? "security" : canAckMonitoring ? "monitoring" : null);

  // Belongs to the security side (security company OR security personnel). These
  // users see ONLY Critical alarms; non-Critical alarms are invisible to them and
  // handled by the monitoring company / admins / senior users instead.
  const isSecuritySide = isSecurityCompany || isSecRole;
  const criticalOnly = !isAdmin && isSecuritySide;

  return {
    side,
    canAck,
    canAckMonitoring,
    canAckSecurity,
    canChooseSide,
    isSecurityCompany,
    isSecuritySide,
    criticalOnly,
    // Close — admins, managers, and MONITORING-company NOC only.
    canClose: isAdmin || MANAGERS.has(r) || (isNoc && isMonitoringCompany),
    // Track & respond — field responders + admins; NOC personnel excluded.
    canRespond: isAdmin || (!isNoc && (hasResp || isSecRole)),
    canDirections: isAdmin,
  };
}

export const ACK_FINDINGS = [
  "Verified on camera — no intrusion",
  "Contacting the site now",
  "Team dispatched",
  "Known works on site",
  "Suspected false alarm",
  "Device fault — raising a ticket",
];
