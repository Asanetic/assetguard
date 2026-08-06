'use client';
import { DevicesSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import DevicesActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
// export default function DevicesList() {
//   return <SmartGrid moduleActions={DevicesActions} schema={DevicesSchema} title="Devices" />;
// }
export default function DevicesList({
  fixedQuery = {},
  dataOut = {},
  title = 'Devices',
  description = 'Devices list ',
  customProfilePath = './profile',
  moduleActions = DevicesActions,
  schema = DevicesSchema,
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