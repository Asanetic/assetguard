'use client';
import { useSearchParams } from 'next/navigation';
import DynamicForm from './DynamicForm';
import { MosyTemplateSchema } from '../schema';
import { useEntityFormController } from '../dataControl/useEntityFormController';
import { mosyGetSchemaTitle } from '../../../MosyUtils/hiveUtils';
// import TestGrid from './TestGrid';

// MosyTemplateProfile — pure shell. It resolves the id, wires up the
// controller, and hands DynamicForm the two strings that make this page
// look like a Company profile: `eyebrow` and `title`. DynamicForm owns
// every pixel of how those get laid out and styled (including the
// profileActions toolbar) — this file has no markup of its own. Point
// the same pattern at a different schema and both the fields AND the
// header/button set change with zero edits here.
export default function MosyTemplateProfile({ id: idProp, onDone }) {
  const searchParams = useSearchParams();
  const id = idProp ?? searchParams.get(`${MosyTemplateSchema.entity}_dataNode`);
  const form = useEntityFormController(MosyTemplateSchema, {
    id,
    onDone,
    redirectOnDelete: '/assetguard/MosyTemplate',
  });

  // TestGrid (devices at this site) intentionally left out for now:
  // <TestGrid schema={MosyTemplateSchema} fixedQuery={{ site_id: id }} title="Devices at this Site" />

  return (
    <DynamicForm
      controller={form}
      eyebrow={form.isEditing ? 'MosyTemplate Profile' : 'MosyTemplate Directory'}
      title={form.isEditing ? mosyGetSchemaTitle(MosyTemplateSchema, form.values, '') : 'New MosyTemplate'}

    />
  );
}


 