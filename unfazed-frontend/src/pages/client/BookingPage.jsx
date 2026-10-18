import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Logo from '../../components/common/Logo.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { Input } from '../../components/common/Field.jsx';
import SlotPicker from '../../components/scheduling/SlotPicker.jsx';
import WaitlistForm from '../../components/scheduling/WaitlistForm.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { browserTimezone, formatMoney } from '../../utils/format.js';
import { clientToken } from '../../utils/storage.js';
import setPageMeta from '../../utils/setPageMeta.js';

export default function BookingPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [portal, setPortal] = useState(null);
  const [serviceId, setServiceId] = useState(searchParams.get('service') || '');
  const [timezone, setTimezone] = useState(browserTimezone());
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [usePackage, setUsePackage] = useState('');
  const [notAccepting, setNotAccepting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '', phone: '' } });

  useEffect(() => {
    api
      .get(`/therapists/public/${slug}`, { skipAuthRedirect: true })
      .then(({ data }) => {
        setProfile(data);
        setServiceId((current) => current || (data.therapist.services[0] && data.therapist.services[0]._id) || '');
        setPageMeta({ title: `Book a session with ${data.therapist.name}` });
      })
      .catch((error) => setLoadError(getErrorMessage(error)));
  }, [slug]);

  useEffect(() => {
    if (!clientToken.get()) return;
    api
      .get('/portal/me', { actor: 'client', skipAuthRedirect: true })
      .then(({ data }) => {
        if (data.therapist.slug === slug) setPortal(data);
      })
      .catch(() => clientToken.clear());
  }, [slug]);

  const loadSlots = useCallback(async () => {
    if (!serviceId) return;
    setSlotsLoading(true);
    try {
      const { data } = await api.get(`/scheduling/public/${slug}/slots`, {
        params: { serviceId, from: format(startOfMonth(month), 'yyyy-MM-dd'), to: format(endOfMonth(month), 'yyyy-MM-dd') },
        skipAuthRedirect: true,
      });
      setSlots(data.slots);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSlotsLoading(false);
    }
  }, [slug, serviceId, month, toast]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => setSelectedSlot(''), [serviceId]);

  const service = useMemo(() => (profile ? profile.therapist.services.find((item) => item._id === serviceId) : null), [profile, serviceId]);
  const usablePackages = useMemo(() => (portal ? portal.purchases.filter((item) => item.status === 'active' && item.sessionsRemaining > 0) : []), [portal]);

  const onSubmit = async (values) => {
    try {
      const body = { ...values, serviceId, startsAt: selectedSlot, timezone };
      if (usePackage) body.clientPackageId = usePackage;
      const { data } = await api.post(`/scheduling/public/${slug}/book`, body, { actor: 'client', skipAuthRedirect: true });
      if (data.portalToken) clientToken.set(data.portalToken);

      if (data.checkout) {
        navigate(`/${slug}/pay`, { state: { checkout: data.checkout, session: data.session, accessCode: data.accessCode, timezone } });
      } else {
        toast.success('Your session is booked');
        navigate(`/${slug}/portal`, { state: { booked: true, accessCode: data.accessCode } });
      }
    } catch (error) {
      const code = error.response && error.response.data && error.response.data.code;
      if (code === 'SLOT_TAKEN') {
        setSelectedSlot('');
        loadSlots();
      }
      if (code === 'NOT_ACCEPTING') setNotAccepting(true);
      toast.error(getErrorMessage(error));
    }
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <EmptyState title="We could not open this booking page" message={loadError} action={<Link to="/" className="btn btn-primary">Back to home</Link>} />
      </div>
    );
  }
  if (!profile) return <Loader fullPage label="Loading booking page" />;

  const { therapist } = profile;
  const slotLabel = selectedSlot ? formatInTimeZone(new Date(selectedSlot), timezone, "EEEE, d MMM 'at' h:mm a") : '';

  return (
    <div className="min-h-screen bg-mist">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Logo />
          <Link to={`/${slug}`} className="text-sm font-semibold text-brand hover:underline">Back to profile</Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <section className="card p-6">
            <h1 className="text-2xl font-bold">Choose a session</h1>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {therapist.services.map((item) => (
                <label key={item._id} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${item._id === serviceId ? 'border-brand bg-brand-soft/50' : 'border-line hover:border-brand/50'}`}>
                  <input type="radio" name="service" value={item._id} checked={item._id === serviceId} onChange={() => setServiceId(item._id)} className="sr-only" />
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-bold">{item.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">{item.durationMinutes} minutes</span>
                    </span>
                    <span className="font-bold">{formatMoney(item.price)}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-bold">Pick a time</h2>
            <div className="mt-5">
              <SlotPicker
                slots={slots}
                loading={slotsLoading}
                timezone={timezone}
                onTimezoneChange={setTimezone}
                month={month}
                onMonthChange={setMonth}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            </div>
            {!slotsLoading && slots.length === 0 && (
              <div className="mt-6"><WaitlistForm slug={slug} therapistName={therapist.name} /></div>
            )}
          </section>

          {selectedSlot && (
            <section className="card p-6">
              <h2 className="text-2xl font-bold">{portal ? 'Confirm your booking' : 'Your details'}</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
                {portal ? (
                  <p className="rounded-xl bg-mist px-4 py-3 text-sm">Booking as <span className="font-semibold">{portal.client.name}</span> ({portal.client.email})</p>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Full name" autoComplete="name" error={errors.name && errors.name.message} {...register('name', { required: 'Enter your name' })} />
                      <Input label="Email" type="email" autoComplete="email" error={errors.email && errors.email.message} {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
                    </div>
                    <Input label="Phone" type="tel" autoComplete="tel" hint="Used for WhatsApp reminders" error={errors.phone && errors.phone.message} {...register('phone', { required: 'Enter a phone number for reminders', minLength: { value: 8, message: 'Enter a valid phone number' } })} />
                  </>
                )}

                {usablePackages.length > 0 && (
                  <div className="rounded-xl border border-line p-4">
                    <p className="text-sm font-semibold">Use a package credit</p>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="package" checked={!usePackage} onChange={() => setUsePackage('')} /> Pay for this session
                      </label>
                      {usablePackages.map((item) => (
                        <label key={item._id} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="package" checked={usePackage === item._id} onChange={() => setUsePackage(item._id)} />
                          {item.name} ({item.sessionsRemaining} left)
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {notAccepting && <WaitlistForm slug={slug} therapistName={therapist.name} />}
                <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
                  {usePackage ? 'Book with package credit' : service && service.price > 0 ? `Continue to payment` : 'Confirm booking'}
                </Button>
              </form>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <Avatar name={therapist.name} src={therapist.photoUrl} size={52} />
              <div>
                <p className="font-bold">{therapist.name}</p>
                <p className="text-sm text-muted">{therapist.city}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Session</dt><dd className="text-right font-semibold">{service ? service.title : '-'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Length</dt><dd className="font-semibold">{service ? `${service.durationMinutes} minutes` : '-'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">When</dt><dd className="text-right font-semibold">{slotLabel || 'Choose a time'}</dd></div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-bold">{usePackage ? 'Package credit' : service ? formatMoney(service.price) : '-'}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-muted">Your slot is held for a few minutes while you pay. Sessions can be cancelled from your client portal up to 24 hours before the start.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
