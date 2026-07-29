'use client';
import { Templatev1Schema } from '../schema';
import Templatev1Grid from './Templatev1Grid';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function Templatev1List() {
  return <Templatev1Grid schema={Templatev1Schema} title="Templatev1" />;
}
