'use client';
import EntityGrid from './EntityGrid';
import { MosyTemplateSchema } from '../schema';
import EntityTableCard from './EntityTableCard';
import TestGrid from './TestGrid';
import EntityCardGrid from './Entitycardgrid';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function MosyTemplateList() {
  return <TestGrid schema={MosyTemplateSchema} title="MosyTemplate list" />;
}
