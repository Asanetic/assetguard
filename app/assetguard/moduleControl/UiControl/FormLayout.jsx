'use client';
import { useState, useEffect } from 'react';
import { FIELD_COMPONENTS, TextInput, SelectInput } from './FormFields';

// FormLayout — arranges fields into visual groups. Two skins are
// supported, picked via schema.formStyle:
//
//   'card'      — ONE white rounded card holding every section, each
//                  section is just a label + thin divider (TailAdmin
//                  "Add Product" look). This is the default.
//   'sectioned' — every section gets its OWN bordered box (Symphony/
//                  legacy RegisteredsitesProfile look). Set this on a
//                  schema to keep that older look where you already built it.

// colSpan is now always Bootstrap-style: N out of 12, full stop — same
// meaning whether it's on a field or a customBlock, regardless of what
// section.columns happens to be. section.columns only supplies the
// DEFAULT width for fields/blocks that don't set their own colSpan (e.g.
// columns: 3 -> fields default to col-md-4, three per row) — set colSpan
// explicitly on any individual entry to override that default, so email
// can sit at colSpan: 3 right next to main_purpose at colSpan: 7 in the
// same row (10/12, two columns spare) regardless of the section default.
function resolveColSpan(explicitColSpan, sectionColumns) {
  if (explicitColSpan) return explicitColSpan;
  const cols = sectionColumns || 3;
  return Math.max(1, Math.round(12 / cols));
}

// function FieldRenderer({ f, value, error, setValue, schema, sectionColumns, row }) {
//   const FieldComponent = FIELD_COMPONENTS[f.type] || TextInput;
//   const colSpan = resolveColSpan(f.colSpan, sectionColumns);
//   return (
//     <div className={`col-md-${colSpan} dyn-field `}>
//       {!FieldComponent.selfLabeled && (
//         <label className="dyn-label text-left">
//           {f.label}{f.required && <span className="dyn-required"> *</span>}
//           {f.allowAddNew && <span className="dyn-add-new"> | + Add new</span>}
//         </label>
//       )}
//       <FieldComponent field={f} value={value} setValue={setValue} readOnly={f.editable === false} schema={schema} row={row} />
//       {error && <div className="dyn-error text-left">{error}</div>}
//     </div>
//   );
// }


function FieldRenderer({ f, value, error, setValue, schema, sectionColumns, row }) {
  const FieldComponent = FIELD_COMPONENTS[f.type] || TextInput;

  if (FieldComponent.hiddenField) {
    return <FieldComponent field={f} value={value} setValue={setValue} schema={schema} row={row} />;
  }

  const colSpan = resolveColSpan(f.colSpan, sectionColumns);
  return (
    <div className={`col-md-${colSpan} dyn-field `}>
      {!FieldComponent.selfLabeled && (
        <label className="dyn-label text-left">
          {f.label}{f.required && <span className="dyn-required"> *</span>}
          {f.allowAddNew && <span className="dyn-add-new"> | + Add new</span>}
        </label>
      )}
      <FieldComponent field={f} value={value} setValue={setValue} readOnly={f.editable === false} schema={schema} row={row} />
      {error && <div className="dyn-error text-left">{error}</div>}
    </div>
  );
}

// CustomBlock — renders one schema.customBlocks entry. Gets the exact
// same props a real field's FieldComponent gets (values, setValue,
// errors, schema, isEditing) plus the block's own definition as `field`
// — so a raw component dropped in via the schema reads/writes the SAME
// form state Save/Clone/create/update already use. It's not a separate
// island bolted onto the form; as far as the entity controller is
// concerned, whatever key(s) the component calls setValue() on are just
// more form data.
//
// `row` is the raw fetched record (useEntityFormController's `record`,
// not the live-editing `values`) — for anything the block needs that
// isn't a declared schema field: joined data, extra API response
// properties, whatever the record has that never went through
// buildDefaults. null on a new/create-mode record.
//
// Blocks default to full-width (12) rather than the section's own
// per-field default — a block dropped in with no colSpan is more often
// a standalone widget than "just another 4-wide field."
function CustomBlock({ block, schema, values, errors, setValue, isEditing, row }) {
  const Component = block?.component;
  if (!Component) return null;
  const colSpan = block.colSpan || 12;
  return (
    <div className={`col-md-${colSpan} dyn-field dyn-custom-block`}>
      <Component
        values={values}
        errors={errors}
        setValue={setValue}
        schema={schema}
        isEditing={isEditing}
        row={row}
        field={block}
      />
    </div>
  );
}

