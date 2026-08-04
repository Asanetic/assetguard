'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEntityController } from './useEntityController';
import { exportTableToExcel } from '../../../MosyUtils/exportToExcel';
import { mosyPrintToPdf, mosyTonum, deleteUrlParam } from '../../../MosyUtils/hiveUtils';
import { MosyNotify } from '../../../MosyUtils/ActionModals';
// UI-only page-level gate — same convention as the per-action role checks
// in CompaniesGrid.jsx/useEntityFormController.jsx/EntityRowActionsMenu.jsx
import { mosyACTRLHasRole } from '../../../auth/authAccesControl';
// Same URL-driven filter engine the legacy lists used — lives in this
// same folder (DataControl/dataControl — same folder, inconsistent
// casing across the codebase, harmless on Windows/XAMPP).
import { MosySecureFilterEngine } from '../../DataControl/MosyFilterEngine';
// Same registry useEntityFormController reads for schema.profileActions
// — grid-level actions (toolbar, profileActions flagged grid:true, row
// actions, checkbox bulk actions) ALL route through this ONE registry
// now too, so a 'type: action' key behaves identically no matter which
// button it's clicked from. Adjust the relative path if this app's
// logicControl folder sits somewhere else relative to dataControl/.
import { runRegisteredAction, normalizeActionResult } from '../logicControl/actionsRegistry';
// Row-level select_<entity>/delete_<entity> event routing — lives in
// UiControl as a sibling folder to this one.
import { interpretEntityRowEvent } from '../UiControl/Entityroweventinterpreter';

// ════════════════════════════════════════════════════════════════
// useEntityGridController — the ONE place ALL grid BEHAVIOR lives, full
// stop. Not just data-fetching plumbing (that's useEntityController) —
// search, refresh, export, print, pagination, visible fields, URL-driven
// filter scoping, checkbox selection + bulk actions, toolbar actions,
// grid-surfaced profile actions (Add New/Import/etc), row actions, row
// events, and sub-grid "View more" link building.
//
// The point: a template component (SmartGrid.jsx, or a totally different
// Dribbble-sourced card/kanban/whatever layout) should need NOTHING but
//   const g = useEntityGridController(schema, { fixedQuery, title,
//     description, moduleActions, dataOut });
// and then pure markup wiring everything below to onClick/onChange/value
// props. If a template needs to import actionsRegistry, MosyNotify,
// MosySecureFilterEngine, or useRouter directly to get a feature working,
// that's a sign the feature leaked out of this hook and belongs back in
// here instead — not a one-off fixed in the template.
//
// Usage:
//   const g = useEntityGridController(schema, { fixedQuery, title, description, moduleActions, dataOut });
//   <input value={g.searchInput} onChange={(e) => g.handleSearchChange(e.target.value)}
//          onKeyDown={(e) => e.key === 'Enter' && g.submitSearch()} />
//   <button onClick={g.submitSearch}>Go</button>
//   <button onClick={g.handleRefresh}>Refresh</button>       {/* clears any URL-driven filter too */}
//   <button onClick={g.handleExport}>Export</button>
//   <button onClick={g.handlePrint}>Print</button>
//   <table id={g.tableId}>...g.visibleFields.map(...)...</table>
//   <EntityPaginationUi page={g.page} pageCount={g.pageCount} onPageChange={g.setPage}
//     pageSize={g.pageSize} onPageSizeChange={g.setPageSize} />
//   {g.toolbarActions.map(a => <button onClick={() => g.runToolbarAction(a)}>{a.label}</button>)}
//   {g.gridProfileActions.map(a => <button onClick={() => g.runProfileAction(a)}>{a.label}</button>)}
//   <EntityRowOptions row={row} onChildDataOut={g.handleRowEvent} onRunAction={g.handleRunAction} />

// Plain "key=value&key2=value2" query string, where each VALUE is itself
// base64'd individually (backend expects order_id=<btoa(rawValue)>, not
// the raw value) — the whole querystring then gets base64'd AGAIN by
// buildSubGridViewMoreHref below for the outer <parentTable>_mosyfilter
// param. Two separate encoding layers: per-value here, whole-string there.
function resolveTemplateValue(value, row) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, fieldKey) => row?.[fieldKey] ?? '');
}

