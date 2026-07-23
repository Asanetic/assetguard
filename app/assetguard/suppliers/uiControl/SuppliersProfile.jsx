'use client';
import DynamicForm from './DynamicForm';
import { SuppliersSchema } from '../schema';
import { useSuppliersData } from '../dataControl/SuppliersController';

// Thin wrapper only — all real form logic lives in components/DynamicForm.jsx
export default function SuppliersProfile({ initialValues, onDone }) {
  const data = useSuppliersData();

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
      schema={SuppliersSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel={initialValues?.id ? 'Update' : 'Add'}
    />
  );
}
