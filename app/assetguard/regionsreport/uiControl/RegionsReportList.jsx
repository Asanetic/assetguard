'use client';
import EntityGrid from './EntityGrid';
import { RegionsReportSchema } from '../schema';
import EntityTableCard from './EntityTableCard';
import TestGrid from './TestGrid';
import EntityCardGrid from './Entitycardgrid';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function RegionsReportList() {
  return <TestGrid schema={RegionsReportSchema} title="Site list" />;
}