function buildMosyFilterQueryString(filter, row) {
  const resolved = {};
  Object.entries(filter || {}).forEach(([k, v]) => {
    resolved[k] = btoa(String(resolveTemplateValue(v, row) ?? ''));
  });
  return new URLSearchParams(resolved).toString();
}

export function useEntityGridController(
  schema,
  { fixedQuery = {}, title, description, moduleActions, dataOut = {} } = {}
) {
  const router = useRouter();
  const { setChildDataOut = () => {} } = dataOut;

  // Picks up ${schema.entity}_mosyfilter from the current URL — same
  // MosySecureFilterEngine every legacy list already used. A grid reached
  // via a multiGridRows "View more" link (or any hand-built URL carrying
  // this param) scopes itself automatically, no per-module glue code
  // needed on the receiving page. Prop-level fixedQuery still wins on key
  // collisions — a wrapper component's own intended scope shouldn't be
  // overridable by a URL param.
  const urlFilter = useMemo(() => MosySecureFilterEngine(schema.entity), [schema.entity]);
  const mergedFixedQuery = useMemo(() => ({ ...urlFilter, ...fixedQuery }), [urlFilter, fixedQuery]);

  const c = useEntityController(schema, { fixedQuery: mergedFixedQuery });
  const [searchInput, setSearchInput] = useState('');

  // Page-level gate — no moduleRole on the schema means open to anyone,
  // same additive convention as every other role/flag.
  const accessDenied = schema.moduleRole ? !mosyACTRLHasRole(schema.moduleRole) : false;

  const visibleFields = useMemo(() => {
    const fieldsByKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
    return (schema.showInList || []).map((key) => fieldsByKey[key]).filter(Boolean);
  }, [schema]);

  const colCount = visibleFields.length;

  const sumFields = useMemo(() => visibleFields.filter((f) => f.sum), [visibleFields]);

  const columnTotals = useMemo(() => {
    if (sumFields.length === 0) return {};
    const totals = {};
    sumFields.forEach((f) => {
      const raw = c.rows.reduce((acc, row) => {
        const n = Number(row[f.key]);
        return acc + (Number.isNaN(n) ? 0 : n);
      }, 0);
      const decimals = f.decimals ?? 0;
      let formatted;
      try {
        formatted = mosyTonum(raw, decimals);
      } catch (err) {
        console.error(`[useEntityGridController] mosyTonum threw while formatting total for "${f.key}" (raw=${raw}):`, err);
        formatted = null;
      }
      totals[f.key] = formatted || raw.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    });
    return totals;
  }, [sumFields, c.rows]);

  const resolvedTitle = title || schema.label || schema.entity;
  const resolvedDescription = description || schema.description;

  const tableId = `${schema.entity}_data_table`;
  const printCardId = `${schema.entity}_print_card`;

  const handleSearchChange = (value) => setSearchInput(value);
  const submitSearch = () => c.setSearch(searchInput);

  // Plain reload: clear search input + page 1 + reload, CURRENT scope
  // (URL-derived or not) left untouched. This is what every action
  // dispatch below uses as its "refresh after mutating" callback —
  // clearing a URL-driven filter as a side effect of, say, deleting a
  // row would be a surprising and unrelated behavior change.
  const reload = () => {
    setSearchInput('');
    c.refresh();
  };

  // The PUBLIC, button-facing "Refresh": means "start over" — drops the
  // URL's ${entity}_mosyfilter/mosytitle scope entirely, both from the
  // address bar and from what the engine actually queries with, resetting
  // to just this component's own fixedQuery prop.
  const handleRefresh = () => {
    if (schema?.entity) {
      deleteUrlParam(`${schema.entity}_mosyfilter`);
      deleteUrlParam('mosytitle');
    }
    setSearchInput('');
    c.refresh(fixedQuery);
  };

  const handleExport = () => {
    exportTableToExcel(tableId, `${schema.entity}.xlsx`);
  };

  const handlePrint = () => {
    mosyPrintToPdf({ elemId: printCardId, defaultTitle: resolvedTitle });
  };

  // ---- Action dispatch — every place a schema-driven action can be
  // triggered from (toolbar, grid-surfaced profileActions, row dropdown,
  // checkbox bulk action) funnels through these two, so the "normalize ->
  // notify -> reload-if-needed -> navigate-if-needed" sequence is written
  // exactly once. ----
  const notifyResult = (result, notifyKey) => {
    if (result?.message) {
      MosyNotify({
        message: result.message,
        icon: result.ok ? 'check-circle' : 'times-circle',
        iconColor: result.ok ? 'success' : 'danger',
        id: `grid-action-${notifyKey}`,
        addTimer: true,
        duration: result.ok ? 2500 : 4000,
      });
    }
  };

  // For raw runRegisteredAction(...) calls that bypass the engine's own
  // runAction/runRowAction (list-level "type: action" buttons, checkbox
  // bulk actions, profileAction "type: action" entries) — the engine has
  // no idea these ran, so THIS reloads manually on result.reload.
  const dispatchAction = async (actionPromise, notifyKey) => {
    const result = normalizeActionResult(await actionPromise);
    notifyResult(result, notifyKey);
    if (result?.reload) reload();
    if (result?.navigateTo) router.push(result.navigateTo);
    return result;
  };

  // For c.runAction/c.runRowAction results — the engine ALREADY reloaded
  // internally when result.reload was true, this just adds the notify +
  // navigate UI side-effects the engine (being pure logic, no UI) doesn't
  // own.
  const notifyEngineResult = (result, notifyKey) => {
    notifyResult(result, notifyKey);
    if (result?.navigateTo) router.push(result.navigateTo);
    return result;
  };

  // ---- Toolbar actions (schema.actions — bulk grid-toolbar buttons) ----
  const toolbarActions = (schema?.actions || []).filter((a) => !a.role || mosyACTRLHasRole(a.role));
  const runToolbarAction = async (action) => notifyEngineResult(await c.runAction(action.key), `toolbar-${action.key}`);

  // ---- Grid-surfaced profile actions (schema.profileActions, grid:true) ----
  // Same array DynamicForm reads for the profile-page toolbar; an entry
  // only shows up here if it's explicitly flagged grid:true.
  const gridProfileActions = (schema?.profileActions || []).filter(
    (a) => a.grid && (!a.role || mosyACTRLHasRole(a.role))
  );
  const runProfileAction = async (action) => {
    if (action.confirm && typeof window !== 'undefined' && !window.confirm(action.confirm)) return;
    if (typeof action.onClick === 'function') return action.onClick(router);
    if (action.navigateTo) {
      return typeof action.navigateTo === 'function' ? action.navigateTo(router) : router.push(action.navigateTo);
    }
    if (action.type === 'action' && action.key) {
      return dispatchAction(
        runRegisteredAction(moduleActions, action.key, {
          rows: [],
          schema,
          router,
          refresh: reload,
          create: c.create,
          update: c.update,
          remove: c.remove,
        }),
        `profile-${action.key}`
      );
    }
    if (action.key) return notifyEngineResult(await c.runAction(action.key), `profile-${action.key}`);
  };

  // ---- Row actions (EntityRowOptions dropdown / row buttons) ----
  const handleRunAction = async (key, row) => {
    const actionDef = (schema.profileActions || []).find((a) => a.key === key) || (schema.actions || []).find((a) => a.key === key);

    if (actionDef?.confirm && typeof window !== 'undefined' && !window.confirm(actionDef.confirm)) return;
    if (typeof actionDef?.onClick === 'function') return actionDef.onClick(router, row);
    if (actionDef?.navigateTo) {
      return typeof actionDef.navigateTo === 'function' ? actionDef.navigateTo(router, row) : router.push(actionDef.navigateTo);
    }
    if (actionDef?.type === 'action' && actionDef.key) {
      return dispatchAction(
        runRegisteredAction(moduleActions, actionDef.key, {
          rows: [row],
          schema,
          router,
          refresh: reload,
          create: c.create,
          update: c.update,
          remove: c.remove,
        }),
        `row-${key}`
      );
    }
    return notifyEngineResult(await c.runRowAction(key, row, router), `row-${key}`);
  };

  // Edit ("View more")/Delete work out of the box for ANY schema via this
  // — no per-entity request-handler file needed. Cross-entity clicks
  // still bubble to setChildDataOut unchanged.
  const handleRowEvent = (data) => {
    interpretEntityRowEvent(data, c);
    setChildDataOut(data);
  };

  // ---- Checkbox selection (schema.gridOptions.checkBoxes) ----
  // Two flags in schema.js turn this on:
  //   gridOptions: { checkBoxes: true, checkFunction: 'some_registry_key' }
  // checkFunction is a key in this module's actionsRegistry.js — receives
  // ctx.rows as every SELECTED row's full data. No checkBoxes flag -> all
  // of this is inert, zero behavior/markup for modules that don't opt in.
  const checkBoxesEnabled = !!schema?.gridOptions?.checkBoxes;
  const getRowId = (row) => row?.record_id ?? row?.primkey ?? row?.id;
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Selection is page/query scoped — clear it whenever the underlying row
  // set changes (search, filter, page, refresh) so a stale checked id
  // from a previous page can't silently ride along into an action.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [c.rows]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = checkBoxesEnabled && c.rows.length > 0 && c.rows.every((r) => selectedIds.has(getRowId(r)));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allOnPageSelected) return new Set();
      const next = new Set(prev);
      c.rows.forEach((r) => next.add(getRowId(r)));
      return next;
    });
  };

  const selectedRows = checkBoxesEnabled ? c.rows.filter((r) => selectedIds.has(getRowId(r))) : [];

  const handleCheckedRowsAction = async () => {
    const actionKey = schema?.gridOptions?.checkFunction;
    if (!actionKey || selectedRows.length === 0) return;
    const result = await dispatchAction(
      runRegisteredAction(moduleActions, actionKey, {
        rows: selectedRows,
        schema,
        router,
        refresh: reload,
        create: c.create,
        update: c.update,
        remove: c.remove,
      }),
      `checked-${actionKey}`
    );
    if (result?.reload) setSelectedIds(new Set());
  };

  // ---- Sub-grids (schema.multiGridRows) ----
  // Presence check + the "View more" link builder live here so a
  // template's mini-table component only ever needs `row[config.key]`
  // (a plain data lookup, left to the template since it's pure
  // presentation) and this function (the fiddly base64/querystring
  // encoding every template would otherwise have to duplicate).
  const hasMultiGridRows = Array.isArray(schema?.multiGridRows) && schema.multiGridRows.length > 0;
  const buildSubGridViewMoreHref = (config, row) => {
    if (!config?.viewMoreLink) return null;
    const qs = buildMosyFilterQueryString(config.filter, row);
    return `${config.viewMoreLink}?${config.parentTable}_mosyfilter=${btoa(qs)}&mosytitle=${btoa(config.title || '')}`;
  };

  // Real column count in the DOM, accounting for the optional checkbox
  // column — templates use this for colSpan on loading/error/empty rows
  // AND any full-width sub-grid row so nothing misaligns.
  const totalColCount = colCount + (checkBoxesEnabled ? 1 : 0);

  return {
    ...c, // rows, loading, error, page, pageCount, pageSize, setPage, setPageSize,
          // setSearch, refresh, nextPage, prevPage, filter, runAction, create,
          // update, remove, load, applyFilter, schema — everything useEntityController gives.

    accessDenied,

    // Resolved display values
    title: resolvedTitle,
    description: resolvedDescription,

    // Search
    searchInput,
    handleSearchChange,
    submitSearch,

    // Toolbar actions
    handleRefresh,
    handleExport,
    handlePrint,

    // Resolved schema/field info
    visibleFields,
    colCount,
    totalColCount,
    sumFields,
    columnTotals,

    // DOM ids export/print need
    tableId,
    printCardId,

    // Schema-driven action buttons — fully resolved (role-filtered) +
    // ready-to-call dispatchers, no registry/notify wiring needed in the template
    toolbarActions,
    runToolbarAction,
    gridProfileActions,
    runProfileAction,
    handleRunAction,
    handleRowEvent,

    // Checkbox selection
    checkBoxesEnabled,
    getRowId,
    selectedIds,
    selectedRows,
    allOnPageSelected,
    toggleRow,
    toggleSelectAll,
    handleCheckedRowsAction,

    // Sub-grids
    hasMultiGridRows,
    buildSubGridViewMoreHref,
  };
}