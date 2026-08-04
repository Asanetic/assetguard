'use client';
import { useState, useMemo } from 'react';
import { useEntityController } from './useEntityController';
import { exportTableToExcel } from '../../../MosyUtils/exportToExcel';
import { mosyPrintToPdf, mosyTonum } from '../../../MosyUtils/hiveUtils';

// useEntityGridController — the ONE place grid behavior lives. Any UI
// template (table, card grid, kanban, whatever) calls this and gets back
// everything it needs: data + pagination state (via useEntityController),
// plus search/refresh/export/print handlers, resolved visible fields,
// and the ids print/export need to target the right DOM nodes.
//
// Templates should contain markup only — no business logic. If a new
// template needs a capability this hook doesn't expose yet, add it HERE,
// not in the template, so every template gets it for free.
//
// Usage:
//   const g = useEntityGridController(schema, { fixedQuery, title, description });
//   <input value={g.searchInput} onChange={(e) => g.handleSearchChange(e.target.value)}
//          onKeyDown={(e) => e.key === 'Enter' && g.submitSearch()} />
//   <button onClick={g.submitSearch}>Go</button>
//   <button onClick={g.handleRefresh}>Refresh</button>
//   <button onClick={g.handleExport}>Export</button>
//   <button onClick={g.handlePrint}>Print</button>
//   <table id={g.tableId}>...g.visibleFields.map(...)...</table>
//   <EntityPaginationUi page={g.page} pageCount={g.pageCount} onPageChange={g.setPage}
//     pageSize={g.pageSize} onPageSizeChange={g.setPageSize} />

export function useEntityGridController(schema, { fixedQuery = {}, title, description } = {}) {
  const c = useEntityController(schema, { fixedQuery });
  const [searchInput, setSearchInput] = useState('');

  // NOTE: schema.actions is the bulk grid-toolbar actions array (see
  // schema.js) — TestGrid renders one button per entry there directly.
  // There is deliberately no per-row "rowAction" derived from it anymore;
  // row-level actions belong in schema.rowLinks (rendered via
  // EntityRowOptions' dropdown), not as their own grid column.

  // showInList is an array of field keys, e.g. ['site_name', 'country'].
  // Resolve each key against schema.fields and preserve showInList's own
  // order — not schema.fields' order.
  const visibleFields = useMemo(() => {
    const fieldsByKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
    return (schema.showInList || []).map((key) => fieldsByKey[key]).filter(Boolean);
  }, [schema]);

  const colCount = visibleFields.length;

  // Fields flagged `sum: true` in the schema get a totals row at the
  // bottom of the grid. NOTE: this sums whatever's in `c.rows` — i.e.
  // the CURRENT PAGE only, not a true grand total across every page.
  // If a real cross-page total is ever needed, it has to come from the
  // API (e.g. a `totals` object in the response) and be wired in here
  // separately — page-level summing can't produce it on its own.
  const sumFields = useMemo(() => visibleFields.filter((f) => f.sum), [visibleFields]);

  const columnTotals = useMemo(() => {
    if (sumFields.length === 0) return {};
    const totals = {};
    sumFields.forEach((f) => {
      const raw = c.rows.reduce((acc, row) => {
        const n = Number(row[f.key]);
        return acc + (Number.isNaN(n) ? 0 : n);
      }, 0);
      // decplc (decimal places) comes from the field definition if set,
      // e.g. { key: 'total_devices', sum: true, decimals: 0 } — defaults
      // to 0 for whole-number counts like device totals.
      //
      // mosyTonum is wrapped in try/catch — if it THROWS (not just
      // returns something falsy), the earlier `||` fallback alone
      // wouldn't catch that and the footer would go blank with no
      // visible error. This makes any failure loud in the console
      // instead of silent.
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

      // Temporary diagnostic — remove once totals are confirmed working.
      console.log(`[useEntityGridController] total for "${f.key}": raw=${raw}, mosyTonum result=${JSON.stringify(formatted)}, final=${totals[f.key]}`);
    });
    return totals;
  }, [sumFields, c.rows]);
  const resolvedTitle = title || schema.label || schema.entity;
  const resolvedDescription = description || schema.description;

  const tableId = `${schema.entity}_data_table`;
  // Separate wrapper id for print — printElem() reads innerHTML of the id
  // you give it, which drops that element's OWN tag/class. Printing a
  // wrapper's id (not the table's own id) keeps the <table class="table">
  // tag inside the captured innerHTML, so print CSS rules still match.
  const printCardId = `${schema.entity}_print_card`;

  // Both paths available at once, deliberately:
  // 1) Type -> engine debounces (300ms) and searches automatically.
  // 2) Go button / Enter -> searches immediately with whatever's typed,
  //    bypassing the debounce wait. Both call c.setSearch, which is safe
  //    to call repeatedly — each call just resets the debounce timer.
  const handleSearchChange = (value) => {
    setSearchInput(value);
    //c.setSearch(value);
  };


  const submitSearch = () => {
    c.setSearch(searchInput);
  };

  const handleRefresh = () => {
    setSearchInput('');
    c.refresh(); // engine owns "clear search + reload page 1"
  };

  const handleExport = () => {
    exportTableToExcel(tableId, `${schema.entity}.xlsx`);
  };

  const handlePrint = () => {
    mosyPrintToPdf({ elemId: printCardId, defaultTitle: resolvedTitle });
  };


  return {
    ...c, // rows, loading, error, page, pageCount, pageSize, setPage, setPageSize,
          // setSearch, refresh, nextPage, prevPage, filter, runAction, create,
          // update, remove, load, applyFilter, schema — everything useEntityController gives.

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
    sumFields,
    columnTotals, // { [fieldKey]: formattedTotalString } — current page only, see note above

    // DOM ids export/print need
    tableId,
    printCardId,
  };
}