// EntityDataEngine — the actual "kitchen." Zero React. Zero DOM. Zero UI knowledge.
// Any UI (React, plain HTML/JS, Vue, a downloaded jQuery dashboard) can use this
// by creating one instance and calling .subscribe() to get notified when data changes.

import { mosyGetData, mosyPostData } from '../../../MosyUtils/hiveUtils';
import { runRegisteredAction } from '../logicControl/actionsRegistry';

// ---- Normalize whatever a registered action returns into one shape, so
// runAction/runRowAction never hand back a mystery `undefined`.
function normalizeActionResult(raw) {
  if (raw === false) return { ok: true, reload: false };
  if (raw && typeof raw === 'object') {
    return {
      ok: raw.ok !== false,
      message: raw.message,
      reload: raw.reload !== undefined ? !!raw.reload : raw.ok !== false,
      data: raw.data,
      navigateTo: raw.navigateTo,
    };
  }
  return { ok: true, reload: true };
}

export class EntityDataEngine {
  constructor(schema, options = {}) {
    this.schema = schema;
    this.fixedQuery = options.fixedQuery || {};

    this.state = {
      rows: [],
      loading: true,
      error: null,
      page: 1,
      pageCount: 1,
      pageSize: options.defaultPageSize || 20,
      search: '',
      activeFilter: schema.filters?.[0]?.key || null,
      presetQuery: schema.filters?.[0]?.query || {},   // from a filters[] button
      advancedQuery: {},                                 // from advancedFilters[] inputs (user_id, date range...)
    };

    this.listeners = new Set();

    // mosyGetData/mosyPostData wrap plain fetch() and don't accept an
    // AbortSignal, so we can't cancel an in-flight request at the network
    // level anymore. Instead every load() stamps a request id; when a
    // response comes back we only apply it if it's still the most recent
    // request. This gives the same "fast filter click wins over a slower,
    // older response" guarantee the old AbortController did.
    this._requestId = 0;
    this._searchDebounce = null;
  }

