// smartFilterActions.jsx
// Modern replacement for smartFilterUiControl.jsx's DATA WIRING. The
// picker UI itself (filterDataByDate, MosyLiveSearch) is untouched —
// nothing schema-shaped about a date-range widget or a search dropdown,
// no reason to rebuild those. What's gone is loadCustomListData() and
// the set${TableCamelCase}ListData naming convention — every function
// below calls straight into the SAME EntityDataEngine instance backing
// the calling grid, via ctx, exactly like ctx.create()/ctx.update()
// already do for mutations.
//
// EXCLUSIVE BY DEFAULT: picking a new smart filter (tag/map/date)
// REPLACES whatever advancedQuery filter was active before, via
// ctx.setAdvancedQuery(query) — not ctx.filter(key, value), which always
// MERGES. Merging is right for a sidebar with several simultaneous
// inputs (user_id AND a date range together); it's wrong for "pick a
// deal status" followed by "pick a company," which used to silently AND
// the two together and could zero out the result set with no visible
// explanation. Pass { combine: true } at a specific call site to opt
// back into the old additive behavior when you genuinely want two smart
// filters to stack.
//
// Built for actionsRegistry.js call sites: ctx already has
// {schema, filter, setAdvancedQuery, setDateRange, refresh} — see
// useEntityGridController.jsx's filterCtx block.

import { filterDataByDate } from '../../UiControl/componentControl';
import { MosyLiveSearch } from '../../UiControl/customUI';
import { closeMosyCard } from '../../../components/MosyCard';

// snake_case DB column name -> camelCase advancedQuery param, matching
// mosySecureSelect's reserved-param convention (e.g. deal_status ->
// dealStatus). Same helper legacy's smartFilterUiControl.jsx had as
// mosySnakeToCamelCase — kept local here since that file is deprecated.
// displayField/valueField sent to the picker stay snake_case (those are
// real DB column names the search endpoint matches against) — only the
// KEY that ends up in advancedQuery gets converted.
function toCamelCase(text = '') {
  return text.replace(/_([a-z0-9])/g, (_, ch) => ch.toUpperCase());
}

/**
 * Date-range filter on ONE column of the CURRENT schema. Replaces any
 * other active filter by default.
 *
 *   filter_date_created: (ctx) => openSmartDateFilter(ctx, {
 *     columnKey: 'date_created',
 *     title: 'Filter by date created',
 *   }),
 *
 *   // to keep alongside an existing filter instead of replacing it:
 *   filter_date_created: (ctx) => openSmartDateFilter(ctx, {
 *     columnKey: 'date_created',
 *     title: 'Filter by date created',
 *     combine: true,
 *   }),
 */
export function openSmartDateFilter(ctx, { columnKey, title = 'Filter by date', inputType = 'datetime-local', combine = false }) {
  const filterKey = toCamelCase(columnKey); // e.g. date_created -> dateCreated

  filterDataByDate({
    inputType,
    label: title,
    callBack: ({ startDate, endDate }) => {
      ctx.setAdvancedQuery(
        { [`${filterKey}_start`]: btoa(startDate), [`${filterKey}_end`]: btoa(endDate) },
        { merge: combine }
      );
      closeMosyCard();
    },
  });
}

/**
 * "Map filter" — pick a row from ANOTHER schema (e.g. Companies) to
 * scope THIS grid by a local FK column (e.g. company_id). Legacy's
 * MosySmartMapFilter, minus the tableName-string plumbing — pass real
 * schema objects instead. Replaces any other active filter by default.
 *
 *   filter_by_company: (ctx) => openSmartMapFilter(ctx, {
 *     title: 'Filter by company',
 *     searchSchema: CompaniesSchema,
 *     displayField: 'company_name',
 *     valueField: 'record_id',
 *     localColumnKey: 'company_id',
 *   }),
 */
export function openSmartMapFilter(ctx, { title, searchSchema, displayField, valueField, localColumnKey, combine = false }) {
  const filterKey = toCamelCase(localColumnKey); // e.g. company_id -> companyId

  MosyLiveSearch({
    api: searchSchema.apiBase,
    title,
    tableName: searchSchema.entity,
    displayField,
    valueField,
    actionName: 'smartMapFilter',
    onSelectFull: (picked) => {
      ctx.setAdvancedQuery({ [filterKey]: btoa(picked[valueField]) }, { merge: combine });
      closeMosyCard();
    },
  });
}

/**
 * "Tag filter" — pick from DISTINCT values already present in one
 * column of THIS schema's own table (e.g. pick an existing deal_status
 * instead of typing one). Same picker, grouped by that column, filters
 * the same table it searches. displayField/valueField are the REAL db
 * column (snake_case) — the picker/groupBy endpoint matches against
 * that; only the resulting advancedQuery key goes through toCamelCase.
 * Replaces any other active filter by default.
 *
 *   filter_deal_status: (ctx) => openSmartTagFilter(ctx, {
 *     title: 'Filter by deal status',
 *     columnKey: 'deal_status',
 *   }),
 */
export function openSmartTagFilter(ctx, { title, columnKey, combine = false }) {
  const { schema } = ctx;
  const filterKey = toCamelCase(columnKey); // e.g. deal_status -> dealStatus

  MosyLiveSearch({
    api: schema.apiBase,
    title,
    tableName: schema.entity,
    displayField: columnKey,
    valueField: columnKey,
    actionName: 'smartTagFilter',
    actionData: {
      mosyFilterOptions: { groupBy: btoa(filterKey) }, // legacy btoa'd groupBy too — parity kept
    },
    onSelectFull: (picked) => {
      ctx.setAdvancedQuery({ [filterKey]: btoa(picked[columnKey]) }, { merge: combine });
      closeMosyCard();
    },
  });
}

// No wrapper for the plain "known value, no picker" case
// (MosySmartColumnFilter's equivalent). Two options depending on intent:
//   ctx.setAdvancedQuery({ [toCamelCase(key)]: btoa(value) })  -> exclusive, replaces
//   ctx.filter(toCamelCase(key), btoa(value))                  -> merges with existing filters