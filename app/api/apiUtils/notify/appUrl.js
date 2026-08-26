// app/api/apiUtils/notify/appUrl.js
// The public base URL used in outbound links (alarm "Open the alarm", account
// login, credentials). NEVER localhost in production: prefer an explicit env
// (APP_URL / NEXT_PUBLIC_APP_URL), otherwise the org's configured domain, and
// only fall back to the known production host — so links in emails/SMS are real.
import { getOrgConfig } from "../dataControl/appConfig.js";

const PROD_FALLBACK = "https://assetguard.symphony.co.ke";

function normalize(u) {
  let s = String(u || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

/** Resolve the public base URL (no trailing slash). Async — reads org config. */
export async function getAppBaseUrl() {
  const env = normalize(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "");
  if (env && !/localhost|127\.0\.0\.1/i.test(env)) return env;
  try {
    const org = await getOrgConfig();
    const d = normalize(org?.domain);
    if (d && !/localhost|127\.0\.0\.1/i.test(d)) return d;
  } catch { /* fall through */ }
  return PROD_FALLBACK;
}
