'use client';
import DynamicForm from '../../../components/DynamicForm';
import { SitesSchema } from '../schema';
import { useSitesData } from '../dataControl/SitesController';

// Thin wrapper only — all real form logic lives in components/DynamicForm.jsx
export default function SitesProfile({ initialValues, onDone }) {
  const data = useSitesData();

  const handleSubmit = async (values) => {
    if (initialValues?.id) {
      await data.update(initialValues.id, values);
    } else {
      await data.create(values);
    }
    onDone?.();
  };

  return (
    <DynamicForm
      schema={SitesSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel={initialValues?.id ? 'Update' : 'Add'}
    />
  );
}
