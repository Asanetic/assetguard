/**
 * Register real behavior here, once per action key. Both grid rowLinks
 * AND profile-level buttons (schema.profileActions) route through this
 * SAME registry — one place to add new behavior, works everywhere.
 *
 *   - rows   — array (bulk actions get every appliesTo-matched row;
 *              single-row actions from a dropdown/profile get [row])
 *   - schema — the full schema object (apiBase, entity, etc.)
 *   - router — Next.js router, present for single-row dropdown/profile
 *              actions (undefined for bulk toolbar actions) — use it to
 *              router.push() for anything that should navigate
 *
 * NOTE: "delete" and "clone" are intercepted directly by
 * useEntityFormController before they ever reach this registry — don't
 * register functions under those two keys, they will never fire.
 */


const registry = {
  sms_inactive: async (rows) => {
    const numbers = rows.map((r) => r.phone).filter(Boolean);
    await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numbers,
        message: 'This is a reminder that your subscription is inactive.',
      }),
    });
  },

  // Mutation example — single-row action from a grid dropdown OR a
  // profile button (schema.profileActions). Same function, same registry,
  // works from either place because both pass rows/schema/router identically.


  disable_account: async (rows, schema) => {
    alert(`toanisha disable_account -- ${rows[0].site_name}`);
  },

  filterByDate: async (rows, schema) => {
    alert(`toanisha filterByDate -- ${rows[0].site_name}`);
  },

  renewsub: async (rows, schema) => {
    alert(`renewsub -- ${rows[0].site_name}`);
  },

  // Navigation example — works from a grid dropdown OR a profile button.
  view_payment_history: (rows, schema, router) => {
    const row = rows[0];
    if (!row || !router) return;
    router.push(`/assetguard/payments?site_id=${row.record_id}`);
  },

  view_on_map: (rows, schema, router) => {
    const row = rows[0];
    if (!row || !router) return;
    router.push(`/assetguard/sites/map?site_id=${row.record_id}`);
  },

  // Add more as needed — export_selected, mark_paid, archive_all, etc.
};

export async function runRegisteredAction(key, rows, schema, router) {
  const fn = registry[key];
  if (!fn) {
    console.warn(`No action registered for "${key}"`);
    return;
  }
  return fn(rows, schema, router);
}

// ---- Normalize whatever a registered action returns into one shape, so
// runAction/runRowAction never hand back a mystery `undefined`.
export function normalizeActionResult(raw) {
  if (raw === false) return { ok: true, reload: false };
  if (raw && typeof raw === 'object') {
    return {
      ok: raw.ok !== false,
      message: raw.message,
      reload: raw.reload !== undefined ? !!raw.reload : raw.ok !== false,
      data: raw.data,
      navigateTo: raw.navigateTo,
    };
  }
  return { ok: true, reload: true };
}