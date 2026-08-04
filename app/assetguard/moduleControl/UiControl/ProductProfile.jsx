'use client';
import { useEntityFormController } from '../dataControl/useEntityFormController';
import { FIELD_COMPONENTS, TextInput } from './FormFields';
import { MosyUIGuard } from '../../UiControl/MosyUiGuard';

// ProductProfile — a bespoke "product page" layout (hero image with a
// price badge, title, description, action tray) built from a Dribbble
// product-page reference, wired to the SAME useEntityFormController hook
// DynamicForm.jsx uses. Proof the claim holds for forms too: this line
//   const form = useEntityFormController(schema, moduleActions, { id, onDone, redirectOnDelete });
// is the ONLY thing that talks to the network, the registry, or the URL.
// Everything below is markup reading form.values / form.roles / form.actions
// — same submit sequencing (notify + dataNode URL sync), same Delete
// confirm flow, same role-gated action buttons DynamicForm.jsx gets, with
// zero of that re-implemented here.
//
// form.roles comes from schema.templateRoles (or falls back to type/flag
// inference) — see useEntityFormController.jsx's resolveTemplateRoles.
// Swap which field is "hero"/"title"/"price"/etc per-schema without
// touching this component at all.

export default function ProductProfile({ schema, moduleActions, id, onDone, redirectOnDelete }) {
  const form = useEntityFormController(schema, moduleActions, { id, onDone, redirectOnDelete });

  if (form.accessDenied) {
    return (
      <MosyUIGuard
        moduleName={schema?.label || schema?.entity}
        reason={`You don't have the "${schema.moduleRole}" role required to view this.`}
      />
    );
  }
  if (form.fetching) return <div className="text-center text-muted py-4">Loading...</div>;
  if (form.fetchError) return <div className="text-danger py-4">{form.fetchError}</div>;

  const { hero, title, body, price, meta, author } = form.roles;

  // Same FIELD_COMPONENTS map every DynamicForm-rendered field already
  // uses (ImageInput, TextInput, TextareaInput, ...) — reused here so an
  // editable hero image or price still gets the SAME upload/validation/
  // multipart-detection behavior, just arranged completely differently.
  const HeroComponent = hero ? FIELD_COMPONENTS[hero.type] || TextInput : null;
  const PriceComponent = price ? FIELD_COMPONENTS[price.type] || TextInput : null;
  const BodyComponent = body ? FIELD_COMPONENTS[body.type] || TextInput : null;

  // Save is resolved from schema.profileActions the same way DynamicForm
  // does it — comment that entry out in schema.js and this button
  // disappears here too, no template edit needed.
  const otherActions = (form.actions || []).filter((a) => a.key !== 'save' && a.key !== 'submit');

  return (
    <div className="pp-card">
      <div className="pp-hero">
        {HeroComponent && (
          <HeroComponent
            field={hero}
            value={form.values[hero.key]}
            setValue={form.setValue}
            readOnly={hero.editable === false}
            schema={schema}
          />
        )}
        {price && (
          <div className="pp-price-badge">
            {PriceComponent && (
              <PriceComponent
                field={price}
                value={form.values[price.key]}
                setValue={form.setValue}
                readOnly={price.editable === false}
              />
            )}
          </div>
        )}
      </div>

      <div className="pp-body">
        {title && (
          <input
            className="pp-title-input"
            value={form.values[title.key] ?? ''}
            onChange={(e) => form.setValue(title.key, e.target.value)}
            placeholder={title.label}
            readOnly={title.editable === false}
          />
        )}
        {form.errors[title?.key] && <div className="pp-error">{form.errors[title.key]}</div>}

        <div className="pp-byline">
          {author && <span className="pp-author">{form.values[author.key]}</span>}
          {meta && <span className="pp-meta">{form.values[meta.key]}</span>}
        </div>

        {body && BodyComponent && (
          <BodyComponent
            field={body}
            value={form.values[body.key]}
            setValue={form.setValue}
            readOnly={body.editable === false}
          />
        )}
      </div>

      <div className="pp-actions">
        <button
          type="button"
          className="pp-btn pp-btn-primary"
          onClick={() => form.submit()}
          disabled={form.submitting}
        >
          {form.submitting ? 'Saving...' : form.submitLabel}
        </button>
        {otherActions.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`pp-btn pp-btn-${a.variant || 'secondary'}`}
            onClick={a.onClick}
            disabled={form.submitting}
          >
            {a.icon && <i className={`fa fa-${a.icon} mr-1`}></i>}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}