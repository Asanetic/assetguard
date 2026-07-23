'use client';
import { useState, useEffect } from 'react';

export function useFormEngine(schema, initialValues = {}) {
  const buildDefaults = (source) => {
    const defaults = {};
    schema.fields.forEach((f) => { defaults[f.key] = source[f.key] ?? ''; });
    return defaults;
  };

  const [values, setValues] = useState(() => buildDefaults(initialValues));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Re-seed whenever the caller hands us a new initialValues object — e.g.
  // useEntityFormController's async getOne(id) resolving after first mount.
  // Without this, values stays frozen at whatever it was on first render.
  useEffect(() => {
    setValues(buildDefaults(initialValues));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialValues)]);

  const setValue = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const newErrors = {};
    schema.fields.forEach((f) => {
      if (f.required && !values[f.key]) newErrors[f.key] = `${f.label} is required`;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (onSubmit) => {
    if (!validate()) return false;
    setSubmitting(true);
    try {
      // Previously: `await onSubmit(values); return true;` — this always
      // resolved to the literal boolean `true` on success, discarding
      // whatever onSubmit's own return value was. Since
      // useEntityFormController's handleSubmit calls
      // c.create()/c.update() (which resolve to { ok, message, id }),
      // that whole result — including the new record's dataNode id —
      // was being thrown away right here. Propagate it instead.
      const result = await onSubmit(values);
      return result;
    }
    finally { setSubmitting(false); }
  };

  return { values, setValue, errors, submitting, validate, submit, fields: schema.fields };
}