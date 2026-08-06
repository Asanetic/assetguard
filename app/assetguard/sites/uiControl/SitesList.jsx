'use client';
import { SitesSchema } from '../schema';
import SmartGrid from '../../moduleControl/UiControl/SmartGrid';
import SitesActions from '../logicControl/actionsRegistry';

// Thin wrapper only — all real grid logic lives in components/EntityGrid.jsx
// export default function SitesList() {
//   return <SmartGrid moduleActions={SitesActions} schema={SitesSchema} title="Sites" />;
// }
export default function SitesList({
  fixedQuery = {},
  dataOut = {},
  title = 'Sites',
  description = 'Sites list ',
  customProfilePath = './profile',
  moduleActions = SitesActions,
  schema = SitesSchema,
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