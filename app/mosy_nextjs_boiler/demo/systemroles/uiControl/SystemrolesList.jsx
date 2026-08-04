'use client';
import { SystemrolesSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import SystemrolesActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function SystemrolesList() {
  return <SmartGrid moduleActions={SystemrolesActions} schema={SystemrolesSchema} title="System roles" />;
}
