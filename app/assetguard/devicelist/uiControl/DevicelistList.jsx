'use client';
import EntityGrid from './EntityGrid';
import { DevicelistSchema } from '../schema';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function DevicelistList() {
  return <EntityGrid schema={DevicelistSchema} title="Devicelist" />;
}
