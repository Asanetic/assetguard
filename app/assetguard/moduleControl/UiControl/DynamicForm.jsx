'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import { FIELD_COMPONENTS, TextInput } from './FormFields';
import { FormSection, FieldGroup, formLayoutStyles } from './FormLayout';
import mosyThemeConfigs from '../../../appConfigs/mosyTheme'; // adjust the relative path to match where DynamicForm sits
import { MosyUIGuard } from '../../UiControl/MosyUiGuard';

// Past this many action buttons, the rest collapse into a "More" popover
// instead of the row growing indefinitely.
const MAX_VISIBLE_ACTIONS = 4;

// DynamicForm — markup only. Renders schema.sections / schema.fieldGroups
// using controller.values/errors/setValue. Doesn't know what entity this
// is or what Save actually calls — that's useEntityFormController's job.
//
// Visual skin is picked by schema.formStyle:
//   'card'      (default) — one white rounded card wraps every section,
//                matches the TailAdmin "Add Product" reference exactly.
//   'sectioned' — each section gets its own bordered box (legacy/Symphony
//                look) — set this per-schema to keep that look where wanted.
//
// Brand color comes from mosyThemeConfigs (--dyn-primary below), same
// pattern as TestGrid's .etc-card — one value, no derived shades to keep
// in sync.
//
// HEADER: page-level chrome (title + profileActions toolbar) lives here
// now, not in the calling page component. Pages pass plain strings —
// `title` and an optional `eyebrow` — and this file is responsible for
// how they're laid out and styled next to controller.actions
// (Back/Activate/Disable/Delete/etc, resolved from schema.profileActions).
// That keeps every profile page a thin shell: compute the record's title
// text, hand it to DynamicForm, done. Beyond MAX_VISIBLE_ACTIONS the rest
// collapse into a "More" popover so the header stays a fixed height no
// matter how many profileActions a schema defines.

