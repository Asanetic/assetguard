export async function runRegisteredAction(moduleActions, key, ctx) {
    const fn = moduleActions[key];
    if (!fn) {
      console.warn(`No action registered for "${key}"`);
      return;
    }
    return fn(ctx);
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