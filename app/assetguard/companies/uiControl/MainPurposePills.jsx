'use client';

// MainPurposePills — the "Main Purpose" chip picker from the legacy
// RegisterCompany modal (RegisterCompanyui.jsx), rebuilt as a
// schema-pluggable customBlock instead of local component state.
// Same visual design as the old purpose-chip / purpose-chip-active
// classes (now .dyn-pill / .dyn-pill-active in FormLayout.jsx), but
// reads/writes through the SAME values/setValue the rest of the form
// uses — so as far as Save/Clone/create/update are concerned, this is
// just another field's worth of data, not a separate island.
//
// Stored as a comma-separated string in values[valueKey] (defaults to ''
// like every other field via FormEngine's buildDefaults, which doesn't
// know about array-shaped fields) — this component owns the array<->
// string conversion itself rather than requiring a FormEngine change for
// one field shape. If a schema ever needs a real array/JSON column
// instead, that's a FormEngine.buildDefaults change, not this component.
//
// Wire it in via schema.customBlocks:
//   customBlocks: [
//     { key: 'main_purpose', after: 'company_name', component: MainPurposePills,
//       valueKey: 'purposes', label: 'Main Purpose',
//       options: ['Response', 'NOC', 'Client', 'Installer', 'Reseller', 'Partner'] },
//   ]
export default function MainPurposePills({ values, setValue, field, row }) {
  const valueKey = field?.valueKey || 'purposes';
  const options = field?.options || ['Response', 'NOC', 'Client', 'Installer', 'Reseller', 'Partner'];

  const raw = values?.[valueKey];
  const selected = Array.isArray(raw) ? raw : (raw ? String(raw).split(',').filter(Boolean) : []);

  const toggle = (purpose) => {
    const next = selected.includes(purpose)
      ? selected.filter((p) => p !== purpose)
      : [...selected, purpose];
    setValue(valueKey, next.join(','));
  };

  console.log("main purpose pills row data", row)
  return (
    <>
      <label className="dyn-label mt-2">
        {`${row?.company_name  || ""} Main Purpose`} <span className="dyn-label-muted">(select one or more)</span>
      </label>
      <div className="dyn-pills-wrap">
        {options.map((purpose) => {
          const isSelected = selected.includes(purpose);
          return (
            <button
              key={purpose}
              type="button"
              className={`dyn-pill ${isSelected ? 'dyn-pill-active' : ''}`}
              onClick={() => toggle(purpose)}
            >
              {purpose}
            </button>
          );
        })}
      </div>
    </>
  );
}