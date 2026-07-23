'use client';
import { useState, useEffect, useRef } from 'react';
import { useFormEngine } from '../uiControl/';

/* ================= FIELD COMPONENTS ================= */
/* One small component per field.type. Add a new type by adding one here
   and one line in FIELD_COMPONENTS below — nothing else changes. */

function TextInput({ field, value, setValue }) {
  const inputType = field.type === 'number' || field.type === 'money' ? 'number'
    : field.type === 'date' ? 'date'
    : field.type === 'email' ? 'email'
    : field.type === 'tel' ? 'tel'
    : 'text';
  return <input type={inputType} value={value} onChange={(e) => setValue(field.key, e.target.value)} />;
}

function TextareaInput({ field, value, setValue }) {
  return <textarea value={value} onChange={(e) => setValue(field.key, e.target.value)} />;
}

function BooleanInput({ field, value, setValue }) {
  return <input type="checkbox" checked={!!value} onChange={(e) => setValue(field.key, e.target.checked)} />;
}

function SelectInput({ field, value, setValue }) {
  return (
    <select value={value} onChange={(e) => setValue(field.key, e.target.value)}>
      <option value="">-- select --</option>
      {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

// Fetches DISTINCT values of one column from the API to build its own option list.
// Matches your existing SmartDropdown pattern.
function GroupedSelectInput({ field, value, setValue }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${field.endpoint}?groupBy=${encodeURIComponent(field.groupByField)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data.rows || data.data || [];
        setOptions(rows);
      })
      .catch((err) => console.error(`GroupedSelectInput fetch failed (${field.key}):`, err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [field.endpoint, field.groupByField]);

  return (
    <select value={value} onChange={(e) => setValue(field.key, e.target.value)} disabled={loading}>
      <option value="">{loading ? 'Loading...' : '-- select --'}</option>
      {options.map((opt) => {
        const v = opt[field.groupByField];
        return <option key={v} value={v}>{v}</option>;
      })}
    </select>
  );
}

// Debounced search-as-you-type against an API endpoint. Matches LiveSearchDropdown.
function LiveSearchInput({ field, value, setValue }) {
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
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query || (value ? String(value) : '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Search ${field.label}...`}
        autoComplete="off"
      />
      {open && (
        <ul style={{
          position: 'absolute', background: '#fff', border: '1px solid #ccc',
          width: '100%', maxHeight: 180, overflowY: 'auto', zIndex: 10, margin: 0,
          padding: 0, listStyle: 'none',
        }}>
          {loading && <li style={{ padding: 8 }}>Searching...</li>}
          {!loading && results.map((item) => (
            <li
              key={item[field.valueField]}
              style={{ padding: 8, cursor: 'pointer' }}
              onClick={() => handleSelect(item)}
            >
              {item[field.displayField]}
            </li>
          ))}
          {!loading && query && results.length === 0 && (
            <li style={{ padding: 8, color: '#888' }}>No results</li>
          )}
        </ul>
      )}
    </div>
  );
}

// Swap the inside of this for your real editor (MosyUtils/htmlEditor.jsx) —
// keep the same { value, onChange } contract and nothing else needs to change.
function RichTextInput({ field, value, setValue }) {
  return (
    <textarea
      rows={6}
      value={value}
      onChange={(e) => setValue(field.key, e.target.value)}
      placeholder="(plug in your real HTML editor here — see comment above)"
    />
  );
}

const FIELD_COMPONENTS = {
  text: TextInput, tel: TextInput, email: TextInput, number: TextInput, money: TextInput, date: TextInput,
  textarea: TextareaInput,
  boolean: BooleanInput,
  select: SelectInput,
  groupedSelect: GroupedSelectInput,
  liveSearch: LiveSearchInput,
  richtext: RichTextInput,
};

/* ================= THE FORM ================= */

export default function DynamicForm({ schema, initialValues = {}, onSubmit, submitLabel = 'Save' }) {
  const form = useFormEngine(schema, initialValues);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await form.submit(onSubmit);
  };

  return (
    <form onSubmit={handleSubmit}>
      {form.fields.map((f) => {
        const FieldComponent = FIELD_COMPONENTS[f.type] || TextInput;
        return (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label>{f.label}{f.required && ' *'}</label>
            <FieldComponent field={f} value={form.values[f.key]} setValue={form.setValue} />
            {form.errors[f.key] && <div style={{ color: 'red', fontSize: 12 }}>{form.errors[f.key]}</div>}
          </div>
        );
      })}

      <button type="submit" disabled={form.submitting}>
        {form.submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
