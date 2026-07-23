'use client';
import DynamicForm from '../../../components/DynamicForm';
import { MosyTemplateSchema } from '../schema';
import { useMosyTemplateData } from '../dataControl/MosyTemplateController';

// Thin wrapper only — all real form logic lives in components/DynamicForm.jsx
export default function MosyTemplateProfile({ initialValues, onDone }) {
  const data = useMosyTemplateData();

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
      schema={MosyTemplateSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel={initialValues?.id ? 'Update' : 'Add'}
    />
  );
}
