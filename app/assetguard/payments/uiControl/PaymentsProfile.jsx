'use client';
import DynamicForm from '../../../components/DynamicForm';
import { PaymentsSchema } from '../schema';
import { usePaymentsData } from '../dataControl/PaymentsController';

// Thin wrapper only — all real form logic lives in components/DynamicForm.jsx
export default function PaymentsProfile({ initialValues, onDone }) {
  const data = usePaymentsData();

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
      schema={PaymentsSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel={initialValues?.id ? 'Update' : 'Add'}
    />
  );
}
