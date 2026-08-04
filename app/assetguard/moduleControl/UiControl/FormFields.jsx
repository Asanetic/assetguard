'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { LiveSearchDropdown, MosyImageViewer, SmartDropdown } from '../../UiControl/componentControl';
import defaultLogoAsset from '../../../img/logo/logo.png'; // same fallback the legacy profile pages used — adjust path/asset if this module wants a different one
import { mosyGetData, mosyFormatDateOnly, mosyFormatDateTime } from '../../../MosyUtils/hiveUtils';

const defaultLogo = defaultLogoAsset.src || defaultLogoAsset; // Next.js static image imports are objects ({src, width, height, ...}), not plain URL strings — MosyImageViewer needs the string, same as legacy's logo.src

// FormFields — one small component per field.type. Every input carries the
// "dyn-input" class, which FormLayout.jsx styles to match the target look
// (rounded-lg, thin gray border, gray placeholder). Swapping the visual
// theme means editing the CSS in FormLayout.jsx — never these components.
export function HiddenInput() {
  return null;
}
HiddenInput.selfLabeled = true; // no <label> wrapper
HiddenInput.hiddenField = true; // tells FieldRenderer to skip the grid cell entirely


export function TextInput({ field, value, setValue, readOnly }) {
  const inputType = field.type === 'number' || field.type === 'money' ? 'number'
    : field.type === 'date' ? 'date'
    : field.type === 'email' ? 'email'
    : field.type === 'tel' ? 'tel'
    : 'text';
  return (
    <input
      type={inputType}
      className="dyn-input"
      placeholder={field.placeholder || `Enter ${field.label?.toLowerCase() || ''}`}
      value={value ?? ''}
      readOnly={readOnly}
      disabled={readOnly}
      onChange={(e) => setValue(field.key, e.target.value)}
    />
  );
}

export function TextareaInput({ field, value, setValue, readOnly }) {
  return (
    <textarea
      className="dyn-input dyn-textarea"
      placeholder={field.placeholder || `${field.label || ''} (optional)`}
      value={value ?? ''}
      readOnly={readOnly}
      disabled={readOnly}
      onChange={(e) => setValue(field.key, e.target.value)}
    />
  );
}

export function BooleanInput({ field, value, setValue, readOnly }) {
  return (
    <input
      type="checkbox"
      className="dyn-checkbox"
      checked={!!value}
      disabled={readOnly}
      onChange={(e) => setValue(field.key, e.target.checked)}
    />
  );
}

export function SelectInput({ field, value, setValue, readOnly }) {
  return (
    <select className="dyn-input dyn-select" value={value ?? ''} disabled={readOnly} onChange={(e) => setValue(field.key, e.target.value)}>
      <option value="">{field.placeholder || `Select ${field.label || ''}`}</option>
      {field.options?.map((opt, idx) => <option key={`${opt}-${idx}`} value={opt}>{opt}</option>)}
    </select>
  );
}

// Fetches DISTINCT values of one column from the API to build its own option list.// Thin adapter: schema fields describe themselves as { key, endpoint,
// groupByField, ... } (the DynamicForm/schema.js vocabulary); SmartDropdown
// wants { apiEndpoint, idField, labelField, inputName, onSelect,
// defaultValue } (its own, older vocabulary). This function's only job is
// translating one into the other — SmartDropdown owns all the actual
// fetch/select/"Add new" logic now, GroupedSelectInput no longer does.
export function GroupedSelectInput({ field, value, setValue, readOnly }) {
  return (
    <SmartDropdown
      apiEndpoint={field.endpoint}
      idField={field.idField || 'primkey'}
      labelField={field.key}
      inputName={field.key}
      label={field.label}
      defaultValue={value ?? ''}
      onSelect={(val) => setValue(field.key, val)}
    />
  );
}
GroupedSelectInput.selfLabeled = true; // SmartDropdown renders its own <label> — FieldRenderer/DynamicForm should skip theirs


