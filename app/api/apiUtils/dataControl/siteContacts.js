// app/api/apiUtils/dataControl/siteContacts.js
// Resolve a site's autofill contacts from the COMPANY records:
//   - client company    <- the single company holding the "Client" purpose
//   - security company   <- the company a site is assigned to (by name), with its
//                           national Manager + one Assistant (no regional tier)
//   - monitoring company <- likewise, for the NOC side
//
// Contacts live on the company (manager + 2 assistants). A site inherits them
// live: edit the company once and every site assigned to it picks up the change
// with no per-site edit. This replaces the older region/Users-based cascade.

import {
  getClientCompany,
  getCompanyContactsByName,
  getSiteCompanyDirectory,
} from "./companies.js";

/** Normalise a stored company contact { name, phones, emails } for the UI. */
function asContact(p) {
  if (!p) return null;
  const name = String(p.name || "").trim();
  const phones = Array.isArray(p.phones) ? p.phones : (p.phones ? [p.phones] : []);
  const emails = Array.isArray(p.emails) ? p.emails : (p.emails ? [p.emails] : []);
  if (!name && !phones.length && !emails.length) return null;
  return { name, phones, emails };
}

/** A security company's national staffing (Manager + 2 Assistants) from its record. */
export async function resolveSecurityCompany(name) {
  if (!name) return { company: "", manager: null, assistant: null, assistant2: null, staffed: false };
  const co = await getCompanyContactsByName(name);
  const c = co?.contacts || {};
  const manager = asContact(c.manager);
  const assistant = asContact(c.assistant1);
  const assistant2 = asContact(c.assistant2);
  return {
    company: co?.name || name,
    manager,
    assistant,
    assistant2,
    staffed: !!(manager || assistant || assistant2),
  };
}

/**
 * Everything the Add/View-site forms autofill: the client company, the list of
 * registered security & monitoring companies (for the dropdowns), and — when a
 * security company is already assigned — its inherited national contacts.
 */
export async function resolveSiteContacts(securityCompany) {
  const [client, dir, security] = await Promise.all([
    getClientCompany(),
    getSiteCompanyDirectory(),
    resolveSecurityCompany(securityCompany || ""),
  ]);
  return {
    client: client
      ? {
          name: client.name,
          manager: asContact(client.contacts?.manager),
          assistant1: asContact(client.contacts?.assistant1),
          assistant2: asContact(client.contacts?.assistant2),
        }
      : null,
    securityCompanies: dir.security,      // [{ name, contacts }]
    monitoringCompanies: dir.monitoring,  // [{ name, contacts }]
    security,                             // { company, manager, assistant, staffed }
  };
}
