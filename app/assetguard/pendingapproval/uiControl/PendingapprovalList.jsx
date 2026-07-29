'use client';
import { PendingapprovalSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import PendingapprovalActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
// export default function PendingapprovalList() {
//   return <SmartGrid moduleActions={PendingapprovalActions} schema={PendingapprovalSchema} title="Pendingapproval" />;
// }
export default function PendingapprovalList({
  fixedQuery = {},
  dataOut = {},
  title = 'Pending approval',
  description = 'Pending approval list ',
  customProfilePath = './profile',
  moduleActions = PendingapprovalActions,
  schema = PendingapprovalSchema,
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