'use client';
import { mosyGetPrimaryKey } from '../../../MosyUtils/hiveUtils';
import EntityRowActionsMenu from './Entityrowactionsmenu';

// EntityRowOptions — thin wrapper now. All dropdown behavior (open/close,
// View more, Delete, custom rowLinks) lives in EntityRowActionsMenu.jsx —
// a fresh component this module owns, cloned out of componentControl.jsx's
// MosySmartDropdownActions/MosyGridRowOptions rather than importing them.
// `setters` is gone: it was threaded through the legacy version and never
// actually read anywhere downstream.
//
// Usage (inside a grid template, per row):
//   <EntityRowOptions schema={schema} row={item} profilePath={customProfilePath}
//     onChildDataOut={(data) => interpretEntityRowEvent(data, g)}
//     onRunAction={(key, row, router) => g.runRowAction(key, row, router)} />
export default function EntityRowOptions({
  schema,
  row,
  profilePath = './profile',
  onChildDataOut = () => {},
  onRunAction = () => {},
}) {
  // Was row[schema.fields[0]?.key] — fields[0] is whatever happens to be
  // listed first (row_count here, a computed display column, not an id).
  // mosyGetPrimaryKey resolves the field actually flagged primkey: true,
  // same flag schema.js already uses for the real key column — so this
  // stays correct even if fields get reordered.
  const primaryId = mosyGetPrimaryKey(schema, row);

  return (
    <EntityRowActionsMenu
      schema={schema}
      row={row}
      primaryId={primaryId}
      profilePath={profilePath}
      onChildDataOut={onChildDataOut}
      onRunAction={onRunAction}
    />
  );
}