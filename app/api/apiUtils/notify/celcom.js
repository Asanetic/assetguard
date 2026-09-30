// app/api/apiUtils/notify/celcom.js
// -----------------------------------------------------------------------------
// Celcom Africa bulk-SMS provider.  https://celcomafrica.com/developers
//
//   POST https://isms.celcomafrica.com/api/services/sendsms/
//   JSON { partnerID, apikey, mobile, message, shortcode, pass_type }
//   number format: 2547XXXXXXXX / 2541XXXXXXXX (no + and no spaces)
//   success: { responses: [ { "respose-code": 200, "response-description": "Success",
//                             mobile, messageid, networkid } ] }
//   error:   { "respose-code": 1006, "response-description": "Invalid credentials" }
//   (their field name really is the misspelled "respose-code" — we read both.)
//
// Config comes from the Email & SMS admin page (app_config → messaging/sms). The
// caller passes the saved config so this module never reads env/DB itself.
// -----------------------------------------------------------------------------

const DEFAULT_ENDPOINT = "https://isms.celcomafrica.com/api/services/sendsms/";

/** Kenyan MSISDN normaliser → 2547XXXXXXXX / 2541XXXXXXXX (digits only). */
export function toCelcomMsisdn(raw) {
  let n = String(raw || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (n.startsWith("0")) n = "254" + n.slice(1);        // 07.. / 01.. → 2547.. / 2541..
  else if (n.startsWith("7") || n.startsWith("1")) n = "254" + n; // bare 7.. / 1..
  return n;
}

const codeOf = (o) => Number(o?.["respose-code"] ?? o?.["response-code"] ?? o?.code);
const descOf = (o) => o?.["response-description"] ?? o?.["respose-description"] ?? o?.description ?? "";

/**
 * Send one SMS via Celcom Africa.
 * @param {string} to       recipient (any Kenyan format; normalised here)
 * @param {string} message  the text
 * @param {{endpoint?:string, apikey:string, partnerID:string, senderId:string}} cfg
 * @returns {Promise<{status:'success'|'failed', message?:string, messageId?:string|number, raw?:any}>}
 *   Contract matches mosySendSMS so it's a drop-in provider behind send-sms.js.
 */
export async function celcomSendSMS(to, message, cfg = {}) {
  const endpoint = (cfg.endpoint || cfg.apiUrl || DEFAULT_ENDPOINT).trim();
  const apikey = String(cfg.apikey ?? cfg.apiKey ?? "").trim();
  const partnerID = String(cfg.partnerID ?? cfg.partnerId ?? "").trim();
  const shortcode = String(cfg.senderId ?? cfg.shortcode ?? cfg.senderID ?? "").trim();

  if (!apikey || !partnerID || !shortcode) {
    return { status: "failed", message: "Celcom SMS not configured (need API key, partner ID and sender ID)" };
  }

  const body = {
    partnerID,
    apikey,
    mobile: toCelcomMsisdn(to),
    message: String(message ?? ""),
    shortcode,
    pass_type: "plain",
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch { data = await res.text().catch(() => null); }

    // Success is either wrapped { responses:[{...}] } or top-level {...}; the
    // message id may be `messageid` or `message-id` (a string like "WqSjRb4kKuC10AtH").
    const rec = Array.isArray(data?.responses) ? data.responses[0] : (data && typeof data === "object" ? data : null);
    const msgId = (o) => o?.messageid ?? o?.["message-id"] ?? o?.messageId ?? o?.msgid ?? null;
    if (rec) {
      const c = codeOf(rec);
      if (c === 200) return { status: "success", messageId: msgId(rec), raw: data };
      if (Number.isFinite(c)) return { status: "failed", message: descOf(rec) || `Celcom code ${c}`, raw: data };
    }
    if (!res.ok) return { status: "failed", message: `Celcom HTTP ${res.status}`, raw: data };
    // Unknown but 2xx — treat as sent, keep the payload for the log.
    return { status: "success", messageId: msgId(rec), raw: data };
  } catch (e) {
    return { status: "failed", message: e?.message || "Celcom request error" };
  }
}

// -----------------------------------------------------------------------------
// Delivery reports (DLR) and account balance.
// Celcom's docs give the endpoints + request params but NOT the response shape,
// so both parsers are deliberately tolerant and keep the raw payload for logging.
// -----------------------------------------------------------------------------

const DLR_ENDPOINT = "https://isms.celcomafrica.com/api/services/getdlr/";
const BALANCE_ENDPOINT = "https://isms.celcomafrica.com/api/services/getbalance/";

// Delivery-status strings this API family returns, mapped to our three states.
const DELIVERED_WORDS = /deliver|success|dlvrd|delivrd|received/i;
const FAILED_WORDS = /fail|undeliver|reject|expired|invalid|absent|blacklist|error/i;

// The human status string. Prefer the DESCRIPTION fields (Celcom returns e.g.
// "DeliveredToTerminal") over the numeric `delivery-status` code.
function dlrStatusString(o) {
  if (!o || typeof o !== "object") return "";
  const keys = ["delivery-description", "deliverydescription", "message-status", "messagestatus",
                "dlrdescription", "dlr-description", "delivery-status-desc",
                "response-description", "respose-description", "status-description"];
  for (const k of keys) if (o[k] != null && String(o[k]).trim() && isNaN(Number(o[k]))) return String(o[k]).trim();
  return "";
}

// Numeric delivery-status code → state. Celcom uses provider codes, not SMPP:
//   32 = DeliveredToTerminal (delivered). Intermediate codes (e.g. 8/16 =
//   DeliveredToNetwork / EnRoute) are still in transit. Everything else = failed.
function dlrCodeState(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return null;
  if (c === 32 || c === 1 || c === 2) return "delivered";       // delivered to terminal
  if (c === 8 || c === 16 || c === 4 || c === 6) return "pending"; // to-network / enroute / accepted
  return "failed";                                                // 64/128/etc → undelivered/expired/rejected
}

/**
 * Query the delivery status of one sent message.
 * @returns {Promise<{status:'delivered'|'failed'|'pending'|'unknown', detail?:string, raw?:any}>}
 */
export async function celcomDlr(cfg, messageId) {
  const endpoint = (cfg.dlrEndpoint || DLR_ENDPOINT).trim();
  const apikey = String(cfg.apikey ?? cfg.apiKey ?? "").trim();
  const partnerID = String(cfg.partnerID ?? cfg.partnerId ?? "").trim();
  if (!apikey || !partnerID || messageId == null) return { status: "unknown", detail: "not configured" };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ partnerID, apikey, messageID: String(messageId) }),
    });
    let data = null; try { data = await res.json(); } catch { data = null; }
    const rec = Array.isArray(data?.responses) ? data.responses[0] : data;
    // 1) The description string is authoritative: "DeliveredToTerminal" etc.
    //    Guard against the intermediate "DeliveredToNetwork" (reached the operator,
    //    not the handset) — that is NOT final delivery.
    const s = dlrStatusString(rec);
    const low = s.toLowerCase();
    if (s) {
      if (/network/.test(low) || /enroute|en-route|queue|submit|accepted|sent/.test(low)) {
        // in transit — fall through to code / pending
      } else if (/terminal|deliver|dlvrd|delivrd|received|success/.test(low)) {
        return { status: "delivered", detail: s, raw: data };
      } else if (FAILED_WORDS.test(low)) {
        return { status: "failed", detail: s, raw: data };
      }
    }
    // 2) Numeric code fallback (delivery-status: 32 = DeliveredToTerminal).
    const byCode = dlrCodeState(rec?.["delivery-status"] ?? rec?.["dlr-code"] ?? rec?.dlrcode ?? rec?.deliverystatus);
    if (byCode === "delivered") return { status: "delivered", detail: s || `code ${rec?.["delivery-status"]}`, raw: data };
    if (byCode === "failed") return { status: "failed", detail: s || `code ${rec?.["delivery-status"]}`, raw: data };
    return { status: "pending", detail: s || "no status yet", raw: data };
  } catch (e) {
    return { status: "unknown", detail: e?.message || "dlr error" };
  }
}

/**
 * Account SMS credit balance.
 * @returns {Promise<{balance:number|null, currency?:string, raw?:any}>}
 */
export async function celcomBalance(cfg) {
  const endpoint = (cfg.balanceEndpoint || BALANCE_ENDPOINT).trim();
  const apikey = String(cfg.apikey ?? cfg.apiKey ?? "").trim();
  const partnerID = String(cfg.partnerID ?? cfg.partnerId ?? "").trim();
  if (!apikey || !partnerID) return { balance: null };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ partnerID, apikey }),
    });
    let data = null; try { data = await res.json(); } catch { data = null; }
    const rec = Array.isArray(data?.responses) ? data.responses[0] : data;
    // Tolerant: credit / balance / sms_balance / smsbalance / credits, string or number.
    const raw = rec?.credit ?? rec?.balance ?? rec?.sms_balance ?? rec?.smsbalance ??
                rec?.credits ?? rec?.["credit-balance"] ?? null;
    const n = raw == null ? null : Number(String(raw).replace(/[^\d.\-]/g, ""));
    return { balance: Number.isFinite(n) ? n : null, currency: rec?.currency || null, raw: data };
  } catch (e) {
    return { balance: null, raw: { error: e?.message } };
  }
}
