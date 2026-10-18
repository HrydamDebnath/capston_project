import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import Button from '../common/Button.jsx';
import { Input } from '../common/Field.jsx';

export default function WaitlistForm({ slug, therapistName }) {
  const [joined, setJoined] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await api.post(`/scheduling/public/${slug}/waitlist`, values, { skipAuthRedirect: true });
      setJoined(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  if (joined) {
    return <p className="rounded-2xl bg-calm-soft p-4 text-sm font-medium text-[#137a63]">You are on the waitlist. We will email you the moment a slot opens with {therapistName}.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border border-line bg-mist p-4" noValidate>
      <h3 className="font-bold">Join the waitlist</h3>
      <p className="mt-1 text-sm text-muted">We will notify you when a time frees up.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input label="Name" error={errors.name && errors.name.message} {...register('name', { required: 'Enter your name' })} />
        <Input label="Email" type="email" error={errors.email && errors.email.message} {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
      </div>
      {serverError && <p className="mt-3 text-sm font-medium text-danger" role="alert">{serverError}</p>}
      <Button type="submit" className="mt-4" loading={isSubmitting}>Notify me</Button>
    </form>
  );
}
