import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Button from '../../components/common/Button.jsx';
import Loader from '../../components/common/Loader.jsx';
import Modal from '../../components/common/Modal.jsx';
import { Input, Select, Textarea } from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import useEntitlement from '../../hooks/useEntitlement.js';
import { SPECIALIZATIONS, LANGUAGES, PACKAGE_SIZES, SESSION_DURATIONS } from '../../utils/constants.js';
import { formatMoney, paiseToRupees, rupeesToPaise, splitList } from '../../utils/format.js';
import { listTimezones } from '../../utils/timezones.js';

function ProfileForm() {
  const { therapist, setTherapist } = useAuth();
  const toast = useToast();
  const [slugState, setSlugState] = useState({ available: null });
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ defaultValues: toForm(therapist) });
  const { fields, append, remove } = useFieldArray({ control, name: 'services' });
  const slug = watch('slug');

  function toForm(source) {
    return {
      name: source.name,
      slug: source.slug,
      headline: source.headline,
      bio: source.bio,
      city: source.city,
      yearsOfExperience: source.yearsOfExperience,
      qualifications: source.qualifications.join(', '),
      specializations: source.specializations,
      languages: source.languages,
      timezone: source.timezone,
      gstin: source.gstin,
      businessAddress: source.businessAddress,
      isPublished: source.isPublished,
      services: source.services.map((service) => ({ ...service, price: paiseToRupees(service.price) })),
    };
  }

  useEffect(() => {
    if (!slug || slug === therapist.slug) {
      setSlugState({ available: null });
      return undefined;
    }
    const timer = window.setTimeout(() => {
      api.get('/therapists/slug-check', { params: { slug, exclude: therapist._id } }).then(({ data }) => setSlugState({ available: data.available })).catch(() => setSlugState({ available: null }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [slug, therapist.slug, therapist._id]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      yearsOfExperience: Number(values.yearsOfExperience) || 0,
      qualifications: splitList(values.qualifications),
      services: values.services.map((service) => ({
        _id: service._id,
        title: service.title,
        description: service.description,
        durationMinutes: Number(service.durationMinutes),
        price: rupeesToPaise(service.price),
      })),
    };
    try {
      const { data } = await api.put('/therapists/me', payload);
      setTherapist(data.therapist);
      reset(toForm(data.therapist));
      toast.success('Profile saved');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('photo', file);
    setUploading(true);
    try {
      const { data } = await api.post('/therapists/me/photo', form);
      setTherapist(data.therapist);
      toast.success('Photo updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <section className="card p-6">
        <h2 className="panel-title">Public profile</h2>
        <div className="mt-5 flex items-center gap-4">
          <Avatar name={therapist.name} src={therapist.photoUrl} size={72} />
          <div>
            <label className="btn btn-outline btn-sm cursor-pointer">
              {uploading ? 'Uploading' : 'Change photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadPhoto} disabled={uploading} />
            </label>
            <p className="mt-1.5 text-xs text-muted">JPG, PNG or WebP up to 2 MB</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input label="Full name" error={errors.name && errors.name.message} {...register('name', { required: 'Enter your name' })} />
          <div>
            <Input label="Your link" error={errors.slug && errors.slug.message} {...register('slug', { required: 'Choose a link', minLength: { value: 3, message: 'Use at least 3 characters' } })} />
            <p className="mt-1.5 text-xs text-muted">
              {window.location.host}/{slug || therapist.slug}
              {slugState.available === true && <span className="ml-2 font-semibold text-calm">Available</span>}
              {slugState.available === false && <span className="ml-2 font-semibold text-danger">Already taken</span>}
            </p>
          </div>
          <Input label="Headline" fieldClassName="sm:col-span-2" placeholder="One line about who you help and how" {...register('headline', { maxLength: { value: 140, message: 'Keep it under 140 characters' } })} error={errors.headline && errors.headline.message} />
          <Textarea label="About you" fieldClassName="sm:col-span-2" rows={6} hint="Separate paragraphs with a blank line" {...register('bio', { maxLength: { value: 2000, message: 'Keep it under 2000 characters' } })} error={errors.bio && errors.bio.message} />
          <Input label="City" {...register('city')} />
          <Input label="Years in practice" type="number" min="0" {...register('yearsOfExperience')} />
          <Input label="Qualifications" fieldClassName="sm:col-span-2" hint="Separate with commas" {...register('qualifications')} />
          <Select label="Timezone" fieldClassName="sm:col-span-2" {...register('timezone')}>
            {listTimezones(therapist.timezone).map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">Specializations</legend>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((item) => (
              <label key={item} className="cursor-pointer rounded-xl border border-line px-3.5 py-1.5 text-sm font-semibold has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-dark">
                <input type="checkbox" value={item} className="sr-only" {...register('specializations')} />
                {item}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">Languages</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((item) => (
              <label key={item} className="cursor-pointer rounded-xl border border-line px-3.5 py-1.5 text-sm font-semibold has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-dark">
                <input type="checkbox" value={item} className="sr-only" {...register('languages')} />
                {item}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-brand" {...register('isPublished')} />
          Show my page publicly and accept bookings
        </label>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="panel-title">Session types and pricing</h2>
            <p className="mt-1 text-sm text-muted">Lengths must be enabled in your availability.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => append({ title: '', description: '', durationMinutes: 60, price: 0 })}>Add session type</Button>
        </div>
        <div className="mt-5 space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-2xl border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem]">
                <Input label="Title" error={errors.services && errors.services[index] && errors.services[index].title && 'Add a title'} {...register(`services.${index}.title`, { required: true })} />
                <Select label="Length" {...register(`services.${index}.durationMinutes`)}>
                  {SESSION_DURATIONS.map((value) => <option key={value} value={value}>{value} min</option>)}
                </Select>
                <Input label="Price (INR)" type="number" min="0" step="1" {...register(`services.${index}.price`, { min: 0 })} />
              </div>
              <Input label="Description" fieldClassName="mt-3" {...register(`services.${index}.description`)} />
              {fields.length > 1 && <button type="button" onClick={() => remove(index)} className="mt-3 text-sm font-semibold text-danger hover:underline">Remove</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="panel-title">Invoice details</h2>
        <p className="mt-1 text-sm text-muted">Shown on the GST invoices your clients receive.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="GSTIN" placeholder="Optional" {...register('gstin')} />
          <Input label="Business address" {...register('businessAddress')} />
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty || slugState.available === false} className="shadow-lg">Save changes</Button>
      </div>
    </form>
  );
}

function PackagesPanel() {
  const toast = useToast();
  const { get } = useEntitlement();
  const [packages, setPackages] = useState(null);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', description: '', sessionCount: 3, ratePerSession: '', validityDays: 90 } });
  const capacity = get('packages.create');

  const load = () => api.get('/payments/packages').then(({ data }) => setPackages(data.packages)).catch((error) => toast.error(getErrorMessage(error)));

  useEffect(() => {
    load();
  }, []);

  const create = async (values) => {
    try {
      await api.post('/payments/packages', {
        name: values.name,
        description: values.description,
        sessionCount: Number(values.sessionCount),
        ratePerSession: rupeesToPaise(values.ratePerSession),
        validityDays: Number(values.validityDays),
      });
      toast.success('Package created');
      reset();
      setOpen(false);
      load();
    } catch (error) {
      if (!(error.response && error.response.data && error.response.data.code === 'UPGRADE_REQUIRED')) toast.error(getErrorMessage(error));
      else setOpen(false);
    }
  };

  const archive = async (pkg) => {
    try {
      await api.delete(`/payments/packages/${pkg._id}`);
      toast.success('Package removed');
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="panel-title">Session packages</h2>
          <p className="mt-1 text-sm text-muted">{capacity && capacity.limit !== null ? `${capacity.used} of ${capacity.limit} packages used on your plan.` : 'Bundle sessions at a lower rate. Clients buy them from their portal.'}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>New package</Button>
      </div>
      {!packages ? <Loader label="Loading packages" /> : packages.length === 0 ? (
        <p className="mt-5 text-sm text-muted">No packages yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {packages.map((pkg) => (
            <li key={pkg._id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div>
                <p className="font-semibold">{pkg.name}</p>
                <p className="text-sm text-muted">{pkg.sessionCount} sessions at {formatMoney(pkg.ratePerSession)} · valid {pkg.validityDays} days</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{formatMoney(pkg.sessionCount * pkg.ratePerSession)}</span>
                <Button size="sm" variant="danger" onClick={() => archive(pkg)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New package">
        <form onSubmit={handleSubmit(create)} className="space-y-4" noValidate>
          <Input label="Name" error={errors.name && errors.name.message} {...register('name', { required: 'Give the package a name' })} />
          <Input label="Description" {...register('description')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Sessions" {...register('sessionCount')}>{PACKAGE_SIZES.map((value) => <option key={value} value={value}>{value}</option>)}</Select>
            <Input label="Rate per session (INR)" type="number" min="0" error={errors.ratePerSession && errors.ratePerSession.message} {...register('ratePerSession', { required: 'Enter a rate' })} />
            <Input label="Valid for (days)" type="number" min="7" {...register('validityDays', { required: true, min: 7 })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Create package</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function PlanPanel() {
  const toast = useToast();
  const { plan, refresh } = useEntitlement();
  const [tiers, setTiers] = useState(null);
  const [switching, setSwitching] = useState('');

  useEffect(() => {
    api.get('/therapists/tiers').then(({ data }) => setTiers(data.tiers)).catch((error) => toast.error(getErrorMessage(error)));
  }, [toast]);

  const choose = async (tier) => {
    setSwitching(tier.key);
    try {
      await api.post('/therapists/me/tier', { tier: tier.key });
      await refresh();
      toast.success(`You are now on the ${tier.name} plan`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSwitching('');
    }
  };

  if (!tiers || !plan) return <Loader label="Loading plans" />;

  return (
    <section className="card p-6">
      <h2 className="panel-title">Your plan</h2>
      <p className="mt-1 text-sm text-muted">Platform fee on client payments: {plan.platformFeePercent}%. Plans change instantly and you can switch back any time.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => {
          const current = tier.rank === plan.rank;
          return (
            <div key={tier.key} className={`flex flex-col rounded-2xl border p-5 ${current ? 'border-brand bg-brand-soft/40' : 'border-line'}`}>
              <h3 className="text-lg font-bold">{tier.name}</h3>
              <p className="mt-1 text-2xl font-bold">{tier.monthlyPrice ? formatMoney(tier.monthlyPrice) : 'Free'}{tier.monthlyPrice > 0 && <span className="text-sm font-medium text-muted"> / month</span>}</p>
              <p className="mt-2 text-sm text-muted">{tier.description}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-calm" />{item}</li>
                ))}
              </ul>
              <Button className="mt-5" variant={current ? 'outline' : 'primary'} disabled={current} loading={switching === tier.key} onClick={() => choose(tier)}>
                {current ? 'Current plan' : tier.rank > plan.rank ? `Upgrade to ${tier.name}` : `Switch to ${tier.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Settings() {
  const location = useLocation();
  const [tab, setTab] = useState('profile');
  const tabs = [['profile', 'Profile'], ['packages', 'Packages'], ['plan', 'Plan']];

  return (
    <div>
      <PageHeader
        title="Settings"
        description={location.state && location.state.welcome ? 'Welcome to Unfazed. Add your story and session prices, then share your link.' : 'Manage your public page, pricing, packages and plan.'}
      />
      <div className="mb-6 inline-flex rounded-xl bg-white p-1 ring-1 ring-line" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-5 py-2 text-sm font-semibold ${tab === key ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfileForm />}
      {tab === 'packages' && <PackagesPanel />}
      {tab === 'plan' && <PlanPanel />}
    </div>
  );
}
