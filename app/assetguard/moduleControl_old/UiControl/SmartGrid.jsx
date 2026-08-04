'use client';
import { useMemo, Fragment } from 'react';
import { useEntityGridController } from '../dataControl/useEntityGridController';
import EntityPaginationUi from './EntityPaginationUi';
import EntityRowOptions from './Entityrowoptions';
import mosyThemeConfigs from '../../../appConfigs/mosyTheme';
// MosyImageViewer is genuinely reusable — unlike MosySmartDropdownActions/
// MosyGridRowOptions, it has no billing/hiveRoutes/isComponentEnabled
// coupling, so it's fine to keep importing straight from componentControl.jsx
// rather than cloning it. Adjust this path if componentControl.jsx sits
// somewhere else relative to this module.
import { MosyImageViewer } from '../../UiControl/componentControl';
import { MosyUIGuard } from '../../UiControl/MosyUiGuard';
import defaultLogoAsset from '../../../img/logo/logo.png'; // same fallback the legacy ClientsList used — adjust path/asset if this module wants a different one
const defaultLogo = defaultLogoAsset.src || defaultLogoAsset; // Next.js static image imports are objects ({src, width, height, ...}), not plain URL strings — MosyImageViewer needs the string, same as legacy's logo.src

// SmartGrid — markup ONLY. Every piece of behavior (search, refresh,
// export, print, pagination, visible fields, URL-driven filter scoping,
// checkbox selection + bulk actions, toolbar/profile/row action dispatch,
// row events, sub-grid link building) lives in useEntityGridController.
// This file's job is exactly one thing: take what the hook returns and
// turn it into JSX. No import here should be a registry, a filter engine,
// a notify system, or useRouter — if you find yourself reaching for one
// of those to add a feature, that feature belongs in the hook, not here.
//
// That split is what makes swapping templates cheap: copy this file's
// shape, keep the SAME `const g = useEntityGridController(...)` call,
// swap every line of JSX below it for a completely different look (a
// Dribbble-sourced card grid, a kanban board, whatever) — the hook call
// doesn't change, so search/refresh/checkboxes/actions/sub-grids all keep
// working with zero extra logic written in the new template.
//
// Visual layer lives in EntityTableCard.css under the "etc-" class
// namespace. Only ONE color comes from your theme (--etc-primary, read
// straight off mosyThemeConfigs.btnBg below — same pattern mosyUi.js
// uses, no derived shades to maintain). Below 640px the table switches
// to a stacked "card per row" layout driven by the data-label
// attributes on each <td> — no separate mobile markup to maintain.
//
// dataOut / customProfilePath mirror the legacy TasksList props — pass
// them through if your app's nested drill-down pattern (setChildDataOut)
// is in play for this grid. All optional; omit them and the dropdown
// still renders, it just won't bubble anything up to a parent.

// schema.actions[].variant -> etc-btn modifier class. Same vocabulary as
// schema.js profileActions (outline-success, outline-warning,
// outline-danger, dark) so a button looks the same whether it's a
// profile-page button or a grid-toolbar button. Deliberately a template
// concern, not a hook concern — a different template's CSS framework
// would map these to different class names entirely.
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

// ════════════════════════════════════════════════════════════════
// SUB-GRIDS (schema.multiGridRows) — expandable nested mini-tables per
// row: order items, payment history, action history, whatever. Fully
// schema-driven, arbitrarily many per row:
//
//   multiGridRows: [
//     {
//       key: 'order_items',        // must match the array field the API
//                                   // already embeds on each row, e.g.
//                                   // row.order_items — no separate
//                                   // fetch/endpoint needed.
//       title: 'Sale items',
//       columns: [
//         { key: 'product_name', label: 'Product Name' },
//         { key: 'total_price', label: 'Total Price', sum: true },
//       ],
//       viewMoreLink: 'payments_list',            // base path only
//       parentTable: 'sale_order_items',          // schema.entity of the
//                                                  // grid viewMoreLink
//                                                  // points at
//       filter: { order_id: '{record_id}' },      // {curly braces} ->
//                                                  // resolved against
//                                                  // the parent row
//     },
//   ],
//
// The actual link-building (base64/querystring encoding) is
// g.buildSubGridViewMoreHref — this component only does the presentation:
// reading row[config.key] and rendering a table.
// ════════════════════════════════════════════════════════════════

