'use client';
import { useSearchParams } from 'next/navigation';
import DynamicForm from '../../moduleControl/UiControl/DynamicForm';
import { RegionsSchema } from '../schema';
import { useEntityFormController } from '../../moduleControl/dataControl/useEntityFormController';
import { mosyGetSchemaTitle } from '../../../MosyUtils/hiveUtils';
import RegionsActions from '../logicControl/actionsRegistry';

// RegionsProfile — pure shell. It resolves the id, wires up the
// controller, and hands DynamicForm the two strings that make this page
// look like a Company profile: `eyebrow` and `title`. DynamicForm owns
// every pixel of how those get laid out and styled (including the
// profileActions toolbar) — this file has no markup of its own. Point
// the same pattern at a different schema and both the fields AND the
// header/button set change with zero edits here.
export default function RegionsProfile({ id: idProp, onDone }) {
  const searchParams = useSearchParams();
  const id = idProp ?? searchParams.get(`${RegionsSchema.entity}_dataNode`);
  const form = useEntityFormController(RegionsSchema, RegionsActions, {
    id,
    onDone,
    redirectOnDelete: './list',
  });

  // TestGrid (devices at this site) intentionally left out for now:
  // <TestGrid schema={RegionsSchema} fixedQuery={{ site_id: id }} title="Devices at this Site" />

  return (
    <>
    <DynamicForm
      controller={form}
      eyebrow={form.isEditing ? 'Regions Profile' : 'Regions Directory'}
      title={form.isEditing ? mosyGetSchemaTitle(RegionsSchema, form.values, '') : 'New Region'}

    />
    
    </>
  );
}


 