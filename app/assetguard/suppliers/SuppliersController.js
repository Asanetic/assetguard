'use client';
import { useEntityController } from '../../../lib/useEntityController';
import { MosytemplateSchema } from '../schema';

// Dedicated data handler for this module. Fetches, filters, saves — returns
// results already shaped and ready to hand to the UI. Never edit this by hand;
// it's fully driven by schema.js.
export function useMosytemplateData(options) {
  return useEntityController(MosytemplateSchema, options);
}
