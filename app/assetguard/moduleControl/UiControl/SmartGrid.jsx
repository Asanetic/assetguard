'use client';
import { useMemo, useRef, useState, useEffect, Fragment } from 'react';
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
import { ActiveFiltersBar } from './Activefiltersbar';
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

// Past this many buttons in a single action group, the rest collapse
// into a "More" popover instead of the row growing indefinitely — same
// behavior as DynamicForm.jsx's profileActions tray, just wearing etc-
// classes instead of dyn- ones. Used for BOTH the schema.profileActions
// (grid: true) group and the schema.actions group below, each with its
// own independent 5-visible/overflow split and its own open/closed
// "More" state.
const MAX_VISIBLE_GRID_ACTIONS = 4;

function GridActionGroup({ actions, onRun }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handleOutsideClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [moreOpen]);

  if (!actions || actions.length === 0) return null;

  const hasOverflow = actions.length > MAX_VISIBLE_GRID_ACTIONS;
  const visible = hasOverflow ? actions.slice(0, MAX_VISIBLE_GRID_ACTIONS) : actions;
  const overflow = hasOverflow ? actions.slice(MAX_VISIBLE_GRID_ACTIONS) : [];

  return (
    <>
      {visible.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`etc-btn btn ${variantClass(action.variant)} ${action.colorClass || ''}`.trim()}
          onClick={() => onRun(action)}
        >
          {action.icon && <i className={`fa fa-${action.icon}`}></i>} {action.label}
        </button>
      ))}

      {hasOverflow && (
        <div className="etc-more-wrap" ref={moreRef}>
          <button
            type="button"
            className="etc-btn btn"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
          >
            <i className="fa fa-ellipsis-h"></i> More
          </button>
          {moreOpen && (
            <div className="etc-more-panel">
              {overflow.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={`etc-more-item ${action.colorClass || ''}`.trim()}
                  onClick={() => {
                    setMoreOpen(false);
                    onRun(action);
                  }}
                >
                  {action.icon && <i className={`fa fa-${action.icon}`}></i>}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
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
  hiddenActions = [],
}) {
  // Every capability this template uses below — search, refresh (incl.
  // clearing a URL-driven filter), export, print, checkboxes, toolbar/
  // profile/row actions, sub-grid link building — comes from this ONE
  // call. Nothing else in this file talks to the network, the registry,
  // or the URL.
  const g = useEntityGridController(schema, { fixedQuery, title, description, moduleActions, dataOut });

  // Same hiddenActions contract as DynamicForm's — an array of keys to
  // skip. Covers schema-driven buttons (schema.actions, and
  // schema.profileActions entries flagged grid:true) by their own key,
  // PLUS the three hardcoded toolbar buttons below via fixed string keys
  // ('refresh', 'print', 'export') since those aren't schema entries at
  // all — useful when this same grid is embedded somewhere secondary
  // (e.g. inside a parent profile page) and doesn't need its own
  // Export/Print/Refresh chrome cluttering that context.
  const isActionHidden = (key) => hiddenActions.includes(key);
  const visibleToolbarActions = g.toolbarActions.filter((a) => !isActionHidden(a.key));
  const visibleGridProfileActions = g.gridProfileActions.filter((a) => !isActionHidden(a.key));

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
    <div className="etc-card col-md-12 p-0 m-0" style={themeVars}>
      {/* Header — Bootstrap row/col drives the stacking (heading above
          toolbar on phones/tablets, side by side from lg up); etc-header/
          etc-toolbar/etc-* classes only carry color/spacing/type now, no
          layout logic. */}
      <div className="etc-header row mx-0 align-items-center">
        <div className="etc-heading col-12 col-lg-auto px-0 mb-2 mb-lg-0">
          <h4 className="etc-title text-left ">{g.title}</h4>
          {g.description && <p className="etc-description  text-left ">{g.description}</p>}
        </div>

        {/* col-lg (no number) = flex-grow: fills whatever width the
            heading above didn't need, instead of the old fixed 8/12
            split — this is what lets the button row keep claiming space
            as more actions are added instead of wrapping to a second
            line after only 2-3 buttons. */}
        <div className="etc-toolbar col-12 col-lg px-0">
          <div className="d-flex flex-wrap align-items-center justify-content-start justify-content-lg-end">
            {/* Fixed compact width (not a Bootstrap column share) so it
                stops eating half the toolbar's width on desktop — see
                .etc-search-wrap's min-width:992px rule. Refresh sits
                directly after it, both ahead of the filter buttons. */}
            <div className="etc-search-wrap mb-2 mb-lg-0 mr-lg-2">
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

            {!isActionHidden('refresh') && (
              <button type="button" className="etc-btn btn mb-2 mb-lg-0 mr-2" onClick={g.handleRefresh} title="Refresh" aria-label="Refresh">
                <i className="fa fa-refresh"></i> Refresh
              </button>
            )}

            {/* Schema-driven — anything in schema.profileActions flagged
                grid: true renders here (e.g. 'new', 'import', ...).
                Past MAX_VISIBLE_GRID_ACTIONS the rest collapse into
                their own "More" popover (GridActionGroup), same
                pattern as DynamicForm.jsx's profileActions tray.
                Color: variant picks the base etc-btn-<variant> look;
                an optional colorClass on the schema entry appends
                a dyn-btn-accent-* class (or any custom class) after
                it to override/complement that color, reusing the
                same globally-loaded accent classes. */}
            <div className="etc-btn-group d-flex flex-wrap mb-2 mb-lg-0">
              <GridActionGroup actions={visibleGridProfileActions} onRun={g.runProfileAction} />
            </div>
          </div>

          {/* Schema-driven — anything in schema.actions renders here, on
              its own row underneath so it never gets squeezed by the
              search/Refresh/profileActions row above. Its own
              independent 4-visible/overflow split via GridActionGroup,
              separate from the profileActions group above. */}
          {visibleToolbarActions.length > 0 && (
            <div className="etc-btn-row d-flex flex-wrap mt-2 justify-content-start justify-content-lg-end">
              <GridActionGroup actions={visibleToolbarActions} onRun={g.runToolbarAction} />
            </div>
          )}
        </div>
      </div>

      {g.visibleFields.length > 0 && (
        <div className="etc-body text-left ">
          {g.checkBoxesEnabled && g.selectedRows.length > 0 && (
            <div
              className="cpointer badge p-2 rounded badge-danger mb-3 text-white mr-2"
              onClick={g.handleCheckedRowsAction}
              role="button"
            >
              <i className="fa fa-info-circle mr-2"></i> With ({g.selectedRows.length}) selected items | Click for actions
            </div>
          )}
          {(!isActionHidden('print') || !isActionHidden('export')) && (
            <div className="etc-quick-actions">
              {!isActionHidden('print') && (
                <button type="button" className="dyn-btn-accent-purple etc-btn-pill etc-btn-pill-primary px-2 py-1" onClick={g.handlePrint}>
                  <i className="fa fa-print"></i> Print List
                </button>
              )}
              {!isActionHidden('export') && (
                <button type="button" className=" etc-btn-pill etc-btn-pill-success px-2 py-1" onClick={() => g.handleExport('excel')}>
                  <i className="fa fa-file-excel-o"></i> Export to Excel
                </button>
              )}
            </div>
          )}
          {/* <ActiveFiltersBar
            schema={schema}
            advancedQuery={g.advancedQuery}
            clearFilterValue={g.clearFilterValue}
            setDateRange={g.setDateRange}
            onClearAll={g.handleRefresh}
          /> */}
          <div className="etc-table-data-wrap mt-2" id={g.printCardId}>
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
                                g.formatFieldValue(f, item)
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
              {g.visibleFields.some((f) => f.sum) && (
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
              )}
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