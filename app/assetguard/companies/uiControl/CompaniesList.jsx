'use client';
import { CompaniesSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import CompaniesActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
export default function CompaniesList() {
  return <SmartGrid moduleActions={CompaniesActions} schema={CompaniesSchema} title="Companies" />;
}
