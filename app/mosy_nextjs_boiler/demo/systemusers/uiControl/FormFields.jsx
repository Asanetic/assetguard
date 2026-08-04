'use client';
import { useState, useEffect, useRef } from 'react';
import { MosyFileUploadButton, MosyImageViewer } from '../../UiControl/componentControl';

// FormFields — one small component per field.type. Every input carries the
// "dyn-input" class, which FormLayout.jsx styles to match the target look
// (rounded-lg, thin gray border, gray placeholder). Swapping the visual
// theme means editing the CSS in FormLayout.jsx — never these components.

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

// Fetches DISTINCT values of one column from the API to build its own option list.
export function GroupedSelectInput({ field, value, setValue, readOnly }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${field.endpoint}?groupBy=${encodeURIComponent(field.groupByField)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data.rows || data.data || [];

        // "DISTINCT" from the API isn't always guaranteed unique/non-blank
        // (e.g. differing case, extra whitespace, or genuinely duplicate
        // rows) — dedupe here so React never sees two options with the
        // same key, and drop blanks since they're not a real choice.
        const seen = new Set();
        const deduped = rows.filter((row) => {
          const v = row[field.groupByField];
          if (v === null || v === undefined || v === '') return false;
          if (seen.has(v)) return false;
          seen.add(v);
          return true;
        });

        setOptions(deduped);
      })
      .catch((err) => console.error(`GroupedSelectInput fetch failed (${field.key}):`, err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [field.endpoint, field.groupByField]);

  return (
    <select
      className="dyn-input dyn-select"
      value={value ?? ''}
      onChange={(e) => setValue(field.key, e.target.value)}
      disabled={loading || readOnly}
    >
      <option value="">{loading ? 'Loading...' : (field.placeholder || `Select ${field.label || ''}`)}</option>
      {options.map((opt, idx) => {
        const v = opt[field.groupByField];
        // Belt-and-suspenders: even post-dedupe, fall back to an
        // index-qualified key so a future data edge case can't reintroduce
        // the duplicate-key warning.
        return <option key={`${v}-${idx}`} value={v}>{v}</option>;
      })}
    </select>
  );
}

// Debounced search-as-you-type against an API endpoint.
export function LiveSearchInput({ field, value, setValue }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${field.endpoint}?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : data.rows || data.data || []);
      } catch (err) {
        console.error(`LiveSearchInput fetch failed (${field.key}):`, err.message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, field.endpoint]);

  const handleSelect = (item) => {
    setQuery(item[field.displayField] ?? '');
    setValue(field.key, item[field.valueField]);
    setOpen(false);
  };

  return (
    <div className="dyn-livesearch-wrap">
      <input
        type="text"
        className="dyn-input"
        value={query || (value ? String(value) : '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Search ${field.label}...`}
        autoComplete="off"
      />
      {open && (
        <ul className="dyn-livesearch-list">
          {loading && (
            <li className="dyn-livesearch-item text-muted">
              <span className="dyn-spinner" aria-hidden="true"></span>
              Searching...
            </li>
          )}
          {!loading && results.map((item, idx) => (
            <li key={`${item[field.valueField]}-${idx}`} className="dyn-livesearch-item" onClick={() => handleSelect(item)}>
              {item[field.displayField]}
            </li>
          ))}
          {!loading && query && results.length === 0 && (
            <li className="dyn-livesearch-item text-muted">No results</li>
          )}
        </ul>
      )}
    </div>
  );
}

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
  return (
    <div className="dyn-image-field text-center">
      <MosyImageViewer
        media={`/api/mediaroom?media=${btoa(value || '')}`}
        mediaRoot=""
        defaultLogo={logo.src}
        imageClass={field.imageClass || 'product_image'}
      />
      {!readOnly && (
        <MosyFileUploadButton
          tblName={schema?.entity}
          attribute={field.key}
          // If MosyFileUploadButton supports a completion callback, wire
          // it back into this schema-driven form's own state instead of
          // relying on a parent refresh, e.g.:
          // onUploadComplete={(newMediaValue) => setValue(field.key, newMediaValue)}
        />
      )}
      <input type="hidden" name={`media_${schema?.entity}_${field.key}`} value={value || ''} />
    </div>
  );
}

export const FIELD_COMPONENTS = {
  text: TextInput, tel: TextInput, email: TextInput, number: TextInput, money: TextInput, date: TextInput,
  textarea: TextareaInput,
  boolean: BooleanInput,
  select: SelectInput,
  groupedSelect: GroupedSelectInput,
  liveSearch: LiveSearchInput,
  richtext: RichTextInput,
};