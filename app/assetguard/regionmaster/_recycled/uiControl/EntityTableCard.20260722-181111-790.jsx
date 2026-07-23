'use client';

// EntityTableCard — Bootstrap version. Same data brain as EntityGrid.jsx
// (useEntityController -> EntityDataEngine), different skin: dropdown
// filters instead of pill buttons, a primary "+ Add" button top-right,
// code-under-name first column, soft status badges.
//
// Pairs with EntityTableCard.css for the handful of things stock Bootstrap
// doesn't give you out of the box (soft badge colors, tighter card corners,
// the search icon inset).

import { useState } from 'react';
import { useEntityController } from '../dataControl/useEntityController';
 
export default function EntityTableCard({ schema, fixedQuery = {}, title, description }) {
  const c = useEntityController(schema, { fixedQuery });
  const [searchInput, setSearchInput] = useState('');

  const primaryAction = schema.actions?.find((a) => a.primary);
  const rowAction = schema.actions?.find((a) => !a.primary);
  const visibleFields = schema.fields.filter((f) => f.showInList !== false);
  const colCount = visibleFields.length + (rowAction ? 1 : 0);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    c.setSearch(value); // engine debounces internally
  };

  return (
    <div className="card etc-card border-0 shadow-sm">
      {/* Header */}
      <div className="card-body pb-0">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div>
            <h4 className="font-weight-bold text-dark mb-1">
              {title || schema.label || schema.entity}
            </h4>
            {(description || schema.description) && (
              <p className="text-muted small mb-0">{description || schema.description}</p>
            )}
          </div>

          {primaryAction && (
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center etc-btn-primary"
              onClick={() => c.runAction(primaryAction.key)}
            >
              <i className="fa fa-plus mr-2" style={{ fontSize: '0.75rem' }}></i>
              {primaryAction.label}
            </button>
          )}
        </div>

        {/* Search + advanced filter dropdowns */}
        <div className="d-flex flex-wrap align-items-center mt-3 pb-3 etc-toolbar">
          <div className="position-relative etc-search-wrap mr-2 mb-2">
            <i className="fa fa-search etc-search-icon"></i>
            <input
              type="text"
              className="form-control custom-search-input etc-search-input"
              placeholder={`Search ${(title || schema.label || schema.entity).toLowerCase()}...`}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {schema.advancedFilters?.map((filter) => (
            <select
              key={filter.key}
              className="form-control custom-select etc-filter-select mr-2 mb-2"
              defaultValue=""
              onChange={(e) => c.setFilterValue(filter.key, e.target.value || null)}
            >
              <option value="">{filter.placeholder || `All ${filter.label}`}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover mb-0 etc-table">
          <thead className="text-uppercase">
            <tr>
              {visibleFields.map((f) => (
                <th key={f.key} scope="col" className="text-muted small font-weight-normal">
                  {f.label}
                </th>
              ))}
              {rowAction && <th className="text-muted small font-weight-normal">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {c.loading ? (
              <EmptyRow span={colCount}>
                <i className="fa fa-spinner fa-spin mr-1"></i>
                Loading {(title || schema.entity).toLowerCase()}...
              </EmptyRow>
            ) : c.error ? (
              <EmptyRow span={colCount} tone="error">{c.error}</EmptyRow>
            ) : c.rows.length === 0 ? (
              <EmptyRow span={colCount}>
                <i className="fa fa-search mr-1"></i>
                No {(title || schema.entity).toLowerCase()} found
              </EmptyRow>
            ) : (
              c.rows.map((row) => (
                <tr key={row.id}>
                  {visibleFields.map((f) => (
                    <td key={f.key} className="align-middle">
                      <Cell field={f} row={row} />
                    </td>
                  ))}
                  {rowAction && (
                    <td className="align-middle">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm etc-row-btn"
                        onClick={() => c.runAction(rowAction.key)}
                      >
                        {rowAction.label}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="card-body d-flex justify-content-end align-items-center py-3">
        <div
          className={`cpointer medium_btn border border_set btn-white mr-2 ${c.page <= 1 ? 'disabled' : ''}`}
          onClick={() => c.page > 1 && c.setPage(c.page - 1)}
        >
          <i className="fa fa-chevron-left"></i>
        </div>
        <span className="text-muted mx-2 small">Page {c.page} of {c.pageCount}</span>
        <div
          className={`cpointer medium_btn border border_set btn-white ml-2 ${c.page >= c.pageCount ? 'disabled' : ''}`}
          onClick={() => c.page < c.pageCount && c.setPage(c.page + 1)}
        >
          <i className="fa fa-chevron-right"></i>
        </div>
      </div>
    </div>
  );
}

// field.render(row)   -> full custom control
// field.subtitleKey   -> muted second line under the value (site code under name)
// field.badge         -> soft colored pill (status)
function Cell({ field, row }) {
  const value = row[field.key];

  if (field.render) return field.render(row);

  if (field.badge) {
    const tone = field.badge.tones?.[value] || field.badge.default || 'slate';
    return (
      <span className={`badge badge-pill etc-badge etc-badge-${tone}`}>
        <span className={`etc-badge-dot etc-badge-dot-${tone}`}></span>
        {value}
      </span>
    );
  }

  if (field.subtitleKey) {
    return (
      <div>
        <div className="font-weight-bold text-dark">{String(value ?? '')}</div>
        <div className="text-muted etc-subtitle">{String(row[field.subtitleKey] ?? '')}</div>
      </div>
    );
  }

  return <span className="text-dark-50">{String(value ?? '')}</span>;
}

function EmptyRow({ span, children, tone }) {
  return (
    <tr>
      <td colSpan={span} className={`text-center py-5 ${tone === 'error' ? 'text-danger' : 'text-muted'}`}>
        {children}
      </td>
    </tr>
  );
}