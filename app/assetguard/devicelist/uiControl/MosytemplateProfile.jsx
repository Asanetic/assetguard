'use client';
import DynamicForm from '../../../components/DynamicForm';
import { MosytemplateSchema } from '../schema';
import { useMosytemplateData } from '../dataControl/MosytemplateController';

// Thin wrapper only — all real form logic lives in components/DynamicForm.jsx
export default function MosytemplateProfile({ initialValues, onDone }) {
  const data = useMosytemplateData();

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
      schema={MosytemplateSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel={initialValues?.id ? 'Update' : 'Add'}
    />
  );
}
