'use client';
import { useEntityController } from './dataControl/useEntityController';
import { CompaniesSchema } from './schema_33';

// Dedicated data handler for this module. Fetches, filters, saves — returns
// results already shaped and ready to hand to the UI. Never edit this by hand;
// it's fully driven by schema.js.
export function useCompaniesData(options) {
  return useEntityController(CompaniesSchema, options);
}
