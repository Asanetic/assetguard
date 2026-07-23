'use client';
import EntityGrid from './EntityGrid';
import { SitereportsSchema } from '../schema';
import EntityTableCard from './EntityTableCard';
import TestGrid from './TestGrid';
import EntityCardGrid from './Entitycardgrid';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function SitereportsList() {
  return <TestGrid schema={SitereportsSchema} title="Site list" />;
}
