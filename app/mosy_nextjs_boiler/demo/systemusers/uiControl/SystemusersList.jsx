'use client';
import { SystemusersSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import SystemusersActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
 
export default function SystemusersList({
  fixedQuery = {},
  dataOut = {},
  title = 'System users',
  description = 'System users list ',
  customProfilePath = './profile',
  moduleActions = SystemusersActions,
  schema = SystemusersSchema,
}) {
  return (
    <SmartGrid
      moduleActions={moduleActions}
      schema={schema}
      title={title}
      description={description}
      customProfilePath={customProfilePath}
      fixedQuery={fixedQuery}
      dataOut={dataOut}
    />
  );
}
