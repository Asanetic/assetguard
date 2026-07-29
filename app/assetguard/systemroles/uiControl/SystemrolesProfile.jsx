'use client';
import { useSearchParams } from 'next/navigation';
import DynamicForm from '../../moduleControl/UiControl/DynamicForm';
import { SystemrolesSchema } from '../schema';
import { useEntityFormController } from '../../moduleControl/dataControl/useEntityFormController';
import { mosyGetSchemaTitle } from '../../../MosyUtils/hiveUtils';
import SystemrolesActions from '../logicControl/actionsRegistry';
import SystemmodulesList from '../../systemmodules/uiControl/SystemmodulesList';

// SystemrolesProfile — pure shell. It resolves the id, wires up the
// controller, and hands DynamicForm the two strings that make this page
// look like a Company profile: `eyebrow` and `title`. DynamicForm owns
// every pixel of how those get laid out and styled (including the
// profileActions toolbar) — this file has no markup of its own. Point
// the same pattern at a different schema and both the fields AND the
// header/button set change with zero edits here.
export default function SystemrolesProfile({ id: idProp, onDone,  hiddenActions=[] }) {
  const searchParams = useSearchParams();
  const id = idProp ?? searchParams.get(`${SystemrolesSchema.entity}_dataNode`);
  const form = useEntityFormController(SystemrolesSchema, SystemrolesActions, {
    id,
    onDone,
    redirectOnDelete: './list',
  });


  // TestGrid (devices at this site) intentionally left out for now:
  // <TestGrid schema={SystemrolesSchema} fixedQuery={{ site_id: id }} title="Devices at this Site" />

  return (
    <DynamicForm
      controller={form}
      eyebrow={form.isEditing ? 'Systemrole Details' : 'System roles Directory'}
      title={form.isEditing ? mosyGetSchemaTitle(SystemrolesSchema, form.values, '') : 'New Role'}    
      hiddenActions={hiddenActions}
    />

  );
}


 