export function DateInput({ field, value, setValue, readOnly }) {
  const isLocked = readOnly || field.computed;
  const today = new Date().toISOString().split('T')[0];
  const sanitized = mosyFormatDateOnly(value);

  // Auto-populate: an empty date field never submits blank — seed it with
  // today the moment it mounts. Runs for locked fields too, since those
  // still need a real value even though the user never touches them.
  useEffect(() => {
    if (!value) setValue(field.key, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLocked) {
    // Computed or read-only get identical treatment: no editable picker,
    // just the date shown as plain text.
    return <div className="dyn-input dyn-input-static">{sanitized || today}</div>;
  }

  return (
    <input
      type="date"
      className="dyn-input"
      value={sanitized || today}
      onChange={(e) => setValue(field.key, e.target.value)}
    />
  );
}

export function DateTimeInput({ field, value, setValue, readOnly }) {
  const isLocked = readOnly || field.computed;
  const now = new Date().toISOString().slice(0, 16);
  const sanitized = mosyFormatDateTime(value);

  useEffect(() => {
    if (!value) setValue(field.key, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLocked) {
    return <div className="dyn-input dyn-input-static">{sanitized || now}</div>;
  }

  return (
    <input
      type="datetime-local"
      className="dyn-input"
      value={sanitized || now}
      onChange={(e) => setValue(field.key, e.target.value)}
    />
  );
}


  export function LiveSearchInput({ field, value, setValue, readOnly, row }) {
    // Overrides row's (possibly stale) cached label the instant a fresh
    // pick happens, so the display text doesn't wait on a refetch to catch
    // up — that round-trip was the source of the flicker/blank.
    const [justPickedLabel, setJustPickedLabel] = useState(null);
    const currentLabel = justPickedLabel ?? row?.[field.labelKey];
  
    // Memoized so LiveSearchDropdown's internal useEffect (which re-syncs
    // its query/selected state whenever defaultValue's *reference* changes)
    // only fires on a real change, not on every unrelated parent re-render.
    const defaultValue = useMemo(
      () => (value != null ? { [field.valueField]: value, [field.displayField]: currentLabel ?? '' } : null),
      [value, currentLabel, field.valueField, field.displayField]
    );
    console.log("currentLabel - LiveSearchInput ", currentLabel, field, row);


    return (
      <LiveSearchDropdown
        apiEndpoint={field.endpoint}
        tblName={field.searchTable || field.key}
        parentTable={field.parentTable || field.key}
        inputName={field.labelKey || field.displayField}
        hiddenInputName={field.key}
        label={field.label}
        displayField={field.displayField}
        valueField={field.valueField}
        defaultValue={defaultValue}
        defaultColSize={field.colSpan}
        onSelect={(id) => setValue(field.key, id)}
        onSelectFull={(item) => setJustPickedLabel(item[field.displayField] ?? null)}
        customDisplay={field.customDisplay}
        mosyFilterOptions={field.mosyFilterOptions}
      />
    );
  }
  LiveSearchInput.selfLabeled = true;

export function RichTextInput({ field, value, setValue }) {
  return (
    <textarea
      className="dyn-input dyn-textarea"
      rows={6}
      value={value ?? ''}
      onChange={(e) => setValue(field.key, e.target.value)}
      placeholder="(plug in your real HTML editor here)"
    />
  );
}

export function ImageInput({ field, value, setValue, readOnly, schema }) {
  // MosyFileUploadButton is a dead end here: it's a bare uncontrolled
  // <input type="file"> that only updates a filename label via direct DOM
  // manipulation — no onChange/callback ever reaches setValue(), so the
  // chosen file never entered form.values and therefore never made it
  // into the JSON payload EntityDataEngine.create/update sends. This is a
  // real controlled input instead: selecting a file puts the File object
  // itself into form.values via setValue, so it rides along with every
  // other field and EntityDataEngine can detect it and switch that
  // request to multipart/form-data (see EntityDataEngine.js).
  const [previewUrl, setPreviewUrl] = useState(null);
  const isFile = typeof File !== 'undefined' && value instanceof File;

  useEffect(() => {
    if (!isFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value, isFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setValue(field.key, file);
  };

  return (
    <div className="dyn-image-field text-center col-md-12 row justify-content-center">
      {isFile && previewUrl ? (
        // Just picked, not saved yet — show the local file directly
        // rather than round-tripping through the media endpoint, which
        // doesn't have this file yet.
        <img src={previewUrl} className={field.imageClass || 'product_image'} alt={field.label} />
      ) : (
        <MosyImageViewer
          media={`/api/mediaroom?media=${btoa(value || '')}`}
          mediaRoot=""
          defaultLogo={field.defaultLogo || defaultLogo}
          imageClass={field.imageClass || 'product_image'}
        />
      )}

      {!readOnly && (
        <label className="dyn-upload-btn">
          <i className="fa fa-upload"></i> {isFile ? 'Change File' : 'Choose File'}
          <input type="file"  style={{ display: 'none' }} onChange={handleFileChange} />
        </label>
      )}
    </div>
  );
}

export const FIELD_COMPONENTS = {
  text: TextInput, tel: TextInput, email: TextInput, number: TextInput, money: TextInput,
  date: DateInput,
  datetime: DateTimeInput,
  textarea: TextareaInput,
  boolean: BooleanInput,
  select: SelectInput,
  groupedSelect: GroupedSelectInput,
  liveSearch: LiveSearchInput,
  richtext: RichTextInput,
  image: ImageInput,
  hidden: HiddenInput,
};