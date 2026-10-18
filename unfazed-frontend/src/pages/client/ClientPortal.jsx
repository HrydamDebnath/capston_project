import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import Avatar from '../../components/common/Avatar.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Loader from '../../components/common/Loader.jsx';
import Logo from '../../components/common/Logo.jsx';
import Modal from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Field.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import IntakeForm from '../../components/crm/IntakeForm.jsx';
import InvoiceView from '../../components/payments/InvoiceView.jsx';
import ChatWindow from '../../components/chat/ChatWindow.jsx';
import NoteViewer from '../../components/notes/NoteViewer.jsx';
import { clientToken } from '../../utils/storage.js';
import { formatDate, formatDateTime, formatMoney, pluralize } from '../../utils/format.js';
import setPageMeta from '../../utils/setPageMeta.js';

function PortalLogin({ slug, onSignedIn }) {
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { data } = await api.post('/portal/login', { ...values, slug }, { actor: 'client', skipAuthRedirect: true });
      clientToken.set(data.token);
      onSignedIn();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-mist">
      <div className="mx-auto max-w-md px-5 py-12">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to={`/${slug}`} className="text-sm font-semibold text-brand hover:underline">Back to profile</Link>
        </div>
        <div className="card mt-8 p-7">
          <h1 className="text-2xl font-bold">Client portal</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in with the email you booked with and the access code we sent you.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input label="Email" type="email" autoComplete="email" error={errors.email && errors.email.message} {...register('email', { required: 'Enter your email' })} />
            <Input label="Access code" autoCapitalize="characters" className="font-mono uppercase tracking-widest" error={errors.accessCode && errors.accessCode.message} {...register('accessCode', { required: 'Enter your access code' })} />
            {serverError && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{serverError}</p>}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
          </form>
          <p className="mt-5 text-sm text-muted">No account yet? <Link to={`/${slug}/book`} className="font-semibold text-brand hover:underline">Book your first session</Link></p>
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session, timezone, windowHours, onCancel }) {
  const upcoming = session.status === 'confirmed' && new Date(session.startsAt) > new Date();
  const canCancel = upcoming && new Date(session.startsAt).getTime() - Date.now() >= windowHours * 3600 * 1000;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <p className="font-semibold">{session.serviceTitle}</p>
        <p className="mt-0.5 text-sm text-muted">{formatDateTime(session.startsAt, timezone, "EEEE, d MMM 'at' h:mm a")} · {session.durationMinutes} min</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={session.status} />
        {upcoming && session.meetingLink && <a href={session.meetingLink} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Join</a>}
        {canCancel && <Button size="sm" variant="outline" onClick={() => onCancel(session)}>Cancel</Button>}
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState({ status: clientToken.get() ? 'loading' : 'signed-out', data: null });
  const [tab, setTab] = useState('overview');
  const [notes, setNotes] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [buying, setBuying] = useState('');

  const load = useCallback(async () => {
    if (!clientToken.get()) {
      setState({ status: 'signed-out', data: null });
      return;
    }
    try {
      const { data } = await api.get('/portal/me', { actor: 'client', skipAuthRedirect: true });
      if (data.therapist.slug !== slug) {
        clientToken.clear();
        setState({ status: 'signed-out', data: null });
        return;
      }
      setState({ status: 'ready', data });
    } catch (error) {
      clientToken.clear();
      setState({ status: 'signed-out', data: null });
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state.data) setPageMeta({ title: `Your portal | ${state.data.therapist.name}` });
  }, [state.data]);

  useEffect(() => {
    if (tab !== 'notes' || notes) return;
    api.get('/portal/notes', { actor: 'client' }).then(({ data }) => setNotes(data.notes)).catch((error) => toast.error(getErrorMessage(error)));
  }, [tab, notes, toast]);

  const now = Date.now();
  const sessions = state.data ? state.data.sessions : [];
  const upcoming = useMemo(() => sessions.filter((item) => item.status === 'confirmed' && new Date(item.startsAt).getTime() > now).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)), [sessions, now]);
  const history = useMemo(() => sessions.filter((item) => !upcoming.includes(item)), [sessions, upcoming]);

  const signOut = () => {
    clientToken.clear();
    setState({ status: 'signed-out', data: null });
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/portal/sessions/${cancelTarget._id}/cancel`, {}, { actor: 'client' });
      toast.success('Session cancelled');
      setCancelTarget(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  };

  const buyPackage = async (pkg) => {
    setBuying(pkg._id);
    try {
      const { data } = await api.post('/payments/package-order', { packageId: pkg._id }, { actor: 'client' });
      if (data.checkout) navigate(`/${slug}/pay`, { state: { checkout: data.checkout, purchase: true } });
      else {
        toast.success('Package added to your account');
        load();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBuying('');
    }
  };

  if (state.status === 'loading') return <Loader fullPage label="Opening your portal" />;
  if (state.status === 'signed-out') return <PortalLogin slug={slug} onSignedIn={() => { setState({ status: 'loading', data: null }); load(); }} />;

  const { client, therapist, onboarding, payments, purchases, packages, cancellationWindowHours } = state.data;
  const tabs = [
    ['overview', 'Overview'],
    ['sessions', 'Sessions'],
    ['notes', 'Shared notes'],
    ['billing', 'Billing'],
    ['messages', 'Messages'],
  ];

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Logo />
          <button type="button" onClick={signOut} className="text-sm font-semibold text-muted hover:text-ink">Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={therapist.name} src={therapist.photoUrl} size={56} />
            <div>
              <h1 className="text-2xl font-bold">Hi {client.name.split(' ')[0]}</h1>
              <p className="text-sm text-muted">Your space with {therapist.name}</p>
            </div>
          </div>
          <Link to={`/${slug}/book`} className="btn btn-primary">Book a session</Link>
        </div>

        {location.state && location.state.booked && (
          <p className="mt-6 rounded-2xl bg-calm-soft px-5 py-4 text-sm font-semibold text-[#137a63]">Your booking is confirmed. We emailed you the details.</p>
        )}

        <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Portal sections">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold ${tab === key ? 'text-brand' : 'text-muted hover:text-ink'}`}
            >
              {label}
              {key === 'messages' && state.data.unreadMessages > 0 && <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white">{state.data.unreadMessages}</span>}
              {tab === key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </nav>

        <div className="mt-7">
          {tab === 'overview' && (
            <div className="space-y-6">
              {!onboarding.complete && (
                <section className="card p-6">
                  <h2 className="text-xl font-bold">Before your first session</h2>
                  <p className="mb-6 mt-1 text-sm text-muted">This takes about five minutes and helps your therapist prepare. Only {therapist.name} can see your answers.</p>
                  <IntakeForm onComplete={() => { toast.success('Thank you, your intake is saved'); load(); }} />
                </section>
              )}
              <section className="card p-6">
                <h2 className="panel-title">Next session</h2>
                {upcoming.length ? (
                  <div className="divide-y divide-line">
                    {upcoming.slice(0, 2).map((item) => <SessionRow key={item._id} session={item} timezone={client.timezone} windowHours={cancellationWindowHours} onCancel={setCancelTarget} />)}
                  </div>
                ) : (
                  <EmptyState title="Nothing booked yet" message="Pick a time that suits you and it will show up here." action={<Link to={`/${slug}/book`} className="btn btn-primary">Find a time</Link>} />
                )}
              </section>
              {purchases.filter((item) => item.status === 'active').map((item) => (
                <section key={item._id} className="card flex flex-wrap items-center justify-between gap-3 p-6">
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm text-muted">{pluralize(item.sessionsRemaining, 'session')} left · expires {formatDate(item.expiresAt)}</p>
                  </div>
                  <div className="h-2 w-40 overflow-hidden rounded-full bg-mist">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(item.sessionsUsed / item.sessionsTotal) * 100}%` }} />
                  </div>
                </section>
              ))}
            </div>
          )}

          {tab === 'sessions' && (
            <section className="card p-6">
              <h2 className="panel-title">All sessions</h2>
              {sessions.length ? (
                <div className="divide-y divide-line">
                  {[...upcoming, ...history].map((item) => <SessionRow key={item._id} session={item} timezone={client.timezone} windowHours={cancellationWindowHours} onCancel={setCancelTarget} />)}
                </div>
              ) : (
                <EmptyState title="No sessions yet" message="Your upcoming and past sessions will be listed here." />
              )}
            </section>
          )}

          {tab === 'notes' && (
            <section className="space-y-4">
              {!notes ? <Loader label="Loading notes" /> : notes.length === 0 ? (
                <div className="card"><EmptyState title="No shared notes" message={`When ${therapist.name} shares a note, such as exercises to try, it will appear here.`} /></div>
              ) : (
                notes.map((note) => (
                  <article key={note.id} className="card p-6">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-bold">{note.title}</h3>
                      <span className="text-xs text-muted">{formatDate(note.sharedAt)}</span>
                    </div>
                    <NoteViewer note={note} />
                  </article>
                ))
              )}
            </section>
          )}

          {tab === 'billing' && (
            <div className="space-y-6">
              <section className="card p-6">
                <h2 className="panel-title">Payments and invoices</h2>
                {payments.length ? (
                  <div className="divide-y divide-line">{payments.map((item) => <InvoiceView key={item._id} payment={item} actor="client" />)}</div>
                ) : (
                  <EmptyState title="No payments yet" message="Receipts and GST invoices will appear here after you pay for a session." />
                )}
              </section>
              {packages.length > 0 && (
                <section className="card p-6">
                  <h2 className="panel-title">Session packages</h2>
                  <p className="mt-1 text-sm text-muted">Pay once and book sessions with credits.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {packages.map((pkg) => (
                      <div key={pkg._id} className="rounded-2xl border border-line p-4">
                        <p className="font-bold">{pkg.name}</p>
                        <p className="text-sm text-muted">{pkg.sessionCount} sessions · {formatMoney(pkg.ratePerSession)} each · valid {pkg.validityDays} days</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="font-bold">{formatMoney(pkg.sessionCount * pkg.ratePerSession)}</span>
                          <Button size="sm" loading={buying === pkg._id} onClick={() => buyPackage(pkg)}>Buy package</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'messages' && <ChatWindow role="client" token={clientToken.get()} historyUrl="/portal/messages" counterpartName={therapist.name} />}
        </div>
      </div>

      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancel this session?" description="The slot will be released for other clients.">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep session</Button>
          <Button variant="danger" loading={cancelling} onClick={confirmCancel}>Cancel session</Button>
        </div>
      </Modal>
    </div>
  );
}
