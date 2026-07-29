'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEntityGridController } from "../dataControl/useEntityGridController"
import EntityPaginationUi from './EntityPaginationUi';
import EntityRowOptions from './Entityrowoptions';
import { interpretEntityRowEvent } from './Entityroweventinterpreter';
import mosyThemeConfigs from "../../../appConfigs/mosyTheme";
import { MosyNotify } from '../../../MosyUtils/ActionModals';
// UI-only role gate — session roles from localStorage. Adjust path if
// this module's auth utils sit somewhere else relative to uiControl/.
import { mosyACTRLHasRole } from '../../../auth/authAccesControl';
// MosyImageViewer is genuinely reusable — unlike MosySmartDropdownActions/
// MosyGridRowOptions, it has no billing/hiveRoutes/isComponentEnabled
// coupling, so it's fine to keep importing straight from componentControl.jsx
// rather than cloning it. Adjust this path if componentControl.jsx sits
// somewhere else relative to this module.
import { MosyImageViewer } from '../../UiControl/componentControl';
import { MosyUIGuard } from '../../UiControl/MosyUiGuard';
import defaultLogoAsset from '../../../img/logo/logo.png'; // same fallback the legacy ClientsList used — adjust path/asset if this module wants a different one
const defaultLogo = defaultLogoAsset.src || defaultLogoAsset; // Next.js static image imports are objects ({src, width, height, ...}), not plain URL strings — MosyImageViewer needs the string, same as legacy's logo.src
// Same registry useEntityFormController reads for schema.profileActions
// on the profile page — grid-level profileActions (grid: true) call it
// directly too, so a 'type: action' key behaves identically wherever the
// button is clicked from. Adjust the relative path if this module's
// logicControl folder sits somewhere else.
import { runRegisteredAction, normalizeActionResult } from "../logicControl/actionsRegistry";
 
// SmartGrid — markup only. All behavior (search, refresh, export, print,
// pagination, visible fields, row-options dropdown) lives in
// useEntityGridController / EntityRowOptions. To build a different
// template (cards, kanban, etc.), copy this file's shape and swap the
// JSX — the hook call and row-options wiring stay identical.
//
// Visual layer lives in EntityTableCard.css under the "etc-" class
// namespace. Only ONE color comes from your theme (--etc-primary, read
// straight off mosyThemeConfigs.btnBg below — same pattern mosyUi.js
// uses, no derived shades to maintain). Below 640px the table switches
// to a stacked "card per row" layout driven by the data-label
// attributes on each <td> — no separate mobile markup to maintain.
//
// TOOLBAR — two tiers, on purpose:
//  1. Fixed buttons (search/Go, Refresh, Print, PDF, Excel, Add New) —
//     always present, wired straight to the controller. Nothing to
//     configure.
//  2. Schema-driven buttons — anything else (Activate Account, custom
//     filters, bulk actions) comes from schema.actions. Add an entry
//     there and it shows up here automatically, styled to match — no
//     SmartGrid edit required. This is the SAME actions array the
//     schema.js header comment already describes as "bulk grid-toolbar
//     actions"; see schema.js.
//
// dataOut / customProfilePath / parentStateSetters mirror the legacy
// TasksList props — pass them through if your app's nested drill-down
// pattern (setChildDataOut, parent/child state setters) is in play for
// this grid. All optional; omit them and the dropdown still renders,
// it just won't bubble anything up to a parent.

// schema.actions[].variant -> etc-btn modifier class. Same vocabulary
// as schema.js profileActions (outline-success, outline-warning,
// outline-danger, dark) so a button looks the same whether it's a
// profile-page button or a grid-toolbar button.
function variantClass(variant) {
  switch (variant) {
    case 'outline-success':
    case 'success':
      return 'etc-btn-success';
    case 'outline-warning':
    case 'warning':
      return 'etc-btn-warning';
    case 'outline-danger':
    case 'danger':
      return 'etc-btn-danger';
    case 'dark':
    case 'primary':
    case 'outline-primary':
      return 'etc-btn-primary';
    default:
      return '';
  }
}

