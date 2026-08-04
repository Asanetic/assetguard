'use client';
import { useRouter } from 'next/navigation';
import { MosySmartDropdownActions, MosyGridRowOptions } from '../../UiControl/componentControl';
import { mosyGetPrimaryKey } from '../../../MosyUtils/hiveUtils';

// EntityRowOptions — the legacy hover dropdown, generalized. Same markup/
// classes as the legacy TasksList row-count cell, so existing CSS keeps
// working unchanged.
//
// Every schema.rowLinks entry — navigation or mutation — routes through
// ONE system: actionsRegistry.js, via onRunAction. There's no separate
// rowLinksRegistry anymore. A "navigate somewhere" action just calls
// router.push() inside its own registered function; a "mutate this row"
// action does a fetch/etc. Both get (rows, schema, router) as args, so
// either kind of behavior is available without a second registry file.
//
// Usage (inside a grid template, per row):
//   <EntityRowOptions schema={schema} row={item} profilePath={customProfilePath}
//     setters={{ parentStateSetters }}
//     onChildDataOut={(data) => interpretEntityRowEvent(data, g)}
//     onRunAction={(key, row, router) => g.runRowAction(key, row, router)} />
export default function EntityRowOptions({
  schema,
  row,
  profilePath = './profile',
  setters = {},
  onChildDataOut = () => {},
  onRunAction = () => {},
}) {
  const router = useRouter();
  // Was row[schema.fields[0]?.key] — fields[0] is whatever happens to be
  // listed first (row_count here, a computed display column, not an id).
  // mosyGetPrimaryKey resolves the field actually flagged primkey: true,
  // same flag schema.js already uses for the real key column — so this
  // stays correct even if fields get reordered.
  const primaryId = mosyGetPrimaryKey(schema, row);

  console.log(`EntityRowOptions ${primaryId}`, row , schema)

  return (
    <div className="table_cell_dropdown">
      <div className="table_cell_dropbtn">
        <b>{row.row_count}</b>
      </div>
      <div className="table_cell_dropdown-content">
        <MosySmartDropdownActions
          tblName={schema.entity}
          setters={setters}
          attributes={`${primaryId}:${profilePath}:false`}
          callBack={onChildDataOut}
        />

        {schema.rowLinks?.map((link) => (
          <MosyGridRowOptions
            key={link.key}
            action={`_${link.key}`}
            label={` ${link.label}`}
            icon={link.icon || 'list'}
            dataIn={() => onRunAction(link.key, row, router)} // only runs on click
            callBack={() => {}} // the registered action handles everything itself; nothing to bubble up
          />
        ))}
      </div>
    </div>
  );
}



