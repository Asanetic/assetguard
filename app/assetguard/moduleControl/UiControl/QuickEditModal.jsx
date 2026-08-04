// QuickEditModal.jsx
// Opens a small modal that edits a SUBSET of an entity's schema.fields on
// ONE existing row. Reuses the exact same FIELD_COMPONENTS DynamicForm
// uses — no parallel field-type logic, no DSL string to parse.
//
// Visual language matches FormLayout.jsx exactly (same --dyn-* variables,
// same warm ivory/charcoal palette, same brass accent hairline, same
// Georgia serif title) so a quick-edit modal never looks like a
// different product from the full profile page it was launched from.
//
// Built for actionsRegistry.js call sites: ctx already has {schema, rows,
// update, refresh}, this just needs {fieldKeys, onSubmit} — or use
// quickEditFromRow(ctx, opts) below to skip wiring onSubmit by hand.

'use client';
import { useEffect, useState } from 'react';
import { FIELD_COMPONENTS, TextInput } from './FormFields';
import { formLayoutStyles } from './FormLayout';
import { closeMosyCard, MosyCard } from '../../../components/MosyCard';
import { MosySnackWidget } from '../../../MosyUtils/ActionModals';

const MODAL_ID = 'modal3'; // matches legacy smartDataUpdateUiControl's modal slot

/**
 * @param {object}   opts.schema      - full module schema.js export (needed for field defs)
 * @param {string[]} opts.fieldKeys   - which schema.fields keys to show, in order
 * @param {object}   opts.row         - record being edited (seeds values + title template)
 * @param {(values) => Promise<{ok,message}>} opts.onSubmit
 *        - typically `(values) => update(row.record_id, values)` from ctx
 * @param {string}   [opts.title]     - supports {{field}} templating against row
 * @param {string}   [opts.eyebrow]   - small caps label above the title, e.g. "LEADS · QUICK EDIT"
 * @param {object}   [opts.fieldOverrides] - per-key prop overrides, e.g.
 *        { deal_status: { options: ['Won','Lost','Pending'] } } — merged
 *        onto the schema field def, doesn't touch schema.js itself
 * @param {Array}    [opts.actions]   - override the button row entirely.
 *        Defaults to [Cancel, Save]. Each: { key, label, variant, onClick }.
 *        onClick receives (values).
 * @param {() => void} [opts.onClose]
 */
export function openQuickEditModal({
  schema,
  fieldKeys,
  row,
  onSubmit,
  title = 'Update Record',
  eyebrow,
  fieldOverrides = {},
  actions,
  onClose,
  modalSize ="mosycard_medium"
}) {
  const fields = fieldKeys
    .map((key) => {
      const base = schema.fields.find((f) => f.key === key);
      if (!base) {
        console.warn(`openQuickEditModal: "${key}" not found in schema.fields for ${schema.entity}`);
        return null;
      }
      return { ...base, ...fieldOverrides[key] };
    })
    .filter(Boolean);

  const resolvedTitle = title.replace(/\{\{(.*?)\}\}/g, (_, k) => row?.[k.trim()] ?? '');

  MosyCard(
    '',
    <QuickEditForm
      fields={fields}
      row={row}
      title={resolvedTitle}
      eyebrow={eyebrow}
      onSubmit={onSubmit}
      actions={actions}
      onClose={onClose}
    />,
    false,
    MODAL_ID,
    modalSize
  );
}

/**
 * Convenience wrapper around openQuickEditModal for the common
 * actionsRegistry.js case: edit some fields on ctx.rows[0], save via
 * ctx.update, then make sure the grid/form refreshes regardless of
 * whether ctx.update already does it internally.
 */
export function quickEditFromRow(ctx, opts) {
  const { rows, schema, update, refresh } = ctx;
  const row = rows?.[0];
  if (!row) {
    console.warn('quickEditFromRow: no row in ctx.rows');
    return;
  }

  const getId = opts.getId || ((r) => r.record_id);

  openQuickEditModal({
    schema,
    row,
    ...opts,
    onSubmit: async (values) => {
      const result = await update(getId(row), values);
      if (result?.ok !== false) refresh?.();
      return result;
    },
  });
}

