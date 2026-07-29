'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
// UI-only role gate — same convention as CompaniesGrid.jsx/useEntityFormController.jsx
import { mosyACTRLHasRole } from '../../../auth/authAccesControl';

// EntityRowActionsMenu — the per-row dropdown, owned by this module
// instead of borrowed from componentControl.jsx. Same markup/classes as
// before (table_cell_dropdown / table_cell_dropbtn / table_cell_dropdown-
// content), same CSS :hover behavior that was already working — nothing
// about how it SHOWS changed. The only real change: which links render
// now comes from schema.profileActions instead of being hardcoded inside
// componentControl.jsx's MosySmartDropdownActions/MosyGridRowOptions.
//
//   - 'View more' — controlled by an optional { key: 'view', rowAction }
//     entry in schema.profileActions. No such entry -> shown by default
//     (matches the old always-on behavior). Add one with rowAction: false
//     to hide it for a given module.
//   - 'Delete' — only rendered if schema.profileActions has a `delete`
//     entry flagged rowAction: true. Bubbles the same actionType:'delete'
//     shape as before, so Entityroweventinterpreter.jsx's MosyAlertCard
//     confirm + MosyNotify flow (the same one the profile page's Delete
//     button uses) keeps working unchanged.
//   - Everything else — schema.rowLinks PLUS any other profileActions
//     entry flagged rowAction: true — routes through onRunAction ->
//     actionsRegistry.js, same as before.
export default function EntityRowActionsMenu({
  schema,
  row,
  primaryId,
  profilePath = './profile',
  onChildDataOut = () => {},
  onRunAction = () => {},
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const token = typeof window !== 'undefined' ? window.btoa(String(primaryId)) : String(primaryId);

  // Same merged-url logic MosySmartDropdownActions used — profilePath set
  // -> soft navigation there; blank -> stay on the current page, just swap
  // the dataNode query param.
  const buildUrl = () => {
    const baseUrl = profilePath?.trim();
    const params = new URLSearchParams(baseUrl ? '' : searchParams.toString());
    params.set(`${schema.entity}_dataNode`, token);
    const finalBase = baseUrl || pathname;
    return `${finalBase}?${params.toString()}`;
  };

  const handleSelect = () => {
    onChildDataOut({
      actionType: 'select',
      actionName: `select_${schema.entity}`,
      token: primaryId,
      profile: profilePath,
      url: buildUrl(),
      router,
    });
  };

  // No 'view' entry in schema -> default on, same as the old hardcoded
  // behavior. Add one with rowAction: false to hide View more entirely.
  const viewActionDef = (schema.profileActions || []).find((a) => a.key === 'view');
  const showView = (viewActionDef ? !!viewActionDef.rowAction : true)
    && (!viewActionDef?.role || mosyACTRLHasRole(viewActionDef.role));

  // Only shows up here at all if schema.js explicitly opts a 'delete'
  // entry into the row dropdown — nothing hardcoded. Same role gate as
  // everywhere else: no role on the entry means unrestricted.
  const deleteActionDef = (schema.profileActions || []).find(
    (a) => a.key === 'delete' && a.rowAction && (!a.role || mosyACTRLHasRole(a.role))
  );

  const handleDelete = () => {
    onChildDataOut({
      actionType: 'delete',
      actionName: `delete_${schema.entity}`,
      token: primaryId,
      profile: profilePath,
      url: buildUrl(),
      confirm: deleteActionDef?.confirm,
      router,
    });
  };

  // Anything else flagged rowAction: true, minus 'view'/'delete' (handled
  // above with their own dedicated flows).
  const otherRowActions = (schema.profileActions || []).filter(
    (a) => a.rowAction && a.key !== 'delete' && a.key !== 'view' && (!a.role || mosyACTRLHasRole(a.role))
  );

  return (
    <div className="table_cell_dropdown">
      <div className="table_cell_dropbtn">
        <b>{row.row_count}</b>
      </div>
      <div className="table_cell_dropdown-content">
        {showView && (
          <a className="mosy_msdn cpointer" onClick={handleSelect}>
            <i className={`fa fa-${viewActionDef?.icon || 'edit'}`}></i> {viewActionDef?.label || 'View more'}
          </a>
        )}

        {deleteActionDef && (
          <a className="mosy_msdn cpointer" onClick={handleDelete}>
            <i className={`fa fa-${deleteActionDef.icon || 'trash'}`}></i> {deleteActionDef.label || 'Delete'}
          </a>
        )}

        {otherRowActions.map((a) => (
          <a
            key={a.key}
            className="mosy_msdn cpointer"
            onClick={() => onRunAction(a.key, row, router)}
          >
            {a.icon && <i className={`fa fa-${a.icon}`}></i>} {a.label}
          </a>
        ))}

        {schema.rowLinks?.map((link) => (
          <a
            key={link.key}
            className="mosy_msdn cpointer"
            onClick={() => onRunAction(link.key, row, router)}
          >
            {link.icon && <i className={`fa fa-${link.icon}`}></i>} {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}