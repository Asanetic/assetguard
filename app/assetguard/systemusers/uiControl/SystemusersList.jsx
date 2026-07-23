'use client';
import EntityGrid from './EntityGrid';
import { SystemusersSchema } from '../schema';
import EntityTableCard from './EntityTableCard';
import TestGrid from './TestGrid';
import EntityCardGrid from './Entitycardgrid';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function SystemusersList() {
  return <TestGrid schema={SystemusersSchema} title="System users" />;
}
