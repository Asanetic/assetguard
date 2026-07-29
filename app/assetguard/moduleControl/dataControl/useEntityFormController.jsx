'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEntityController } from './useEntityController';
import { useFormEngine } from '../UiControl/FormEngine';
import { MosyAlertCard, MosyNotify, closeMosyModal } from '../../../MosyUtils/ActionModals';
// UI-only role gate — same convention as CompaniesGrid.jsx/EntityRowActionsMenu.jsx
import { mosyACTRLHasRole } from '../../../auth/authAccesControl';
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
export function useEntityFormController(schema, moduleActions, { id, onDone, redirectOnDelete } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  // Page-level gate — DynamicForm.jsx checks this before rendering
  // anything else, same idea as useEntityGridController's accessDenied.
  const accessDenied = schema.moduleRole ? !mosyACTRLHasRole(schema.moduleRole) : false;

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
    if (!id) return { ok: false };
    const result = await c.remove(atob(id));
    if (result?.ok) {
      onDone?.();
      if (redirectOnDelete) router.push(redirectOnDelete);
    }
    return result;
  }, [id, c, onDone, redirectOnDelete, router]);

  // Routes through the SAME actionsRegistry.js your grid's rowLinks
  // already use — one registry, one place to add "activate_account",
  // "disable_account", "send_reminder", etc.
  const runAction = useCallback(async (key) => {
    if (!record) return { ok: false, reload: false };
    const result = normalizeActionResult(await runRegisteredAction(moduleActions, key, {
      rows: [record],
      schema,
      router,
      refresh: async () => { if (id) setRecord(await c.getOne(id)); },
      create: c.create,
      update: c.update,
      remove: c.remove,
    }));
  
    if (result.reload && id) {
      const fresh = await c.getOne(id);
      setRecord(fresh);
    }
    if (result.navigateTo) router.push(result.navigateTo);
    return result;
  }, [record, schema, router, id, c]);

  const cloneRecord = useCallback(async () => {
    if (!record) return { ok: false };
    // Use the CURRENT form values, not the original fetched record — the
    // user may have edited fields in the form before clicking Clone, and
    // those edits should carry into the clone. System fields (primkey,
    // the entity's own id column) and computed display-only fields
    // (row_count) never belong in a create payload; exclude by checking
    // schema.fields' own system/computed flags rather than hardcoding
    // field names, so this stays correct for any schema.
    const excludedKeys = new Set(
      schema.fields.filter((f) => f.system || f.computed).map((f) => f.key)
    );
    const cloneable = Object.fromEntries(
      Object.entries(form.values).filter(([key]) => !excludedKeys.has(key))
    );
    const result = await c.create(cloneable);

    if (result?.ok && result?.id !== undefined && result?.id !== null) {
      // Clone creates a NEW record — the controller (and the URL's
      // dataNode param) need to switch over to it, same "fetch fresh +
      // sync the URL" sequence the Save path uses. Without this, the
      // form kept showing the just-cloned data but `id` still pointed at
      // the ORIGINAL record, so the next Save silently overwrote the
      // original instead of the clone.
      const freshToken = typeof window !== 'undefined' ? window.btoa(String(result.id)) : String(result.id);
      const fresh = await c.getOne(freshToken);
      if (fresh) setRecord(fresh);

      const dataNodeParam = `${schema.entity}_dataNode`;
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(dataNodeParam) !== freshToken) {
        params.set(dataNodeParam, freshToken);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }

      onDone?.();
    }

    return result;
  }, [record, form.values, schema, c, onDone, pathname, searchParams, router]);

  // ---- Resolved action buttons — schema.profileActions drives this.
  // Each entry is one of:
  //   { key: 'delete', confirm: '...' }  -> built-in: MosyAlertCard confirm + remove(), same as the grid's own delete flow (Entityroweventinterpreter.jsx) — no more window.confirm()
  //   { key: 'clone' }                   -> built-in: cloneRecord()
  //   { navigateTo: '/path' | fn }       -> pure navigation, no registry entry needed
  //   { key: '<anythingElse>' }          -> routes through actionsRegistry.js
  const actions = (schema.profileActions || [])
    .filter((a) => a.form) // only entries explicitly flagged for the profile/form toolbar
    .filter((a) => !a.editOnly || isEditing) // e.g. Delete/Clone only make sense once a record exists
    .filter((a) => !a.role || mosyACTRLHasRole(a.role)) // UI-only gate — no role required is the default, same as before this existed
    .map((a) => ({
      ...a,
      onClick: () => {
        if (a.key === 'delete') {
          MosyAlertCard({
            icon: 'trash',
            yesColor: 'danger',
            message: a.confirm || 'Are you sure you want to delete this record?',
            autoDismissOnClick: false,
            onYes: async () => {
              closeMosyModal('modal1');
              MosyNotify({ message: 'Sending delete request...', icon: 'send', addTimer: false });
              const result = await remove();
              MosyNotify({
                message: result?.message || (result?.ok ? 'Record deleted successfully' : 'Failed to delete record'),
                icon: result?.ok ? 'check-circle' : 'times-circle',
                iconColor: result?.ok ? 'text-success' : 'text-danger',
              });
            },
            onNo: () => closeMosyModal('modal1'),
          });
          return;
        }
        if (a.key === 'clone') {
          return cloneRecord().then((result) => {
            MosyNotify({
              message: result?.message || (result?.ok ? 'Record cloned successfully' : 'Failed to clone record'),
              icon: result?.ok ? 'check-circle' : 'times-circle',
              iconColor: result?.ok ? 'text-success' : 'text-danger',
            });
          });
        }
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
    accessDenied,
    submitLabel: isEditing ? 'Save Changes' : 'Proceed',
    schema,
    record,
    remove,
    runAction,
    cloneRecord,
    actions,
  };
}