export default function DynamicForm({ controller, title, eyebrow, hiddenActions = [] }) {  
  const themeVars = useMemo(
    () => ({
      '--dyn-primary': mosyThemeConfigs.btnBg,
      '--dyn-primary-contrast': mosyThemeConfigs.btnTxt,
      '--dyn-radius': mosyThemeConfigs.systemBorderRadius,
    }),
    []
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handleOutsideClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [moreOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await controller.submit();
  };

  // Placed after every hook call above (Rules of Hooks) — same reasoning
  // as CompaniesGrid.jsx's identical check. Checked before fetching/
  // fetchError below: no point showing a loading spinner for data the
  // person isn't allowed to see in the first place.
  if (controller.accessDenied) {
    return (
      <MosyUIGuard
        moduleName={controller.schema?.label || controller.schema?.entity}
        reason={`You don't have the "${controller.schema?.moduleRole}" role required to view this.`}
      />
    );
  }

  if (controller.fetching) return <div className="text-center text-muted py-4">Loading...</div>;
  if (controller.fetchError) return <div className="text-danger py-4">{controller.fetchError}</div>;

  const { schema } = controller;
  const variant = schema.formStyle || 'card';

  // Fall back to the first section's label only if the caller didn't pass
  // an explicit title — keeps old schemas (no title prop wired up yet)
  // looking correct without every page needing an update at once.
  const resolvedTitle = title || (variant === 'card' && schema.sections?.length === 1 ? schema.sections[0].label : null);

  // If there's exactly one section, its label is already shown as the
  // page title above — don't render it a second time inside the section.
  const suppressFirstLabel = variant === 'card' && schema.sections?.length === 1;

  // Overflow logic (MAX_VISIBLE_ACTIONS + "More" popover) only applies to
  // schema.profileActions (Back/Delete/Clone/etc). Save/Update is the
  // primary action for this page — it always stays visible in the tray,
  // never collapses into "More", and is rendered last.
  // 'save'/'submit' is resolved separately below (it always needs to run
  // controller.submit(), not whatever onClick the controller wired up for
  // it), so strip it out here to avoid rendering it twice. editOnly and
  // role filtering are ALREADY done by useEntityFormController's own
  // `actions` computation — no need to re-derive that here.
  const profileActions = (controller.actions || [])
    .filter((a) => a.key !== 'save' && a.key !== 'submit')
    .filter((a) => !hiddenActions.includes(a.key));

  const hasOverflow = profileActions.length > MAX_VISIBLE_ACTIONS;
  const visibleActions = hasOverflow ? profileActions.slice(0, MAX_VISIBLE_ACTIONS) : profileActions;
  const overflowActions = hasOverflow ? profileActions.slice(MAX_VISIBLE_ACTIONS) : [];

  // The Save/Update button itself is schema-driven too — it only exists
  // because schema.js defines a profileActions entry flagged `form: true`
  // with key 'save' (or 'submit'). Comment that entry out and the button
  // disappears, same as any other action. Must match on key as well as
  // `form` — matching on `form` alone grabs whichever entry happens to
  // be listed first (e.g. 'back'), not necessarily the actual submit
  // button. Schema controls presence and labeling only — the actual
  // submit behavior (notify sequence, URL dataNode sync) lives in
  // useEntityFormController's submit(), called via handleSubmit below.
  const saveActionDef = controller.schema?.profileActions?.find((a) => a.form && (a.key === 'save' || a.key === 'submit'));
  const submitAction = saveActionDef
    ? {
        key: saveActionDef.key,
        label: controller.submitting ? 'Saving...' : (controller.submitLabel || saveActionDef.label),
        variant: saveActionDef.variant || 'primary',
        icon: saveActionDef.icon,
        colorClass: saveActionDef.colorClass,
      }
    : null;

  const sections = (
    <>
      {schema.sections?.map((section, i) => (
        <FormSection
          key={section.key}
          section={suppressFirstLabel && i === 0 ? { ...section, label: null } : section}
          schema={schema}
          values={controller.values}
          errors={controller.errors}
          setValue={controller.setValue}
          isEditing={controller.isEditing}
          row={controller.record}
        />
      ))}

      {schema.fieldGroups?.map((group) => (
        <FieldGroup key={group.key} group={group} values={controller.values} setValue={controller.setValue} />
      ))}

      {/* Fallback: no sections/fieldGroups at all -> flat field list.
          Defaults to 3-per-row (Bootstrap's col-md-4 equivalent) unless
          the schema opts into a different column count. */}
      {!schema.sections && !schema.fieldGroups && (
        <div className="row dyn-grid">
          {schema.fields.filter((f) => !f.system && !FIELD_COMPONENTS[f.type]?.hiddenField).map((f) => {
          // {schema.fields.filter((f) => !f.system).map((f) => {
            if (f.computed && !controller.isEditing) return null;
            const FieldComponent = FIELD_COMPONENTS[f.type] || TextInput;
            const colSpan = f.colSpan || Math.max(1, Math.round(12 / (schema.formColumns || 3)));
            return (
              <div key={f.key} className={`col-md-${colSpan} dyn-field`}>
                {!FieldComponent.selfLabeled && (
                  <label className="dyn-label">{f.label}{f.required && <span className="dyn-required"> *</span>}</label>
                )}
                <FieldComponent field={f} value={controller.values[f.key]} setValue={controller.setValue} readOnly={f.editable === false} schema={schema} />
                {controller.errors[f.key] && <div className="dyn-error">{controller.errors[f.key]}</div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="dyn-form-scope pt-3" style={themeVars}>
      {(resolvedTitle || eyebrow) && (
        <div className="dyn-page-header mb-3 border-bottom ">
          <div className="dyn-page-header-text">
            {eyebrow && <span className="dyn-eyebrow text-left">{eyebrow}</span>}
            {resolvedTitle && <h1 className="dyn-page-title text-left">{resolvedTitle}</h1>}
          </div>
        </div>
      )}

      {/* Actions tray — Back/Delete/Clone/etc from schema.profileActions,
          plus Save/Update, all in one row. Bootstrap col-6/col-sm-auto on
          each button wrapper drives the stacking (2-up on phones, inline
          from sm up, Save always full-width on its own row) — dyn-btn
          itself carries zero layout, only color/type/spacing.

          Color: variant (outline-secondary/success/warning/danger/
          primary) picks the base dyn-btn-<variant> look. An optional
          schema.profileActions[].colorClass string gets appended after
          it — use it to nudge/override one specific button's color
          (e.g. a custom CSS class) without touching variant, which still
          controls hover/disabled states and the "More" popover's
          matching dyn-more-item-<variant> class. */}
      <div className="dyn-toolbar-tray row justify-content-start justify-content-sm-end mx-0 px-0 ">
        <div className="dyn-toolbar-actions row justify-content-start justify-content-sm-end  px-0 mx-0 w-100">
          {visibleActions.map((a) => (
            <div key={a.key} className="col-6 col-sm-auto mb-2 mb-sm-0 px-1">
              <button
                type="button"
                className={`dyn-btn dyn-btn-${a.variant || 'outline-secondary'} ${a.colorClass || ''} w-100`}
                onClick={a.onClick}
                disabled={controller.submitting}
              >
                {a.icon && <i className={`fa fa-${a.icon}`}></i>}
                <span>{a.label}</span>
              </button>
            </div>
          ))}

          {hasOverflow && (
            <div className="col-6 col-sm-auto mb-2 mb-sm-0 px-1 dyn-more-wrap" ref={moreRef}>
              <button
                type="button"
                className="dyn-btn dyn-btn-outline-secondary w-100"
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
              >
                <i className="fa fa-ellipsis-h"></i>
                <span>More</span>
              </button>
              {moreOpen && (
                <div className="dyn-more-panel">
                  {overflowActions.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      className={`dyn-more-item dyn-more-item-${a.variant || 'outline-secondary'} ${a.colorClass || ''}`}
                      onClick={() => {
                        setMoreOpen(false);
                        a.onClick();
                      }}
                      disabled={controller.submitting}
                    >
                      {a.icon && <i className={`fa fa-${a.icon}`}></i>}
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {submitAction && (
            <div className="col-12 col-sm-auto px-1">
              <button
                type="button"
                className={`dyn-btn dyn-btn-${submitAction.variant} ${submitAction.colorClass || ''} w-100`}
                onClick={() => controller.submit()}
                disabled={controller.submitting}
              >
                {submitAction.icon && <i className={`fa fa-${submitAction.icon}`}></i>}
                <span>{submitAction.label}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dyn-header-divider" />

      <form onSubmit={handleSubmit}>
        {variant === 'card' ? (
          <div className="dyn-page-card">{sections}</div>
        ) : (
          sections
        )}
      </form>

      <style jsx global>{formLayoutStyles}</style>
    </div>
  );
}