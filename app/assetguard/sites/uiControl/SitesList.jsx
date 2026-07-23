'use client';
import EntityGrid from './EntityGrid';
import { SitesSchema } from '../schema';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function SitesList() {
  return <EntityGrid schema={SitesSchema} title="Sites" />;
}