export function FormSection({ section, schema, values, errors, setValue, isEditing, row }) {
  const fieldsByKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
  // A customBlock's `key` sits in section.fields exactly like a real
  // field key — same list, same ordering controls position. No
  // after/before/afterSection/position properties to reason about;
  // wherever the key appears is where the component renders.
  const blocksByKey = Object.fromEntries((schema.customBlocks || []).map((b) => [b.key, b]));
  const colCount = section.columns || 3;
  const variant = schema.formStyle || 'card';

  const grid = (
    <div className="row dyn-grid p-0 m-0 col-md-12  ">
      {section.fields.map((key) => {
        const f = fieldsByKey[key];
        if (f) {
          if (f.computed && !isEditing) return null;
          return <FieldRenderer key={key} f={f} value={values[key]} error={errors[key]} setValue={setValue} schema={schema} sectionColumns={colCount} row={row} />;
        }
        const b = blocksByKey[key];
        if (b) {
          return <CustomBlock key={key} block={b} schema={schema} values={values} errors={errors} setValue={setValue} isEditing={isEditing} row={row} />;
        }
        return null; // key matches neither a field nor a customBlock
      })}
    </div>
  );

  if (variant === 'sectioned') {
    return (
      <div className="dyn-card dyn-card-bordered">
        <div className="dyn-card-header-centered">
          <span className="dyn-card-header-line" />
          <span className="dyn-card-title text-left">{section.label}</span>
          <span className="dyn-card-header-line" />
        </div>
        {grid}
      </div>
    );
  }

  // 'card' variant — no border/box per section, just a label + a shaded
  // tray behind the fields so white inputs have contrast to sit on.
  // The enclosing white page card comes from DynamicForm, once, around
  // all sections.
  return (
    <div className="dyn-section">
      {section.label && <div className="dyn-section-title  text-left">{section.label}</div>}
      <div className="dyn-section-panel px-0">{grid}</div>
    </div>
  );
}

// NOC / Response-team style rows: pick a name, phone + email auto-fill.
function LinkedContactRow({ row, values, setValue }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    fetch(row.endpoint || '/api/assetguard/contacts')
      .then((r) => r.json())
      .then((d) => setOptions(d.data || d || []))
      .catch((err) => console.error('LinkedContactRow fetch failed:', err.message));
  }, [row.endpoint]);

  const handleSelect = (e) => {
    const contactId = e.target.value;
    const match = options.find((o) => String(o.id) === contactId);
    setValue(row.nameField, contactId);
    setValue(row.phoneField, match?.phone ?? '');
    setValue(row.emailField, match?.email ?? '');
  };

  return (
    <div className="dyn-grid" style={{ '--cols': 3 }}>
      <div className="dyn-field">
        <label className="dyn-label text-left">{row.label}{row.required && <span className="dyn-required"> *</span>}</label>
        <select className="dyn-input dyn-select" value={values[row.nameField] || ''} onChange={handleSelect}>
          <option value="">Select name</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div className="dyn-field">
        <label className="dyn-label dyn-label-muted">Phone (auto-filled)</label>
        <input className="dyn-input" value={values[row.phoneField] || ''} readOnly />
      </div>
      <div className="dyn-field">
        <label className="dyn-label dyn-label-muted">Email (auto-filled)</label>
        <input className="dyn-input" value={values[row.emailField] || ''} readOnly />
      </div>
    </div>
  );
}

export function FieldGroup({ group, values, setValue }) {
  return (
    <div className="dyn-section">
      <div className="dyn-section-title">
        {group.icon && <i className={`fa fa-${group.icon} mr-2`} />}
        {group.label}
        {group.description && <span className="dyn-section-subtitle"> — {group.description}</span>}
      </div>

      {group.companyField && (
        <div className="dyn-field" style={{ maxWidth: 320, marginBottom: 16 }}>
          <label className="dyn-label">Company</label>
          <SelectInput
            field={{ key: group.companyField, label: 'Company', options: group.companyOptions || [] }}
            value={values[group.companyField]}
            setValue={setValue}
          />
        </div>
      )}

      {group.rows.map((row) => (
        <LinkedContactRow key={row.nameField} row={row} values={values} setValue={setValue} />
      ))}
    </div>
  );
}

// Exact-match CSS. Colors/radii live under .dyn-form-scope as CSS
// variables — DynamicForm.jsx sets --dyn-primary etc. inline straight
// from mosyThemeConfigs (same pattern as the grid's .etc-card), so this
// file has ONE color to keep in sync with your theme, not several.
// color-mix() handles hover/soft-tint shades at render time instead of
// precomputed hex — no shading helper function to maintain.
//
// Premium pass: a warm ivory/charcoal palette instead of cold slate-gray,
// a restrained brass accent used in exactly one place (the header rule),
// and a real page-card elevation (border + all-around shadow) instead of
// the near-invisible 1px shadow this used to ship with. The toolbar no
// longer relies on Bootstrap's .row/.mx-*/.p-* utilities — those were
// injecting negative margins that fought this file's own flex/gap rules
// and were the actual cause of the "More" popover throwing the row out
// of alignment. It's a plain flex row now, positioned purely by this
// stylesheet.
export const formLayoutStyles = `
  
`;