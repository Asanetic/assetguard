'use client';
import { PendingapprovalSchema } from '../schema';
import PendingapprovalGrid from './PendingapprovalGrid';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function PendingapprovalList() {
  return <PendingapprovalGrid schema={PendingapprovalSchema} title="Pending approval" />;
}
