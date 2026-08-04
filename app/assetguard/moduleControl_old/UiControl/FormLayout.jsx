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

function FieldRenderer({ f, value, error, setValue, schema, sectionColumns, row }) {
  const FieldComponent = FIELD_COMPONENTS[f.type] || TextInput;
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
      <div className="dyn-section-panel">{grid}</div>
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
        <label className="dyn-label">{row.label}{row.required && <span className="dyn-required"> *</span>}</label>
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
  .dyn-form-scope {
    --dyn-ink: #16181f;
    --dyn-body: #363b46;
    --dyn-muted: #83808a;
    --dyn-line: #e6e2d8;
    --dyn-surface:rgb(247, 247, 247);

    --dyn-primary:rgb(6, 39, 66);
    --dyn-primary-contrast: #ffffff;
    --dyn-accent: #a3823f;

    --dyn-success: #0d7a6c;
    --dyn-warning: #b45309;
    --dyn-danger: #b91c1c;
    --dyn-radius: 10px;

    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    padding: 0 clamp(0.75rem, 2.5vw, 2rem);
  }

  /* ---- Page header: eyebrow + title on the left, profileActions on the
     right, one shared row so a page never needs its own separate title
     element. A single brass hairline underneath is the one accent color
     in the whole system — everything else stays quiet on purpose. ---- */
  .dyn-page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1.25rem 2rem;
    padding: 0.5rem 0 0;
  }
  .dyn-page-header-text { min-width: 0; }
  .dyn-eyebrow {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--dyn-accent);
    margin-bottom: 0.4rem;
  }
  .dyn-page-title {
    font-family: Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
    font-size: 1.55rem;
    font-weight: 600;
    color: var(--dyn-ink);
    letter-spacing: 0.01em;
    line-height: 1.25;
    margin: 0;
  }
  .dyn-header-divider {
    height: 1px;
    margin: 1.4rem 0 2.25rem;
    background: linear-gradient(
      90deg,
      var(--dyn-accent) 0%,
      color-mix(in srgb, var(--dyn-accent) 25%, var(--dyn-line)) 12%,
      var(--dyn-line) 30%,
      var(--dyn-line) 100%
    );
  }

  /* ---- Toolbar: schema.profileActions buttons. Plain flex — no
     Bootstrap row/utility classes mixed in, so nothing here fights an
     ancestor's spacing rules. ---- */
  .dyn-toolbar-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .dyn-more-wrap { position: relative; }
  .dyn-more-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 200px;
    max-width: min(260px, 90vw);
    background: #fff;
    border: 1px solid var(--dyn-line);
    border-radius: var(--dyn-radius);
    box-shadow: 0 16px 32px -8px rgba(22, 24, 31, 0.22), 0 2px 8px rgba(22, 24, 31, 0.08);
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    z-index: 30;
  }
  .dyn-more-item {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    padding: 0.55rem 0.7rem;
    border: none;
    background: transparent;
    border-radius: 7px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--dyn-body);
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.12s ease;
  }
  .dyn-more-item:hover { background: var(--dyn-surface); }
  .dyn-more-item:disabled { opacity: 0.5; cursor: not-allowed; }
  .dyn-more-item-outline-success { color: var(--dyn-success); }
  .dyn-more-item-outline-warning { color: var(--dyn-warning); }
  .dyn-more-item-outline-danger { color: var(--dyn-danger); }
  .dyn-more-item-primary { color: var(--dyn-primary); }

  /* ---- Page card ---- */
  .dyn-page-card {
    background: #fff;
    border: 1px solid var(--dyn-line);
    border-radius: 18px;
    box-shadow:
      0 1px 2px rgba(22, 24, 31, 0.04),
      0 24px 48px -28px rgba(22, 24, 31, 0.28),
      0 0 0 1px rgba(22, 24, 31, 0.02);
    padding: 2.5rem 2.75rem 2.75rem;
    margin-bottom: 2.5rem;
  }

  .dyn-section { margin-bottom: 1.75rem; }
  .dyn-section:last-child { margin-bottom: 0; }
  .dyn-section-title {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--dyn-ink);
    margin-bottom: 1rem;
  }
  .dyn-section-subtitle { font-weight: 400; color: var(--dyn-muted); font-size: 0.82rem; }

  .dyn-section-panel {
    background: var(--dyn-surface);
    border: 1px solid var(--dyn-line);
    border-radius: var(--dyn-radius);
    padding: 1.25rem 1.25rem 1.4rem;
  }

  /* Older bordered-per-section look, opt-in via schema.formStyle = 'sectioned' */
  .dyn-card-bordered {
    border: 1px solid var(--dyn-line);
    border-radius: var(--dyn-radius);
    padding: 1.5rem;
    margin-bottom: 1.25rem;
    background: #fff;
  }
  .dyn-card-header-centered { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
  .dyn-card-header-line { flex: 1; height: 1px; background: var(--dyn-line); }
  .dyn-card-title { font-weight: 700; color: var(--dyn-ink); white-space: nowrap; font-size: 0.9rem; }

  .dyn-grid {
    row-gap: 1.25rem; /* horizontal gutters come from Bootstrap's own .row/.col-md-* padding — this only adds vertical spacing between wrapped rows, which Bootstrap doesn't do on its own */
  }

  .dyn-field { display: flex; flex-direction: column; margin-bottom: 1.25rem; }
  .dyn-grid > .dyn-field { margin-bottom: 0; } /* row-gap above already handles it; avoid double spacing */
  .dyn-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--dyn-body);
    margin-bottom: 0.4rem;
  }
  .dyn-label-muted { color: var(--dyn-muted); font-weight: 400; }
  .dyn-required { color: var(--dyn-danger); }
  .dyn-add-new { color: var(--dyn-primary); font-weight: 600; font-size: 0.76rem; cursor: pointer; }
  .dyn-add-new:hover { text-decoration: underline; }

  .dyn-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--dyn-line);
    border-radius: 8px;
    padding: 0.65rem 0.9rem;
    font-size: 0.92rem;
    color: var(--dyn-ink);
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(22, 24, 31, 0.03);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .dyn-input::placeholder { color: var(--dyn-muted); }
  .dyn-input:focus {
    outline: none;
    border-color: var(--dyn-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--dyn-accent) 16%, transparent);
  }
  .dyn-input:disabled { background: var(--dyn-surface); color: var(--dyn-muted); cursor: not-allowed; }

  .dyn-select {
    appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 2.25rem;
  }

  .dyn-textarea { min-height: 100px; resize: vertical; font-family: inherit; line-height: 1.5; }

  .dyn-checkbox { width: 18px; height: 18px; accent-color: var(--dyn-primary); cursor: pointer; }

  .dyn-custom-block { display: flex; flex-direction: column; }

  .dyn-pills-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .dyn-pill {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 0.4rem 0.9rem;
    border: 1px solid var(--dyn-line);
    border-radius: 999px;
    background: #fff;
    color: var(--dyn-body);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .dyn-pill:hover { border-color: var(--dyn-primary); background: color-mix(in srgb, var(--dyn-primary) 6%, white); }
  .dyn-pill-active {
    border-color: var(--dyn-primary);
    background: var(--dyn-primary);
    color: var(--dyn-primary-contrast);
  }
  .dyn-pill-active:hover { background: color-mix(in srgb, var(--dyn-primary) 85%, black); color: var(--dyn-primary-contrast); }

  .dyn-image-field { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .dyn-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--dyn-line);
    border-radius: 8px;
    background: #fff;
    color: var(--dyn-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.12s ease, border-color 0.12s ease;
  }
  .dyn-upload-btn:hover { background: var(--dyn-surface); border-color: #d8d3c4; }

  .dyn-error { color: var(--dyn-danger); font-size: 0.78rem; margin-top: 0.35rem; }

  .dyn-livesearch-wrap { position: relative; }
  .dyn-livesearch-list {
    position: absolute; z-index: 20; top: calc(100% + 4px); left: 0; right: 0;
    background: #fff; border: 1px solid var(--dyn-line); border-radius: 10px;
    box-shadow: 0 8px 20px rgba(22, 24, 31, 0.08);
    max-height: 220px; overflow-y: auto; margin: 0; padding: 0.35rem; list-style: none;
  }
  .dyn-livesearch-item {
    padding: 0.55rem 0.65rem;
    border-radius: 7px;
    cursor: pointer;
    font-size: 0.88rem;
    color: var(--dyn-body);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .dyn-livesearch-item:hover { background: var(--dyn-surface); color: var(--dyn-ink); }

  .dyn-spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid var(--dyn-line);
    border-top-color: var(--dyn-primary);
    border-radius: 50%;
    animation: dyn-spin 0.7s linear infinite;
  }
  @keyframes dyn-spin { to { transform: rotate(360deg); } }

  /* ---- Buttons — same variant vocabulary as schema.profileActions
     (outline-secondary / outline-success / outline-warning /
     outline-danger / dark), so DynamicForm can render controller.actions
     with className={\`dyn-btn dyn-btn-\${a.variant}\`} and get a matching
     look with zero mapping logic. ---- */
  .dyn-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 1.15rem;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid var(--dyn-line);
    background: #fff;
    color: var(--dyn-body);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(22, 24, 31, 0.04);
    transition: background-color 0.15s ease, border-color 0.15s ease,
      color 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
  }
  .dyn-btn span { white-space: nowrap; }
  .dyn-btn:hover {
    background: var(--dyn-surface);
    border-color: #d8d3c4;
    color: var(--dyn-ink);
    box-shadow: 0 4px 12px -2px rgba(22, 24, 31, 0.12);
    transform: translateY(-1px);
  }
  .dyn-btn:active { transform: translateY(0); box-shadow: 0 1px 2px rgba(22, 24, 31, 0.06); }
  .dyn-btn:focus-visible { outline: 2px solid var(--dyn-accent); outline-offset: 2px; }
  .dyn-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

  .dyn-btn-primary,
  .dyn-btn-dark {
    background: #14315D;
    border-color: var(--dyn-primary);
    color: var(--dyn-primary-contrast);
  }
  .dyn-btn-primary:hover,
  .dyn-btn-dark:hover {
    background: color-mix(in srgb, var(--dyn-primary) 85%, black);
    border-color: color-mix(in srgb, var(--dyn-primary) 85%, black);
    color: var(--dyn-primary-contrast);
  }

  .dyn-btn-outline-secondary { color: var(--dyn-body); border-color: var(--dyn-line); }

  .dyn-btn-outline-success {
    color: var(--dyn-success);
    border-color: var(--dyn-success);
    background: color-mix(in srgb, var(--dyn-success) 8%, white);
  }
  .dyn-btn-outline-success:hover { background: var(--dyn-success); color: #fff; }

  .dyn-btn-outline-warning {
    color: var(--dyn-warning);
    border-color: var(--dyn-warning);
    background: color-mix(in srgb, var(--dyn-warning) 8%, white);
  }
  .dyn-btn-outline-warning:hover { background: var(--dyn-warning); color: #fff; }

  .dyn-btn-outline-danger {
    color: var(--dyn-danger);
    border-color: var(--dyn-danger);
    background: color-mix(in srgb, var(--dyn-danger) 8%, white);
  }
  .dyn-btn-outline-danger:hover { background: var(--dyn-danger); color: #fff; }

  .dyn-btn-sm { padding: 0.45rem 0.8rem; font-size: 0.78rem; }

  .dyn-submit-bar {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 768px) {
    .dyn-page-card { padding: 1.5rem 1.25rem 1.75rem; border-radius: 14px; }

    .dyn-page-header { flex-direction: column; align-items: flex-start; }
    .dyn-toolbar-actions { width: 100%; }
    .dyn-toolbar-actions .dyn-btn { flex: 1 1 auto; }
    .dyn-more-wrap { flex: 1 1 auto; }
    .dyn-more-wrap .dyn-btn { width: 100%; }
    .dyn-more-panel { right: auto; left: 0; width: max-content; max-width: 85vw; }

    .dyn-card-bordered { padding: 1.1rem; }
    .dyn-section-panel { padding: 1rem 0.9rem 1.15rem; }

    .dyn-submit-bar .dyn-btn { width: 100%; }
  }
`;