function MiniGrid({ config, row, buildViewMoreHref }) {
  const items = Array.isArray(row?.[config.key]) ? row[config.key] : [];

  const totals = useMemo(() => {
    const t = {};
    (config.columns || []).forEach((c) => {
      if (c.sum) t[c.key] = items.reduce((s, r) => s + Number(r[c.key] || 0), 0);
    });
    return t;
  }, [items, config.columns]);

  const hasTotals = Object.keys(totals).length > 0;
  const viewMoreHref = buildViewMoreHref(config, row);

  return (
    <div className="etc-subgrid ">
      <div className="etc-subgrid-header d-flex justify-content-between align-items-center">
        <h6 className="mb-1 text-left border-bottom border-light col-md-12">
          <b>{config.title}</b>
          {viewMoreHref && (
            <a href={viewMoreHref} style={{ float: 'right' }} className="etc-subgrid-viewmore badge text-info multigrid_view_more skip_print no-export">
              View more <i className="fa fa-angle-right ml-1"></i>
            </a>
          )}
        </h6>
      </div>
      {items.length === 0 ? (
        <div className="text-muted p-2 text-center border-bottom" style={{ height: '40px' }}>No {(config.title || 'records').toLowerCase()} found.</div>
      ) : (
        <table className="table table-hover etc-subgrid-table">
          <thead style={{ backgroundColor: '#E8E9EA', color: '#000' }}>
            <tr style={{ height: '40px' }}>
              <th style={{ backgroundColor: '#E8E9EA', color: '#000' }}>#</th>
              {config.columns.map((c) => (
                <th style={{ backgroundColor: '#E8E9EA', color: '#000' }} key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={r.record_id ?? r.primkey ?? r.id ?? i}>
                <td>{r.row_count ?? i + 1}</td>
                {config.columns.map((c) => (
                  <td key={c.key}>{c.format ? c.format(r[c.key], r) : r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {hasTotals && (
            <tfoot>
              <tr className="etc-tfoot-row">
                <td></td>
                {config.columns.map((c) => (
                  <td key={c.key}>{c.sum ? totals[c.key] : ''}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
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
  // Every capability this template uses below — search, refresh (incl.
  // clearing a URL-driven filter), export, print, checkboxes, toolbar/
  // profile/row actions, sub-grid link building — comes from this ONE
  // call. Nothing else in this file talks to the network, the registry,
  // or the URL.
  const g = useEntityGridController(schema, { fixedQuery, title, description, moduleActions, dataOut });

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

  if (g.accessDenied) {
    return <MosyUIGuard moduleName={schema?.label || schema?.entity} reason={`You don't have the "${schema.moduleRole}" role required to view this.`} />;
  }

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
            <button type="button" className="etc-search-icon-btn" onClick={g.submitSearch} aria-label="Search">
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
            <button type="button" className="etc-btn  " onClick={g.handleRefresh} title="Refresh" aria-label="Refresh">
              <i className="fa fa-refresh"></i> Refresh
            </button>

            {/* Schema-driven — anything in schema.actions renders here */}
            {g.toolbarActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={`etc-btn ${variantClass(action.variant)}`.trim()}
                onClick={() => g.runToolbarAction(action)}
              >
                {action.icon && <i className={`fa fa-${action.icon}`}></i>} {action.label}
              </button>
            ))}

            {/* Schema-driven — anything in schema.profileActions flagged
                grid: true renders here (e.g. 'new', 'import', ...) */}
            {g.gridProfileActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={`etc-btn ${variantClass(action.variant)}`.trim()}
                onClick={() => g.runProfileAction(action)}
              >
                {action.icon && <i className={`fa fa-${action.icon}`}></i>} {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {g.visibleFields.length > 0 && (
        <div className="etc-body text-left ">
          {g.checkBoxesEnabled && g.selectedRows.length > 0 && (
            <div
              className="cpointer badge p-2 rounded badge-danger mb-3 text-white"
              onClick={g.handleCheckedRowsAction}
              role="button"
            >
              <i className="fa fa-info-circle mr-2"></i> With ({g.selectedRows.length}) selected items | Click for actions
            </div>
          )}
          <button type="button" className="badge btn_neo text-white bg-primary mr-2 p-2 " onClick={g.handlePrint}>
            <i className="fa fa-print"></i> Print List
          </button>
          <button type="button" className="badge text-dark bg-white  mr-2 p-2 " onClick={() => g.handleExport('excel')}>
            <i className="fa fa-file-excel-o"></i> Export to Excel
          </button>
          <div className="etc-table-data-wrap" id={g.printCardId}>
            <table className="etc-table-data" id={g.tableId}>
              <thead>
                <tr>
                  {g.checkBoxesEnabled && (
                    <th className="etc-checkbox-col">
                      <input
                        type="checkbox"
                        className="cpointer"
                        checked={g.allOnPageSelected}
                        onChange={g.toggleSelectAll}
                        aria-label="Select all rows on this page"
                      />
                    </th>
                  )}
                  {g.visibleFields.map((f) => (
                    <th key={f.key}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.loading ? (
                  <tr>
                    <td colSpan={g.totalColCount} className="etc-state etc-state-loading">
                      <span className="etc-spinner" aria-hidden="true"></span>
                      Loading...
                    </td>
                  </tr>
                ) : g.error ? (
                  <tr>
                    <td colSpan={g.totalColCount} className="etc-state etc-state-error">
                      {g.error}
                    </td>
                  </tr>
                ) : g.rows.length === 0 ? (
                  <tr>
                    <td colSpan={g.totalColCount} className="etc-state etc-state-empty">
                      No results found.
                    </td>
                  </tr>
                ) : (
                  g.rows.map((item, idx) => {
                    const rowId = g.getRowId(item) ?? `row-${idx}`;
                    return (
                      <Fragment key={rowId}>
                        <tr className="etc-row">
                          {g.checkBoxesEnabled && (
                            <td className="etc-checkbox-col" data-label="">
                              <input
                                type="checkbox"
                                className="cpointer"
                                checked={g.selectedIds.has(g.getRowId(item))}
                                onChange={() => g.toggleRow(g.getRowId(item))}
                                aria-label={`Select row ${idx + 1}`}
                              />
                            </td>
                          )}
                          {g.visibleFields.map((f) => (
                            <td key={f.key} data-label={f.label}>
                              {f.key === 'row_count' ? (
                                <EntityRowOptions
                                  schema={schema}
                                  row={item}
                                  profilePath={customProfilePath}
                                  onChildDataOut={g.handleRowEvent}
                                  onRunAction={g.handleRunAction}
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
                        {g.hasMultiGridRows && (
                          <tr className="etc-subgrid-row" style={{ backgroundColor: '#F8FAFC', color: '#000' }}>
                            <td colSpan={g.totalColCount} className="etc-subgrid-cell">
                              {schema.multiGridRows.map((mgConfig) => (
                                <MiniGrid key={mgConfig.key} config={mgConfig} row={item} buildViewMoreHref={g.buildSubGridViewMoreHref} />
                              ))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="etc-tfoot-row">
                  {g.checkBoxesEnabled && <td className="etc-checkbox-col"></td>}
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