  // ---- Pub/sub: any UI subscribes here to know when to re-render ----
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener); // call this to unsubscribe
  }

  _setState(partial) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn(this.state));
  }

  getState() {
    return this.state;
  }

  // ---- Response normalizer ----
  // mosyGetData / mosyPostData are inconsistent about what they hand back:
  //   - happy path            -> already-parsed JSON, e.g. { status: 'success', data, pagination }
  //   - logical failure       -> parsed JSON too, but status !== 'success'
  //   - network-level failure (res.ok === false) -> the RAW, un-jsoned
  //     Response object (see hiveUtils.jsx: `if (!res.ok) return res;`)
  //   - thrown/network error inside mosyGetData's own try/catch -> it
  //     already catches that and returns { status: 'error', message, data: [] }
  // Every call site below funnels through here so the rest of the engine
  // only ever deals with one shape: { ok, message, data, pagination }.
  async _resolveMosyResult(result) {
    if (typeof Response !== 'undefined' && result instanceof Response) {
      let body = null;
      try {
        body = await result.json();
      } catch {
        // no JSON body to parse — fall through with body = null
      }
      return {
        ok: false,
        message: body?.message || `Request failed (${result.status} ${result.statusText || ''})`.trim(),
        data: body?.data ?? [],
        pagination: body?.pagination,
      };
    }

    const ok = result?.status === 'success';
    return {
      ok,
      message: result?.message || (ok ? '' : 'Something went wrong. Please try again.'),
      data: result?.data ?? (Array.isArray(result) ? result : []),
      pagination: result?.pagination,
    };
  }

  // ---- Data loading ----
  async load() {
    const requestId = ++this._requestId;

    this._setState({ loading: true, error: null });

    // Param names MUST match mosySecureSelect's RESERVED_PARAMS exactly:
    // pageNo = which page, pageSize = rows per page.
    const params = {
      pageNo: this.state.page,
      pageSize: this.state.pageSize,
      searchAny: btoa(this.state.search || ''),
      ...this.fixedQuery,
      ...this.state.presetQuery,     // e.g. status=active from a filter button
      ...this.state.advancedQuery,   // e.g. user_id=2, shop_id=3, created_at_start=x, created_at_end=y
    };

    const raw = await mosyGetData({
      endpoint: this.schema.apiBase,
      params,
    });

    // A newer load() has since fired (filter click, page change, etc.) —
    // this response is stale, drop it silently instead of clobbering
    // whatever the newer request already set.
    if (requestId !== this._requestId) return;

    const { ok, message, data, pagination } = await this._resolveMosyResult(raw);

    this._setState({
      rows: Array.isArray(data) ? data : [],
      pageCount: pagination?.page_count ?? pagination?.pageCount ?? 1,
      loading: false,
      error: ok ? null : message,
    });
  }

  // ---- Fetch one record by id (for edit/profile forms) ----
  async getOne(id) {
    const raw = await mosyGetData({
      endpoint: this.schema.apiBase,
      params: { Node: id },
    });

    const { ok, message, data } = await this._resolveMosyResult(raw);

    if (!ok) {
      console.error('getOne failed:', message);
      return null;
    }

    return Array.isArray(data) ? data[0] ?? null : data ?? null;
  }

  // ---- Preset filter buttons (filters[]) ----
  applyFilter(filterKey) {
    const filter = this.schema.filters?.find((f) => f.key === filterKey);
    if (!filter) return;
    this._setState({ activeFilter: filterKey, presetQuery: filter.query, page: 1 });
    this.load();
  }

  // ---- Runtime filter inputs (advancedFilters[]) ----
  // Set one value: engine.setFilterValue('user_id', 2) or engine.setFilterValue('shop_id', 3)
  setFilterValue(key, value) {
    const advancedQuery = { ...this.state.advancedQuery };
    if (value === '' || value === null || value === undefined) {
      delete advancedQuery[key];
    } else {
      advancedQuery[key] = value;
    }
    this._setState({ advancedQuery, page: 1 });
    this.load();
  }

  // Reads better at call sites: engine.filter('user_id', 12)
  filter(key, value) {
    this.setFilterValue(key, value);
  }

  // Date range helper: engine.setDateRange('created_at', '2024-01-01', '2024-01-31')
  // Produces created_at_start / created_at_end — matches mosySecureSelect's suffix convention.
  setDateRange(key, start, end) {
    const advancedQuery = { ...this.state.advancedQuery };
    if (start) advancedQuery[`${key}_start`] = start; else delete advancedQuery[`${key}_start`];
    if (end) advancedQuery[`${key}_end`] = end; else delete advancedQuery[`${key}_end`];
    this._setState({ advancedQuery, page: 1 });
    this.load();
  }

  clearFilterValue(key) {
    this.setFilterValue(key, null);
  }

  clearAllAdvancedFilters() {
    this._setState({ advancedQuery: {}, page: 1 });
    this.load();
  }

  setSearch(value) {
    this._setState({ search: value });
    clearTimeout(this._searchDebounce);
    this._searchDebounce = setTimeout(() => {
      this._setState({ page: 1 });
      this.load();
    }, 300); // debounced — waits for typing to pause before hitting the API
  }

  setPage(page) {
    this._setState({ page });
    this.load();
  }

  // Change how many rows come back per page. Resets to page 1, same as
  // any other filter change — staying on "page 7" after switching to
  // 500-rows-per-page would likely be past the end of the new result set.
  setPageSize(size) {
    const parsed = parseInt(size, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return; // guard against NaN/invalid input ever reaching the API
    this._setState({ pageSize: parsed, page: 1 });
    this.load();
  }

  // ---- Convenience wrappers — UI code never computes page math or
  // repeats the "clear search + reload" sequence itself ----
  refresh() {
    this._setState({ search: '', page: 1 });
    this.load();
  }

  nextPage() {
    if (this.state.page < this.state.pageCount) this.setPage(this.state.page + 1);
  }

  prevPage() {
    if (this.state.page > 1) this.setPage(this.state.page - 1);
  }

  // ---- CRUD ----
  // All three mutations return { ok, message } so calling UI (a form's
  // onSubmit, a delete-confirm dialog, etc.) can show a real error message
  // and decide whether to close/reset itself, instead of assuming success.

  async create(values) {
    const raw = await mosyPostData({ url: `${this.schema.apiBase}`, data: values });
    const { ok, message } = await this._resolveMosyResult(raw);

    // Success responses look like { status:'success', message, sites_dataNode: 26 }
    // — the key is `${entity}_dataNode`, same alias used everywhere else
    // (route.js's DELETE handler, CompaniesProfile's searchParams.get()).
    // On the failure path `raw` may be the raw un-jsoned Response object
    // (see _resolveMosyResult), so only read this off `raw` when ok.
    const dataNodeKey = `${this.schema.entity}_dataNode`;
    const newId = ok ? raw?.[dataNodeKey] : undefined;

    if (ok) {
      await this.load();
    } else {
      this._setState({ error: message });
    }

    return { ok, message, id: newId };
  }

  async update(id, values) {
    const raw = await mosyPostData({
      url: `${this.schema.apiBase}`,
      data: { [`${this.schema.entity}_dataNode`]: id, ...values },
      method: 'PUT',
    });
    const { ok, message, data } = await this._resolveMosyResult(raw);

    // Same as create() — the API echoes back `${entity}_dataNode` on
    // success (e.g. sites_dataNode: "31"). We already know `id` here
    // since the caller passed it in, but return whatever the API
    // confirms so update()'s shape matches create()'s exactly and
    // callers can treat both the same way.
    const dataNodeKey = `${this.schema.entity}_dataNode`;
    const confirmedId = ok ? (raw?.[dataNodeKey] ?? id) : undefined;

    if (ok) {
      await this.load(); // keep the grid/list in sync with the edited row
    } else {
      this._setState({ error: message });
    }

    return { ok, message, data, id: confirmedId };
  }

  async remove(id) {
    // route.js's DELETE handler reads `${schema.entity}_delete` or `Node`
    // from the query string — it never looks for `id`. Sending `?id=`
    // meant tokenId came back null server-side, the delete ran against
    // an empty/garbage where-clause, and the route still happily
    // returned status:'success' since the query didn't error. `Node` is
    // the same alias getOne()/mosySecureSelect already use for this.
    const raw = await mosyPostData({ url: `${this.schema.apiBase}?Node=${btoa(id)}`, method: 'DELETE' });
    const { ok, message } = await this._resolveMosyResult(raw);

    if (ok) {
      await this.load();
    } else {
      this._setState({ error: message });
    }

    return { ok, message };
  }

  async runAction(actionKey) {
    const action = this.schema.actions?.find((a) => a.key === actionKey);
    if (!action) return { ok: false, message: `No action "${actionKey}" on schema.actions`, reload: false };
  
    const targetRows = action.appliesTo
      ? this.state.rows.filter((row) =>
          Object.entries(action.appliesTo).every(([k, v]) => row[k] === v)
        )
      : this.state.rows;
  
    const result = normalizeActionResult(
      await runRegisteredAction(action.key, targetRows, this.schema)
    );
  
    // Anyone subscribed (not just whoever awaited the call) can react too —
    // e.g. a toast component watching c.lastAction.
    this._setState({ lastAction: { key: actionKey, ...result, at: Date.now() } });
  
    if (result.reload) await this.load();
    return result;
  }
  
  async runRowAction(actionKey, row, router) {
    const result = normalizeActionResult(
      await runRegisteredAction(actionKey, [row], this.schema, router)
    );
  
    this._setState({ lastAction: { key: actionKey, ...result, at: Date.now() } });
  
    if (result.reload) await this.load();
    return result;
  }
  
  // Call this when the UI unmounts / closes, to stop any pending debounce
  // and make sure any in-flight load() response gets ignored when it lands.
  destroy() {
    clearTimeout(this._searchDebounce);
    this._requestId++; // invalidates any response still in flight
    this.listeners.clear();
  }
}