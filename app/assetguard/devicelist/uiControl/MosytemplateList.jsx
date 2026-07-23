'use client';
import EntityGrid from './EntityGrid';
import { MosytemplateSchema } from '../schema';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function MosytemplateList() {
  return <EntityGrid schema={MosytemplateSchema} title="Mosytemplate" />;
}
