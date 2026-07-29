'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEntityController } from './useEntityController';
import { useFormEngine } from '../uiControl/FormEngine';
import { MosyNotify } from '../../../MosyUtils/ActionModals';
import { runRegisteredAction, normalizeActionResult } from '../logicControl/actionsRegistry'; // export normalizeActionResult from EntityDataEngine.js, re-export or import directly — your call

// useEntityFormController — the ONE place profile/form behavior lives.
// Mirrors useEntityGridController: any UI template (DynamicForm, a modal,
// a downloaded profile layout) calls this and gets back bound field
// values, a submit handler, AND a resolved `actions` array — so buttons
// like Delete / Activate / Disable / View on map are fully data-driven
// from schema.profileActions. The template never hardcodes a single
// onClick; it just does:
//
//   {form.actions.map(a => (
//     <button key={a.key} className={`btn btn-${a.variant || 'secondary'}`} onClick={a.onClick}>
//       {a.icon && <i className={`fa fa-${a.icon} mr-1`} />}{a.label}
//     </button>
//   ))}
//
// Swap schema.profileActions and the SAME template renders a totally
// different button set — no template edits needed.
export function useEntityFormController(schema, { id, onDone, redirectOnDelete } = {}) {
  const router = useRouter();
  const c = useEntityController(schema);
  const [record, setRecord] = useState(null);
  const [fetching, setFetching] = useState(!!id);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) { setRecord(null); setFetching(false); return; }

    setFetching(true);
    setFetchError(null);
    c.getOne(id)
      .then((row) => { if (!cancelled) { setRecord(row); setFetching(false); } })
      .catch((err) => { if (!cancelled) { setFetchError(err.message); setFetching(false); } });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, schema.apiBase]);

  const form = useFormEngine(schema, record || {});
  const isEditing = !!id;

  // ---- Core create/update, unchanged from before ----
  const handleSubmit = async (values) => {
    const result = isEditing ? await c.update(id, values) : await c.create(values);

    
    if (result?.ok && result?.id !== undefined && result?.id !== null) {
      // getOne() sends whatever id you give it straight through as
      // `Node`, no encoding of its own — everywhere else that's called
      // with an already-base64 token (the URL's dataNode param). Both
      // create() AND update() return the RAW id the API just echoed
      // back (e.g. "31", not "MzE="), confirmed by the sample responses
      // — { sites_dataNode: 32 } on create, { sites_dataNode: "31" } on
      // update — so both need encoding here, not just create.
      const freshToken = typeof window !== 'undefined' ? window.btoa(String(result.id)) : String(result.id);
      const fresh = await c.getOne(freshToken);
      if (fresh) setRecord(fresh);
    }

    onDone?.();
    console.log('result handed back from create/update', result);

    return result;

  };

  // ---- Direct verbs — call these straight from any UI without going
  // through the resolved `actions` array below, e.g. prf.remove(),
  // prf.runAction('activate_account'). ----
  const remove = useCallback(async () => {
    if (!id) return;
    await c.remove(id);
    onDone?.();
    if (redirectOnDelete) router.push(redirectOnDelete);
  }, [id, c, onDone, redirectOnDelete, router]);

  // Routes through the SAME actionsRegistry.js your grid's rowLinks
  // already use — one registry, one place to add "activate_account",
  // "disable_account", "send_reminder", etc.
  const runAction = useCallback(async (key) => {
    if (!record) return { ok: false, reload: false };
    const result = normalizeActionResult(await runRegisteredAction(key, [record], schema, router));
  
    if (result.reload && id) {
      const fresh = await c.getOne(id);
      setRecord(fresh);
    }
    if (result.navigateTo) router.push(result.navigateTo);
    return result;
  }, [record, schema, router, id, c]);

  const cloneRecord = useCallback(async () => {
    if (!record) return;
    const { primkey, record_id, row_count, ...cloneable } = record;
    await c.create(cloneable);
    onDone?.();
  }, [record, c, onDone]);

  // ---- Resolved action buttons — schema.profileActions drives this.
  // Each entry is one of:
  //   { key: 'delete', confirm: '...' }  -> built-in: confirm() + remove()
  //   { key: 'clone' }                   -> built-in: cloneRecord()
  //   { navigateTo: '/path' | fn }       -> pure navigation, no registry entry needed
  //   { key: '<anythingElse>' }          -> routes through actionsRegistry.js
  const actions = (schema.profileActions || [])
    .filter((a) => !a.editOnly || isEditing) // e.g. Delete/Clone only make sense once a record exists
    .map((a) => ({
      ...a,
      onClick: () => {
        if (a.key === 'delete') {
          if (a.confirm && !window.confirm(a.confirm)) return;
          return remove();
        }
        if (a.key === 'clone') return cloneRecord();
        if (a.navigateTo) {
          const url = typeof a.navigateTo === 'function' ? a.navigateTo({ record, schema }) : a.navigateTo;
          return router.push(url);
        }
       
        return runAction(a.key).then((result) => {
          if (result?.message) {
            MosyNotify({
              message: result.message,
              icon: result.ok ? 'check-circle' : 'times-circle',
              iconColor: result.ok ? 'success' : 'danger',
              id: `profile-action-${a.key}`,
              addTimer: true,
              duration: result.ok ? 2500 : 4000,
            });
          }
        });

      },
    }));

  return {
    ...form,
    submit: () => form.submit(handleSubmit),
    isEditing,
    fetching,
    fetchError,
    submitLabel: isEditing ? 'Save Changes' : 'Add',
    schema,
    record,
    remove,
    runAction,
    cloneRecord,
    actions,
  };
}