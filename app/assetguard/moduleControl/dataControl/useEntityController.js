'use client';
import { useEffect, useRef, useState } from 'react';
import { EntityDataEngine } from './EntityDataEngine';

// This hook does ONE job: create an engine, subscribe to it, hand React the
// latest state + the engine's methods. All the real logic lives in the engine —
// this file has no fetch calls, no filtering logic, nothing but wiring.
export function useEntityController(schema, options = {}) {
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new EntityDataEngine(schema, options);
  }
  const engine = engineRef.current;

  const [state, setState] = useState(engine.getState());

  useEffect(() => {
    const unsubscribe = engine.subscribe(setState);
    engine.load();
    return () => {
      unsubscribe();
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.apiBase, JSON.stringify(options.fixedQuery)]);

  return {
    ...state, // includes page, pageCount, pageSize, rows, loading, error, search, advancedQuery, etc.
    schema,
    applyFilter: engine.applyFilter.bind(engine),
    setFilterValue: engine.setFilterValue.bind(engine),
    filter: engine.filter.bind(engine),
    setAdvancedQuery: engine.setAdvancedQuery.bind(engine),
    setDateRange: engine.setDateRange.bind(engine),
    clearFilterValue: engine.clearFilterValue.bind(engine),
    clearAllAdvancedFilters: engine.clearAllAdvancedFilters.bind(engine),
    setSearch: engine.setSearch.bind(engine),
    getOne: engine.getOne.bind(engine),
    setPage: engine.setPage.bind(engine),
    setPageSize: engine.setPageSize.bind(engine),
    refresh: engine.refresh.bind(engine),
    nextPage: engine.nextPage.bind(engine),
    prevPage: engine.prevPage.bind(engine),
    create: engine.create.bind(engine),
    update: engine.update.bind(engine),
    remove: engine.remove.bind(engine),
    runAction: engine.runAction.bind(engine),
    runRowAction: engine.runRowAction.bind(engine),
    load: engine.load.bind(engine),
  };
}