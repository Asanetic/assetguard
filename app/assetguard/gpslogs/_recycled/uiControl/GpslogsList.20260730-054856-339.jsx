'use client';
import { GpslogsSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import GpslogsActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
// export default function GpslogsList() {
//   return <SmartGrid moduleActions={GpslogsActions} schema={GpslogsSchema} title="Gpslogs" />;
// }
export default function GpslogsList({
  fixedQuery = {},
  dataOut = {},
  title = 'Gpslogs',
  description = 'Gpslogs list ',
  customProfilePath = './profile',
  moduleActions = GpslogsActions,
  schema = GpslogsSchema,
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