export default function SmartGrid({
  moduleActions,
  schema,
  fixedQuery = {},
  title,
  description,
  customProfilePath = './profile',
  dataOut = {},
}) {
  const g = useEntityGridController(schema, { fixedQuery, title, description });
  const { setChildDataOut = () => {} } = dataOut;
  const router = useRouter();

  // Single brand color, passed straight through — no shading logic to
  // keep in sync. Change btnBg in mosyTheme.jsx and this follows.
  const themeVars = useMemo(
    () => ({
      '--etc-primary': mosyThemeConfigs.btnBg,
      '--etc-primary-contrast': mosyThemeConfigs.btnTxt,
      '--etc-radius': mosyThemeConfigs.systemBorderRadius,
    }),
    []
  );

  // Placed AFTER every hook call above (Rules of Hooks) — if accessDenied
  // ever flips within a mounted instance (e.g. someone logs in via a
  // modal without a full remount), hook call order/count still stays
  // identical between renders either way.
  if (g.accessDenied) {
    return <MosyUIGuard moduleName={schema?.label || schema?.entity} reason={`You don't have the "${schema.moduleRole}" role required to view this.`} />;
  }

  // Everything beyond the fixed buttons — Activate Account, custom
  // filters, bulk actions — comes from schema.js. Same role gate as
  // gridProfileActions below: an entry with no `role` is open to anyone.
  const toolbarActions = (schema?.actions || []).filter((a) => !a.role || mosyACTRLHasRole(a.role));

  // Add New / Import / any other profile-page action a schema wants
  // surfaced on the LIST page too — no button here is hardcoded to a
  // specific entity or a specific key. Same array DynamicForm reads for
  // the profile-page toolbar (schema.profileActions); an entry only
  // shows up here if it's explicitly flagged `grid: true`. Comment an
  // entry out (or drop the flag) in schema.js and the button disappears
  // — no component edit needed.
  const gridProfileActions = (schema?.profileActions || []).filter(
    (a) => a.grid && (!a.role || mosyACTRLHasRole(a.role))
  );

  const handleProfileAction = async (action) => {
    if (action.confirm && typeof window !== 'undefined' && !window.confirm(action.confirm)) return;
    if (typeof action.onClick === 'function') return action.onClick(router);
    if (action.navigateTo) {
      return typeof action.navigateTo === 'function'
        ? action.navigateTo(router)
        : router.push(action.navigateTo);
    }
    // type: 'action' -> same actionsRegistry.js the profile page uses.
    // g.runAction is a *different* lookup, scoped to schema.actions
    // (appliesTo-matched bulk toolbar actions) — it doesn't know about
    // profileActions keys like this one, which is why register_company
    // did nothing when clicked from the grid. There's no selected row
    // here (it's a list-level button, not a row action), so rows is [].
    // create/update/remove are this grid's OWN engine methods (spread
    // in from useEntityController via g) — a registered action that
    // calls ctx.create(...) is mutating through the exact same engine
    // instance already backing this grid, not a separate codepath.
    if (action.type === 'action' && action.key) {
      const result = normalizeActionResult(
        await runRegisteredAction(moduleActions, action.key, {
          rows: [],
          schema,
          router,
          refresh: g.handleRefresh,
          create: g.create,
          update: g.update,
          remove: g.remove,
        })
      );
      if (result?.message) {
        MosyNotify({
          message: result.message,
          icon: result.ok ? 'check-circle' : 'times-circle',
          iconColor: result.ok ? 'success' : 'danger',
          id: `profile-action-${action.key}`,
          addTimer: true,
          duration: result.ok ? 2500 : 4000,
        });
      }
      if (result?.reload) g.handleRefresh?.();
      if (result?.navigateTo) router.push(result.navigateTo);
      return;
    }
    if (action.key) return g.runAction(action.key);
  };


  // Edit ("View more") and Delete now work out of the box for ANY
  // schema — no per-entity request-handler file needed. Cross-entity
  // rowLinks clicks (Client Details, etc.) still bubble to setChildDataOut
  // unchanged, since interpretEntityRowEvent only handles this entity's
  // own select_<entity>/delete_<entity> events.
  const handleRowEvent = (data) => {

    console.log('handleRowEvent', data);
    interpretEntityRowEvent(data, g);
    setChildDataOut(data);
  };

  const handleRunAction = async (key, row, router) => {
    const actionDef = (schema.profileActions || []).find((a) => a.key === key)
      || (schema.actions || []).find((a) => a.key === key);
  
    if (actionDef?.confirm && typeof window !== 'undefined' && !window.confirm(actionDef.confirm)) return;
    if (typeof actionDef?.onClick === 'function') return actionDef.onClick(router, row);
    if (actionDef?.navigateTo) {
      return typeof actionDef.navigateTo === 'function'
        ? actionDef.navigateTo(router, row)
        : router.push(actionDef.navigateTo);
    }
    if (actionDef?.type === 'action' && actionDef.key) {
      const result = normalizeActionResult(
        await runRegisteredAction(moduleActions, actionDef.key, {
          rows: [row],
          schema,
          router,
          refresh: g.handleRefresh,
          create: g.create,
          update: g.update,
          remove: g.remove,
        })
      );
      if (result?.message) {
        MosyNotify({
          message: result.message,
          icon: result.ok ? 'check-circle' : 'times-circle',
          iconColor: result.ok ? 'success' : 'danger',
          id: `row-action-${key}`,
          addTimer: true,
          duration: result.ok ? 2500 : 4000,
        });
      }
      if (result?.reload) g.handleRefresh?.();
      if (result?.navigateTo) router.push(result.navigateTo);
      return;
    }
  
    // Fallback: plain registry key with no special flags — old behavior.
    const result = await g.runRowAction(key, row, router);
    if (result?.message) {
      MosyNotify({
        message: result.message,
        icon: result.ok ? 'check-circle' : 'times-circle',
        iconColor: result.ok ? 'success' : 'danger',
        id: `row-action-${key}`,
        addTimer: true,
        duration: result.ok ? 2500 : 4000,
      });
    }
    if (result?.navigateTo) router.push(result.navigateTo);
  };


  return (
    <div className="etc-card  col-md-12 p-0 m-0" style={themeVars}>
      {/* Header */}
      <div className="etc-header">
        <div className="etc-heading">
          <h4 className="etc-title text-left ">{g.title}</h4>
          {g.description && <p className="etc-description  text-left ">{g.description}</p>}
        </div>

        <div className="etc-toolbar text-left">
          <div className="etc-search-wrap text-left">
            <button
              type="button"
              className="etc-search-icon-btn"
              onClick={g.submitSearch}
              aria-label="Search"
            >
              <i className="fa fa-search"></i>
            </button>
            <input
              type="text"
              className="etc-search-input"
              placeholder="Search..."
              value={g.searchInput}
              onChange={(e) => g.handleSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && g.submitSearch()}
            />
            <button type="button" className="etc-search-go-btn" onClick={g.submitSearch}>
              Go
            </button>
          </div>

          <div className="etc-btn-group">
            <button
              type="button"
              className="etc-btn  "
              onClick={g.handleRefresh}
              title="Refresh"
              aria-label="Refresh"
            >
              <i className="fa fa-refresh"></i> Refresh
            </button>


            {/* Schema-driven — anything in schema.actions renders here */}
            {toolbarActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={`etc-btn ${variantClass(action.variant)}`.trim()}
                onClick={async () => {
                  const result = await g.runAction(action.key);
                  if (result?.message) MosyNotify({ message: result.message, icon: result.ok ? 'check-circle' : 'times-circle', iconColor: result.ok ? 'success' : 'danger', id: `bulk-${action.key}`, addTimer: true, duration: result.ok ? 2500 : 4000 });
                }}
              >
                {action.icon && <i className={`fa fa-${action.icon}`}></i>} {action.label}
              </button>
            ))}

            {/* Schema-driven — anything in schema.profileActions flagged
                grid: true renders here (e.g. 'new', 'import', ...) */}
            {gridProfileActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={`etc-btn ${variantClass(action.variant)}`.trim()}
                onClick={() => handleProfileAction(action)}
              >
                {action.icon && <i className={`fa fa-${action.icon}`}></i>} {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {g.visibleFields.length > 0 && (
        <div className="etc-body text-left ">
            <button type="button" className="badge btn_neo text-white bg-primary mr-2 p-2 " onClick={g.handlePrint}>
              <i className="fa fa-print"></i> Print List
            </button>
            {/* <button type="button" className="etc-btn" onClick={() => g.handleExport('pdf')}>
              <i className="fa fa-file-pdf-o"></i> PDF
            </button> */}
            <button type="button" className="badge text-dark bg-white  mr-2 p-2 " onClick={() => g.handleExport('excel')}>
              <i className="fa fa-file-excel-o"></i> Export to Excel
            </button>          
          <div className="etc-table-data-wrap" id={g.printCardId}>
            <table className="etc-table-data" id={g.tableId}>
              <thead>
                <tr>
                  {g.visibleFields.map((f) => (
                    <th key={f.key}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.loading ? (
                  <tr>
                    <td colSpan={g.colCount} className="etc-state etc-state-loading">
                      <span className="etc-spinner" aria-hidden="true"></span>
                      Loading...
                    </td>
                  </tr>
                ) : g.error ? (
                  <tr>
                    <td colSpan={g.colCount} className="etc-state etc-state-error">
                      {g.error}
                    </td>
                  </tr>
                ) : g.rows.length === 0 ? (
                  <tr>
                    <td colSpan={g.colCount} className="etc-state etc-state-empty">
                      No results found.
                    </td>
                  </tr>
                ) : (
                  g.rows.map((item, idx) => (
                    <tr
                      key={item.record_id ?? item.primkey ?? item.id ?? `row-${idx}`}
                      className="etc-row"
                    >
                      {g.visibleFields.map((f) => (
                        <td key={f.key} data-label={f.label}>
                          {f.key === 'row_count' ? (
                            <EntityRowOptions
                              schema={schema}
                              row={item}
                              profilePath={customProfilePath}
                              onChildDataOut={handleRowEvent}
                              onRunAction={handleRunAction}
                            />
                          ) : f.type === 'image' ? (
                            // Same media-URL convention the legacy list used
                            // (base64'd raw value through /api/mediaroom) —
                            // only the trigger for rendering it moved, from
                            // a hardcoded <td> to `type: 'image'` on the
                            // field definition. Per-field overrides so one
                            // schema can size/fallback differently than
                            // another without touching this component.
                            <MosyImageViewer
                              media={`/api/mediaroom?media=${btoa(item[f.key] || '')}`}
                              mediaRoot=""
                              defaultLogo={f.defaultLogo || defaultLogo}
                              imageClass={'small_thumbnail'}
                            />
                          ) : (
                            item[f.key]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="etc-tfoot-row">
                  {g.visibleFields.map((f) => (
                    <td key={f.key} data-label={f.label}>
                      {f.sum ? g.columnTotals?.[f.key] : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="etc-pagination-wrap">
            <EntityPaginationUi
              page={g.page}
              pageCount={g.pageCount}
              onPageChange={g.setPage}
              pageSize={g.pageSize}
              onPageSizeChange={g.setPageSize}
            />
          </div>
        </div>
      )}
    </div>
  );
}