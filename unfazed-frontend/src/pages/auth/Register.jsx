import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthShell from '../../components/common/AuthShell.jsx';
import Button from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Field.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api, { getErrorMessage } from '../../api/axiosInstance.js';

const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [slugState, setSlugState] = useState({ slug: '', available: null });
  const [slugEdited, setSlugEdited] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '', password: '', slug: '' } });

  const name = watch('name');
  const slug = watch('slug');

  useEffect(() => {
    if (!slugEdited) setValue('slug', slugify(name));
  }, [name, slugEdited, setValue]);

  useEffect(() => {
    const normalized = slugify(slug || '');
    if (normalized.length < 3) {
      setSlugState({ slug: normalized, available: null });
      return undefined;
    }
    const timer = window.setTimeout(() => {
      api
        .get('/therapists/slug-check', { params: { slug: normalized }, skipAuthRedirect: true })
        .then(({ data }) => setSlugState({ slug: data.slug, available: data.available }))
        .catch(() => setSlugState({ slug: normalized, available: null }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [slug]);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await signUp({ ...values, slug: slugify(values.slug) });
      navigate('/dashboard/settings', { replace: true, state: { welcome: true } });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Create your practice link"
      subtitle="Set up in a couple of minutes. You can change anything later."
      footer={
        <>
          Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Full name" autoComplete="name" placeholder="Dr. Meera Sharma" error={errors.name && errors.name.message} {...register('name', { required: 'Enter your full name', minLength: { value: 2, message: 'Name is too short' } })} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email && errors.email.message} {...register('email', { required: 'Enter your email address', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters" error={errors.password && errors.password.message} {...register('password', { required: 'Choose a password', minLength: { value: 8, message: 'Use at least 8 characters' } })} />
        <div>
          <Input
            label="Your link"
            placeholder="dr-sharma"
            error={errors.slug && errors.slug.message}
            {...register('slug', {
              required: 'Choose a link',
              minLength: { value: 3, message: 'Use at least 3 characters' },
              onChange: () => setSlugEdited(true),
            })}
          />
          <p className="mt-1.5 text-xs text-muted">
            {window.location.host}/<span className="font-semibold text-ink">{slugState.slug || 'your-name'}</span>
            {slugState.available === true && <span className="ml-2 font-semibold text-calm">Available</span>}
            {slugState.available === false && <span className="ml-2 font-semibold text-danger">Already taken</span>}
          </p>
        </div>
        {serverError && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{serverError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={slugState.available === false}>Create account</Button>
      </form>
    </AuthShell>
  );
}
