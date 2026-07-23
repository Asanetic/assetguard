'use client';
import DynamicForm from '../../../components/DynamicForm';
import { DevicelistSchema } from '../schema';
import { useDevicelistData } from '../dataControl/DevicelistController';

// Thin wrapper only — all real form logic lives in components/DynamicForm.jsx
export default function DevicelistProfile({ initialValues, onDone }) {
  const data = useDevicelistData();

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
      schema={DevicelistSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel={initialValues?.id ? 'Update' : 'Add'}
    />
  );
}
