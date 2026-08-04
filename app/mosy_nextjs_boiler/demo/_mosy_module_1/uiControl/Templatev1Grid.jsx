'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEntityGridController } from '../dataControl/useEntityGridController';
import EntityPaginationUi from './EntityPaginationUi';
import EntityRowOptions from './Entityrowoptions';
import { interpretEntityRowEvent } from './Entityroweventinterpreter';
import mosyThemeConfigs from '../../../appConfigs/mosyTheme';
import { MosyNotify } from '../../../MosyUtils/ActionModals';
 
// Templatev1Grid — markup only. All behavior (search, refresh, export, print,
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
//     Templatev1Grid edit required. This is the SAME actions array the
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
      return 'etc-btn-primary';
    default:
      return '';
  }
}

export default function Templatev1Grid({
  schema,
  fixedQuery = {},
  title,
  description,
  customProfilePath = './profile',
  dataOut = {},
  parentStateSetters = null,
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

  // "Add New" reuses schema.profileActions' own 'new' entry (label,
  // icon, navigateTo) instead of a separate prop — one less thing to
  // wire per module. Falls back to a generic button pointed at
  // customProfilePath if the schema doesn't define one.
  const newAction = schema?.profileActions?.find((a) => a.key === 'new');
  const addNewLabel = newAction?.label || 'Add New';
  const addNewIcon = newAction?.icon || 'plus';
  const handleAddNew = () => {
    const target = newAction?.navigateTo || customProfilePath;
    if (typeof target === 'function') target(router);
    else router.push(target);
  };

  // Everything beyond the fixed buttons — Activate Account, custom
  // filters, bulk actions — comes from schema.js.
  const toolbarActions = schema?.actions || [];


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
    <div className="etc-card" style={themeVars}>
      {/* Header */}
      <div className="etc-header">
        <div className="etc-heading">
          <h4 className="etc-title">{g.title}</h4>
          {g.description && <p className="etc-description">{g.description}</p>}
        </div>

        <div className="etc-toolbar">
          <div className="etc-search-wrap">
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

            <button type="button" className="etc-btn etc-btn-primary" onClick={handleAddNew}>
              <i className={`fa fa-${addNewIcon}`}></i> {addNewLabel}
            </button>
          </div>
        </div>
      </div>

      {g.visibleFields.length > 0 && (
        <div className="etc-body">
            <button type="button" className="badge btn_neo text-white bg-primary mr-2 p-2 " onClick={g.handlePrint}>
              <i className="fa fa-print"></i> Print List
            </button>
            {/* <button type="button" className="etc-btn" onClick={() => g.handleExport('pdf')}>
              <i className="fa fa-file-pdf-o"></i> PDF
            </button> */}
            <button type="button" className="badge text-dark bg-white  mr-2 p-2 " onClick={() => g.handleExport('excel')}>
              <i className="fa fa-file-excel-o"></i> Export to Excel
            </button>          
          <div className="etc-table-wrap" id={g.printCardId}>
            <table className="etc-table" id={g.tableId}>
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
                              setters={{ parentStateSetters }}
                              onChildDataOut={handleRowEvent}
                              onRunAction={handleRunAction}
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