'use client';
import EntityGrid from './EntityGrid';
import { PaymentsSchema } from '../schema';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function PaymentsList() {
  return <EntityGrid schema={PaymentsSchema} title="Payments" />;
}