function QuickEditForm({ fields, row, title, eyebrow, onSubmit, actions, onClose }) {
  const [values, setValues] = useState(() => {
    const initial = {};
    fields.forEach((f) => { initial[f.key] = row?.[f.key] ?? ''; });
    return initial;
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState(null);
  const [entered, setEntered] = useState(false);

  // Mount-triggered entrance — CSS transition needs a frame between
  // "start state" and "end state" classes, a raf is enough (no need for
  // a timeout that could jank on a slow tab).
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const setValue = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => (e[key] ? { ...e, [key]: null } : e));
  };

  const validate = () => {
    const newErrors = {};
    fields.forEach((f) => {
      if (f.required && !values[f.key]) newErrors[f.key] = `${f.label} is required`;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const close = () => { closeMosyCard(MODAL_ID); onClose?.(); };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (result?.ok === false) {
        setSnack({ type: 'error', content: result.message || 'Update failed' });
      } else {
        setSnack({ type: 'success', content: result?.message || 'Updated' });
        setTimeout(close, 700);
      }
    } catch (err) {
      setSnack({ type: 'error', content: 'Something went wrong: ' + err });
    } finally {
      setSubmitting(false);
    }
  };

  const buttons = actions || [
    { key: 'cancel', label: 'Cancel', variant: 'ghost', onClick: close },
    { key: 'save', label: submitting ? 'Saving…' : 'Save changes', variant: 'primary', onClick: handleSave },
  ];

  return (
    <div className={`dyn-form-scope qem-scope ${entered ? 'qem-entered' : ''}`}>
      <div className="qem-card">
        <button type="button" className="qem-close" aria-label="Close" onClick={close}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="qem-header">
          {eyebrow && <span className="qem-eyebrow">{eyebrow}</span>}
          <h3 className="qem-title">{title}</h3>
        </div>
        <div className="qem-divider" />

        <div className="qem-body">
          <div className="row dyn-grid justify-content-center">
            {fields.map((f) => {
              const FieldComponent = FIELD_COMPONENTS[f.type] || TextInput;
              const colSpan = f.colSpan || 12;
              return (
                <div key={f.key} className={`col-md-${colSpan} dyn-field`}>
                  {!FieldComponent.selfLabeled && (
                    <label className="dyn-label text-left">
                      {f.label}{f.required && <span className="dyn-required"> *</span>}
                    </label>
                  )}
                  <FieldComponent
                    field={f}
                    value={values[f.key]}
                    setValue={setValue}
                    readOnly={f.editable === false}
                    row={row}
                  />
                  {errors[f.key] && <div className="dyn-error">{errors[f.key]}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="qem-footer">
          {buttons.map((b) => (
            <button
              key={b.key}
              type="button"
              className={`qem-btn qem-btn-${b.variant || 'ghost'}`}
              onClick={() => b.onClick(values)}
              disabled={submitting}
            >
              {b.key === 'save' && submitting && <span className="dyn-spinner" />}
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {snack && (
        <div className="qem-snack-anchor">
          <MosySnackWidget
            curr_position="top"
            bg={snack.type === 'error' ? '#b91c1c' : '#0d7a6c'}
            content={snack.content}
            duration={3000}
            type="custom"
          />
        </div>
      )}

      <style jsx global>{formLayoutStyles}</style>
      <style jsx global>{quickEditModalStyles}</style>
    </div>
  );
}

// ---- Modal-specific chrome. Reuses .dyn-form-scope's CSS variables
// (defined in formLayoutStyles) for every color — this file adds zero
// new hex values. The luxury cues are structural: generous padding, a
// single brass hairline under the title, a soft multi-layer shadow on
// the card, and a restrained entrance transition — not extra color.
const quickEditModalStyles = `

`;