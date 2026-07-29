'use client';
import { RegionsSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import RegionsActions from '../logicControl/actionsRegistry';


// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function RegionsList() {
  return <SmartGrid moduleActions={RegionsActions} schema={RegionsSchema} title="Regions" />;
}
