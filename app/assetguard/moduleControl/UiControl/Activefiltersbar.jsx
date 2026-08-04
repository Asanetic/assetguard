// ActiveFiltersBar.jsx
'use client';
import { formLayoutStyles } from './FormLayout';

// Renders g.advancedQuery as removable pills next to the grid toolbar.
// Reuses .dyn-pill/.dyn-pill-active verbatim from FormLayout.jsx — same
// visual language as everywhere else, not a new component vocabulary.
// Self-contained: wraps in dyn-form-scope + imports formLayoutStyles
// itself so those CSS variables resolve even on a plain grid page that
// never mounted DynamicForm.
//
// Handles the one wrinkle EntityDataEngine's shape creates: a date range
// lives in advancedQuery as TWO entries (key_start/key_end), but the
// user thinks of it as one filter — merged into a single chip here,
// cleared together via setDateRange(key, null, null).
//
// "Clear all" is wired to onClearAll — pass g.handleRefresh, the SAME
// button the toolbar's own Refresh already uses. No separate
// clearFilters action; one code path for "start over."
export function ActiveFiltersBar({ advancedQuery, schema, clearFilterValue, setDateRange, onClearAll }) {
  const fieldsByKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
  const entries = Object.entries(advancedQuery || {});
  if (entries.length === 0) return null;

  const seen = new Set();
  const chips = [];

  entries.forEach(([key, value]) => {
    if (seen.has(key)) return;

    if (key.endsWith('_start') || key.endsWith('_end')) {
      const baseKey = key.replace(/_(start|end)$/, '');
      seen.add(`${baseKey}_start`);
      seen.add(`${baseKey}_end`);

      const label = fieldsByKey[baseKey]?.label || baseKey;
      const range = [advancedQuery[`${baseKey}_start`], advancedQuery[`${baseKey}_end`]]
        .filter(Boolean)
        .join(' → ');

      chips.push({ key: baseKey, text: `${label}: ${range}`, onClear: () => setDateRange(baseKey, null, null) });
      return;
    }

    seen.add(key);
    const label = fieldsByKey[key]?.label || key;
    chips.push({ key, text: `${label}: ${value}`, onClear: () => clearFilterValue(key) });
  });

  return (
    <div className="dyn-form-scope">
      <div className="dyn-pills-wrap active-filters-bar">
        {chips.map((chip) => (
          <span key={chip.key} className="dyn-pill dyn-pill-active">
            {chip.text}
            <button type="button" className="active-filter-clear" onClick={chip.onClear} aria-label={`Clear ${chip.text}`}>
              ×
            </button>
          </span>
        ))}

        {chips.length > 1 && (
          <button type="button" className="dyn-pill" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>

      <style jsx global>{formLayoutStyles}</style>
      <style jsx>{`
        .active-filters-bar { margin-bottom: 0.9rem; }
        .active-filter-clear {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0;
          margin-left: 0.5rem;
          line-height: 1;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .active-filter-clear:hover { opacity: 0.7; }
      `}</style>
    </div>
  );
}