/**
 * Register real behavior here, once per action key.
 * The UI never calls these directly — it just says "run action X",
 * and the controller looks it up here.
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

  // Add more as needed — export_selected, mark_paid, archive_all, etc.
};

export async function runRegisteredAction(key, rows, schema) {
  const fn = registry[key];
  if (!fn) {
    console.warn(`No action registered for "${key}"`);
    return;
  }
  return fn(rows, schema);
}
