'use client';
import { Smarttemplatev1Schema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import Smarttemplatev1Actions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
// export default function Smarttemplatev1List() {
//   return <SmartGrid moduleActions={Smarttemplatev1Actions} schema={Smarttemplatev1Schema} title="Smarttemplatev1" />;
// }
export default function Smarttemplatev1List({
  fixedQuery = {},
  dataOut = {},
  title = 'Smarttemplatev1',
  description = 'Smarttemplatev1 list ',
  customProfilePath = './profile',
  moduleActions = Smarttemplatev1Actions,
  schema = Smarttemplatev1Schema,
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