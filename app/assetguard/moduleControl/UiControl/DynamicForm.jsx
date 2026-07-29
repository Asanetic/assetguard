'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FIELD_COMPONENTS, TextInput } from './FormFields';
import { FormSection, FieldGroup, formLayoutStyles } from './FormLayout';
import mosyThemeConfigs from '../../../appConfigs/mosyTheme'; // adjust the relative path to match where DynamicForm sits
import { MosyNotify } from '../../../MosyUtils/ActionModals';
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // Shared by the form's onSubmit and the toolbar Save/Update button so
  // both paths get the same "sending → success/error" notify sequence.
  // Reused `id` means each new MosyNotify call replaces the previous one
  // in place (spinner -> check/times) instead of stacking toasts.
  const doSubmit = async () => {
    const notifyId = `modal1`;

    MosyNotify({
      message: 'Sending request...',
      icon: 'spinner',
      id: notifyId,
    });

    try {
      const result = await controller.submit();

      // FormEngine's submit() returns false when client-side validation
      // fails — no request ever went out, so surface that distinctly
      // rather than claiming success.
      if (result === false) {
        MosyNotify({
          message: 'Please fix the highlighted fields.',
          icon: 'exclamation-circle',
          iconColor: 'danger',
          id: notifyId,
          addTimer: true,
          duration: 3000,
        });
        return;
      }

      const ok = result?.ok ?? true;
      const message =  (controller.isEditing ? 'Record saved successfully.' : 'Record added successfully.');

      console.log('Submit result:', result);
      
      // Same two-part pattern as the legacy TasksRequestHandler/tasksProfileData
      // flow: (1) hydrate the form's actual values directly — already done
      // above, inside useEntityFormController's handleSubmit, via its own
      // getOne()+setRecord() call right after create()/update() succeeds,
      // same job the legacy code did with setters.setTasksNode(finalProfileData).
      // (2) separately, update the URL so the address bar / back-button /
      // refresh reflect the saved record's dataNode token, same job the
      // legacy code did with mosyUpdateUrlParam('tasks_dataNode', token).
      //
      // The one thing that matters here: which navigation call actually
      // fires. The grid's own "click a row -> go to profile" flow (see
      // Entityroweventinterpreter.jsx's `select` branch) uses
      // `router.push(data.url, { scroll: false })` — NOT router.replace.
      // That's the one proven to correctly re-run CompaniesProfile's
      // `searchParams.get(...)` -> flip `isEditing` -> resolve the real
      // Update/Delete/Clone action set. Matching it exactly here instead
      // of using replace().
      if (ok && result?.id !== undefined && result?.id !== null) {
        const dataNodeParam = `${controller.schema.entity}_dataNode`;
        const token = typeof window !== 'undefined' ? window.btoa(String(result.id)) : String(result.id);
        const params = new URLSearchParams(searchParams.toString());
        console.log(`DynamicForm URL sync: ${dataNodeParam}=${token} (current: ${params.get(dataNodeParam)})`);
        if (params.get(dataNodeParam) !== token) {
          params.set(dataNodeParam, token);
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }
      }

      MosyNotify({
        message,
        icon: ok ? 'check-circle' : 'times-circle',
        iconColor: ok ? 'success' : 'danger',
        id: notifyId,
        addTimer: true,
        duration: ok ? 2500 : 4000,
      });
    } catch (err) {
      MosyNotify({
        message: err?.message || 'Something went wrong. Please try again.',
        icon: 'times-circle',
        iconColor: 'danger',
        id: notifyId,
        addTimer: true,
        duration: 4000,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await doSubmit();
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
  // doSubmit, not whatever onClick the controller wired up for it), so
  // strip it out here to avoid rendering it twice.
  //const profileActions = (controller.actions || []).filter((a) => a.key !== 'save' && a.key !== 'submit');

    const profileActions = (controller.actions || [])
    .filter((a) => a.key !== 'save' && a.key !== 'submit')
    .filter((a) => !hiddenActions.includes(a.key))
    .filter((a) => {
      // editOnly buttons (Delete, Clone, etc.) only render once a record
      // actually exists — i.e. we're editing, not creating new.
      const def = schema.profileActions?.find((d) => d.key === a.key);
      return !(def?.editOnly && !controller.isEditing);
    });

  const hasOverflow = profileActions.length > MAX_VISIBLE_ACTIONS;
  const visibleActions = hasOverflow ? profileActions.slice(0, MAX_VISIBLE_ACTIONS) : profileActions;
  const overflowActions = hasOverflow ? profileActions.slice(MAX_VISIBLE_ACTIONS) : [];

  // The Save/Update button itself is schema-driven too — it only exists
  // because schema.js defines a profileActions entry flagged `form: true`
  // with key 'save' (or 'submit'). Comment that entry out and the button
  // disappears, same as any other action. Must match on key as well as
  // `form` — matching on `form` alone grabs whichever entry happens to
  // be listed first (e.g. 'back'), not necessarily the actual submit
  // button. The actual submit *behavior* (doSubmit) stays here in the
  // component — schema controls presence and labeling, the engine owns
  // the logic.
  const saveActionDef = controller.schema?.profileActions?.find((a) => a.form && (a.key === 'save' || a.key === 'submit'));
  const submitAction = saveActionDef
    ? {
        key: saveActionDef.key,
        label: controller.submitting ? 'Saving...' : (controller.submitLabel || saveActionDef.label),
        variant: saveActionDef.variant || 'primary',
        icon: saveActionDef.icon,
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
          {schema.fields.filter((f) => !f.system).map((f) => {
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
    <div className="dyn-form-scope" style={themeVars}>
      {(resolvedTitle || eyebrow) && (
        <div className="dyn-page-header">
          <div className="dyn-page-header-text">
            {eyebrow && <span className="dyn-eyebrow text-left">{eyebrow}</span>}
            {resolvedTitle && <h1 className="dyn-page-title text-left">{resolvedTitle}</h1>}
          </div>
        </div>
      )}

      {/* Actions tray — Back/Delete/Clone/etc from schema.profileActions,
          plus Save/Update, all in one centered row. */}
      <div className="dyn-toolbar-tray row justify-content-end">
        <div className="dyn-toolbar-actions">
          {visibleActions.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`dyn-btn dyn-btn-${a.variant || 'outline-secondary'}`}
              onClick={a.onClick}
              disabled={controller.submitting}
            >
              {a.icon && <i className={`fa fa-${a.icon}`}></i>}
              <span>{a.label}</span>
            </button>
          ))}

          {hasOverflow && (
            <div className="dyn-more-wrap" ref={moreRef}>
              <button
                type="button"
                className="dyn-btn dyn-btn-outline-secondary"
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
                      className={`dyn-more-item dyn-more-item-${a.variant || 'outline-secondary'}`}
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
            <button
              type="button"
              className={`dyn-btn dyn-btn-${submitAction.variant}`}
              onClick={doSubmit}
              disabled={controller.submitting}
            >
              {submitAction.icon && <i className={`fa fa-${submitAction.icon}`}></i>}
              <span>{submitAction.label}</span>
            </button>
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