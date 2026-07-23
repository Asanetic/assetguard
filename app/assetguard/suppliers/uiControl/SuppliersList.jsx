'use client';
import EntityGrid from './EntityGrid';
import { SuppliersSchema } from '../schema';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function SuppliersList() {
  return <EntityGrid schema={SuppliersSchema} title="Suppliers" />;
}
