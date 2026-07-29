'use client';
import { SystemmodulesSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import SystemmodulesActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function SystemmodulesList() {
  return <SmartGrid moduleActions={SystemmodulesActions} schema={SystemmodulesSchema} title="System Modules" />;
}
