// EntityDataEngine — the actual "kitchen." Zero React. Zero DOM. Zero UI knowledge.
// Any UI (React, plain HTML/JS, Vue, a downloaded jQuery dashboard) can use this
// by creating one instance and calling .subscribe() to get notified when data changes.

import { runRegisteredAction } from '../logicControl/actionsRegistry';

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
      search: '',
      activeFilter: schema.filters?.[0]?.key || null,
      presetQuery: schema.filters?.[0]?.query || {},   // from a filters[] button
      advancedQuery: {},                                 // from advancedFilters[] inputs (user_id, date range...)
    };

    this.listeners = new Set();
    this._abortController = null;
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

  // ---- Data loading ----
  async load() {
    // Cancel any in-flight request so a fast filter click doesn't get overwritten
    // by an older, slower response landing later.
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();

    this._setState({ loading: true, error: null });

    try {
      const params = new URLSearchParams({
        page: this.state.page,
        searchAny: btoa(this.state.search),
        ...this.fixedQuery,
        ...this.state.presetQuery,     // e.g. status=active from a filter button
        ...this.state.advancedQuery,    // e.g. user_id=2, shop_id=3, created_at_start=x, created_at_end=y
      });

      const res = await fetch(`${this.schema.apiBase}?${params}`, {
        signal: this._abortController.signal,
      });
      const data = await res.json();

      this._setState({
        rows: Array.isArray(data) ? data : data.data || [],
        pageCount: data.pageCount || 1,
        loading: false,
      });
    } catch (err) {
      if (err.name === 'AbortError') return; // expected when superseded by a newer request
      this._setState({ error: err.message, loading: false });
    }
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

  // ---- CRUD ----
  async create(values) {
    await fetch(this.schema.apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    await this.load();
  }

  async update(id, values) {
    await fetch(this.schema.apiBase, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...values }),
    });
    await this.load();
  }

  async remove(id) {
    await fetch(`${this.schema.apiBase}?id=${id}`, { method: 'DELETE' });
    await this.load();
  }

  // ---- Registered actions (e.g. "Send SMS to Inactive") ----
  async runAction(actionKey) {
    const action = this.schema.actions?.find((a) => a.key === actionKey);
    if (!action) return;

    const targetRows = action.appliesTo
      ? this.state.rows.filter((row) =>
          Object.entries(action.appliesTo).every(([k, v]) => row[k] === v)
        )
      : this.state.rows;

    await runRegisteredAction(action.key, targetRows, this.schema);
    await this.load();
  }

  // Call this when the UI unmounts / closes, to stop any pending debounce or fetch.
  destroy() {
    clearTimeout(this._searchDebounce);
    if (this._abortController) this._abortController.abort();
    this.listeners.clear();
  }
}
