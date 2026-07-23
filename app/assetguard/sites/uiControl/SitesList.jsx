'use client';
import EntityGrid from './EntityGrid';
import { SitesSchema } from '../schema';
import EntityTableCard from './EntityTableCard';
import TestGrid from './TestGrid';
import EntityCardGrid from './Entitycardgrid';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function SitesList() {
  return <TestGrid schema={SitesSchema} title="Sites list" />;
}
