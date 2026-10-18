import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthShell from '../../components/common/AuthShell.jsx';
import Button from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Field.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getErrorMessage } from '../../api/axiosInstance.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await login(values);
      navigate((location.state && location.state.from && location.state.from.pathname) || '/dashboard', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your sessions, clients and notes."
      footer={
        <>
          New to Unfazed? <Link to="/register" className="font-semibold text-brand hover:underline">Create your practice link</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@practice.in"
          error={errors.email && errors.email.message}
          {...register('email', { required: 'Enter your email address' })}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password && errors.password.message}
          {...register('password', { required: 'Enter your password' })}
        />
        {serverError && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{serverError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>
      {import.meta.env.DEV && (
        <p className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-xs text-brand-dark">
          After running <code className="font-semibold">npm run seed</code> in the backend, sign in with demo@unfazed.in and Password@123.
        </p>
      )}
    </AuthShell>
  );
}
