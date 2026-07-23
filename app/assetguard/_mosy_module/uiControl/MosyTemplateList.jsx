'use client';
import EntityGrid from './EntityGrid';
import { MosyTemplateSchema } from '../schema';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function MosyTemplateList() {
  return <EntityGrid schema={MosyTemplateSchema} title="MosyTemplate" />;
}
