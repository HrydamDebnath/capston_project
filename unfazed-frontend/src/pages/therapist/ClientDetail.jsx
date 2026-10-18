import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Badge, { StatusBadge } from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import InvoiceView from '../../components/payments/InvoiceView.jsx';
import ChatWindow from '../../components/chat/ChatWindow.jsx';
import NoteViewer from '../../components/notes/NoteViewer.jsx';
import { therapistToken } from '../../utils/storage.js';
import { formatDate, formatDateTime, formatMoney, pluralize, splitList } from '../../utils/format.js';

const consentLabels = { treatment: 'Consent to treatment', privacy: 'Privacy and confidentiality', telehealth: 'Online sessions' };

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm">{value}</dd>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { therapist } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [tagsDraft, setTagsDraft] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/clients/${id}`);
      setData(response.data);
      setTagsDraft(response.data.client.tags.join(', '));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (changes, message) => {
    try {
      await api.patch(`/clients/${id}`, changes);
      if (message) toast.success(message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const resetCode = async () => {
    setBusy('code');
    try {
      const response = await api.post(`/clients/${id}/access-code`);
      setCode(response.data.accessCode);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const markSession = async (session, status) => {
    setBusy(session._id);
    try {
      await api.patch(`/scheduling/sessions/${session._id}`, { status });
      toast.success(status === 'completed' ? 'Marked as attended' : 'Marked as no-show');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  if (error) return <EmptyState title="Client not found" message={error} action={<Link to="/dashboard/clients" className="btn btn-primary">Back to clients</Link>} />;
  if (!data) return <Loader label="Loading client" />;

  const { client, onboarding, sessions, payments, notes, packages } = data;
  const paid = payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
  const completed = sessions.filter((item) => item.status === 'completed').length;
  const tabs = [['overview', 'Overview'], ['sessions', `Sessions (${sessions.length})`], ['payments', `Payments (${payments.length})`], ['notes', `Notes (${notes.length})`], ['messages', 'Messages']];
  const intake = client.intake;

  return (
    <div>
      <Link to="/dashboard/clients" className="text-sm font-semibold text-brand hover:underline">All clients</Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size={64} />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{client.name}</h1>
            <p className="text-sm text-muted">{client.email}{client.phone ? ` · ${client.phone}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={client.status} />
          <select value={client.status} onChange={(event) => update({ status: event.target.value }, 'Status updated')} className="input !w-auto !py-2 text-sm" aria-label="Client status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          <Button variant="outline" size="sm" loading={busy === 'code'} onClick={resetCode}>New access code</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm font-semibold text-muted">Sessions attended</p><p className="mt-1 font-display text-3xl font-bold">{completed}</p></div>
        <div className="card p-5"><p className="text-sm font-semibold text-muted">Total paid</p><p className="mt-1 font-display text-3xl font-bold">{formatMoney(paid)}</p></div>
        <div className="card p-5"><p className="text-sm font-semibold text-muted">Onboarding</p><p className="mt-2">{onboarding.complete ? <Badge tone="calm">Intake and consent done</Badge> : <Badge tone="warn">Waiting on client</Badge>}</p></div>
      </div>

      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Client sections">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold ${tab === key ? 'text-brand' : 'text-muted hover:text-ink'}`}>
            {label}
            {tab === key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-6">
              <h2 className="panel-title">Tags and summary</h2>
              <div className="mt-4 flex gap-2">
                <input className="input" value={tagsDraft} onChange={(event) => setTagsDraft(event.target.value)} aria-label="Tags" placeholder="anxiety, weekly" />
                <Button variant="soft" onClick={() => update({ tags: splitList(tagsDraft).map((tag) => tag.toLowerCase()) }, 'Tags saved')}>Save</Button>
              </div>
              {packages.length > 0 && (
                <div className="mt-5 space-y-2">
                  <h3 className="text-sm font-bold">Packages</h3>
                  {packages.map((item) => (
                    <div key={item._id} className="flex items-center justify-between rounded-xl bg-mist px-3 py-2.5 text-sm">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-muted">{pluralize(item.sessionsRemaining, 'session')} left</span>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="mt-6 text-sm font-bold">Consent record</h3>
              {client.consents.length ? (
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {client.consents.map((consent) => (
                    <li key={consent._id}>{consentLabels[consent.type]} · v{consent.version} · {formatDateTime(consent.acceptedAt, therapist.timezone, 'd MMM yyyy, h:mm a')}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No consent captured yet.</p>
              )}
            </section>

            <section className="card p-6">
              <h2 className="panel-title">Intake</h2>
              {intake && intake.completedAt ? (
                <dl className="mt-4 space-y-4">
                  <Detail label="What brings them here" value={intake.presentingConcern} />
                  <Detail label="Goals" value={intake.goals} />
                  <div className="grid grid-cols-2 gap-4">
                    <Detail label="Age" value={intake.demographics && intake.demographics.age} />
                    <Detail label="Gender" value={intake.demographics && intake.demographics.gender} />
                    <Detail label="Occupation" value={intake.demographics && intake.demographics.occupation} />
                    <Detail label="City" value={intake.demographics && intake.demographics.city} />
                  </div>
                  <Detail label="Emergency contact" value={intake.demographics && intake.demographics.emergencyContactName ? `${intake.demographics.emergencyContactName} · ${intake.demographics.emergencyContactPhone || ''}` : ''} />
                  <Detail label="Previous therapy" value={intake.history && (intake.history.previousTherapy ? 'Yes' : 'No')} />
                  <Detail label="Medications" value={intake.history && intake.history.medications} />
                  <Detail label="Medical conditions" value={intake.history && intake.history.medicalConditions} />
                  <Detail label="Family history" value={intake.history && intake.history.familyHistory} />
                </dl>
              ) : (
                <EmptyState title="Intake not completed" message="The client will see the form in their portal before their first session." />
              )}
            </section>
          </div>
        )}

        {tab === 'sessions' && (
          <section className="card p-6">
            {sessions.length ? (
              <div className="divide-y divide-line">
                {sessions.map((session) => {
                  const started = new Date(session.startsAt) <= new Date();
                  return (
                    <div key={session._id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                      <div>
                        <p className="font-semibold">{session.serviceTitle}</p>
                        <p className="text-sm text-muted">{formatDateTime(session.startsAt, therapist.timezone, 'EEE d MMM yyyy, h:mm a')} · {session.durationMinutes} min</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={session.status} />
                        {session.status === 'confirmed' && started && (
                          <>
                            <Button size="sm" variant="soft" loading={busy === session._id} onClick={() => markSession(session, 'completed')}>Attended</Button>
                            <Button size="sm" variant="danger" onClick={() => markSession(session, 'no_show')}>No-show</Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No sessions yet" />
            )}
          </section>
        )}

        {tab === 'payments' && (
          <section className="card p-6">
            {payments.length ? <div className="divide-y divide-line">{payments.map((item) => <InvoiceView key={item._id} payment={item} />)}</div> : <EmptyState title="No payments yet" />}
          </section>
        )}

        {tab === 'notes' && (
          <section className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => navigate(`/dashboard/notes?client=${client._id}`)}>Open notes workspace</Button>
            </div>
            {notes.length ? notes.map((note) => (
              <article key={note._id} className="card p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold">{note.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge tone={note.type === 'private' ? 'neutral' : 'brand'}>{note.type === 'private' ? 'Private' : 'Shared with client'}</Badge>
                    <span className="text-xs text-muted">{formatDate(note.updatedAt)}</span>
                  </div>
                </div>
                <NoteViewer note={note} />
              </article>
            )) : <div className="card"><EmptyState title="No notes yet" message="Write a private note for yourself or share one with the client." /></div>}
          </section>
        )}

        {tab === 'messages' && <ChatWindow role="therapist" token={therapistToken.get()} clientId={client._id} historyUrl={`/clients/${client._id}/messages`} counterpartName={client.name} />}
      </div>

      <Modal open={Boolean(code)} onClose={() => setCode('')} title="New access code" description="The client was also emailed this code. Their previous code no longer works.">
        <div className="rounded-2xl bg-brand-soft p-4 text-center">
          <p className="font-mono text-2xl font-bold tracking-widest">{code}</p>
        </div>
        <div className="mt-5 flex justify-end"><Button onClick={() => setCode('')}>Done</Button></div>
      </Modal>
    </div>
  );
}
