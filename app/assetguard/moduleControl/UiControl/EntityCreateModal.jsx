// EntityCreateModal.jsx
'use client';
import { closeMosyCard, MosyCard } from '../../../components/MosyCard';

const MODAL_ID = 'modal4';

/**
 * Returns a NEW schema object with per-render overrides applied — never
 * mutates schema.js's export, since other pages may hold the same object.
 *
 * @param {object} [opts.fieldOverrides] - per-key prop overrides, e.g.
 *        { deal_value: { colSpan: 6 }, contact_id: { editable: false } }
 * @param {string[]} [opts.hiddenFields] - drop these keys from every
 *        section (and the flat fallback) for THIS render only.
 * @param {object} [opts.sectionFieldOrder] - { sectionKey: [orderedKeys] }
 *        reorders a section's fields; unlisted keys keep their original
 *        relative order, appended after the ones you did list.
 */
export function applySchemaOverrides(schema, { fieldOverrides = {}, hiddenFields = [], sectionFieldOrder = {} } = {}) {
  if (!Object.keys(fieldOverrides).length && !hiddenFields.length && !Object.keys(sectionFieldOrder).length) {
    return schema;
  }

  const hiddenSet = new Set(hiddenFields);

  const fields = schema.fields
    .filter((f) => !hiddenSet.has(f.key))
    .map((f) => (fieldOverrides[f.key] ? { ...f, ...fieldOverrides[f.key] } : f));

  const reorder = (keys, sectionKey) => {
    const kept = keys.filter((k) => !hiddenSet.has(k));
    const order = sectionFieldOrder[sectionKey];
    if (!order) return kept;
    const ordered = order.filter((k) => kept.includes(k));
    const rest = kept.filter((k) => !order.includes(k));
    return [...ordered, ...rest];
  };

  const sections = schema.sections?.map((s) => ({ ...s, fields: reorder(s.fields, s.key) }));

  return { ...schema, fields, sections };
}

export function openEntityCreateModal({
  ProfileComponent,
  schema,
  presetValues = {},
  fieldOverrides = {},
  hiddenFields = [],
  sectionFieldOrder = {},
  title = 'New Record',
  hiddenActions = [],
  onSaved,
  modalSize = 'mosycard_wide',
}) {
  const close = () => closeMosyCard(MODAL_ID);
  const schemaOverride = schema
    ? applySchemaOverrides(schema, { fieldOverrides, hiddenFields, sectionFieldOrder })
    : undefined;

  MosyCard(
    title,
    <ProfileComponent
      presetValues={presetValues}
      schemaOverride={schemaOverride}
      hiddenActions={[...hiddenActions, 'back']}
      onDone={() => { onSaved?.(); 
        //close(); 
}}
    />,
    true,
    MODAL_ID,
    modalSize
  );
}

export function buildPresetFromRow(sourceRow, mappings) {
  const preset = {};
  mappings.forEach(({ sourceKey, destKey, destSchema, labelValue }) => {
    if (sourceRow?.[sourceKey] === undefined) {
      console.warn(`buildPresetFromRow: "${sourceKey}" not found on source row (mapping to "${destKey}")`);
    }
    preset[destKey] = sourceRow?.[sourceKey] ?? '';

    const destField = destSchema?.fields?.find((f) => f.key === destKey);
    if (destField?.type === 'liveSearch' && destField.labelKey) {
      preset[destField.labelKey] = labelValue ?? sourceRow?.[destField.labelKey] ?? '';
    }
  });
  return preset;
}