import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/analytics/StatCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { formatDateTime, formatMoney } from '../../utils/format.js';

export default function Dashboard() {
  const { therapist } = useAuth();
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [leads, setLeads] = useState([]);
  const [outbox, setOutbox] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/analytics/overview'), api.get('/therapists/me/leads', { params: { status: 'new' } }), api.get('/therapists/me/outbox')])
      .then(([overviewRes, leadsRes, outboxRes]) => {
        setOverview(overviewRes.data);
        setLeads(leadsRes.data.leads);
        setOutbox(outboxRes.data.messages.slice(0, 5));
      })
      .catch((error) => toast.error(getErrorMessage(error)));
  }, [toast]);

  const markContacted = async (lead) => {
    try {
      await api.patch(`/therapists/me/leads/${lead._id}`, { status: 'contacted' });
      setLeads((items) => items.filter((item) => item._id !== lead._id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${therapist.slug}`);
      toast.success('Link copied');
    } catch (error) {
      toast.error('Copy failed. Select the link and copy it manually.');
    }
  };

  if (!overview) return <Loader label="Loading your practice" />;
  const { summary, upcoming } = overview;
  const change = summary.revenueChangePercent;

  return (
    <div>
      <PageHeader title={`Welcome back, ${therapist.name.replace(/^Dr\.?\s+/i, '').split(' ')[0]}`} description="Here is what your practice looks like today." />

      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">Your booking link</p>
          <p className="truncate font-display text-xl font-bold">{window.location.host}/{therapist.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLink}>Copy link</Button>
          <a href={`/${therapist.slug}`} target="_blank" rel="noreferrer" className="btn btn-soft">Preview page</a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected this month" value={formatMoney(summary.revenueThisMonth)} note={`${change >= 0 ? '+' : ''}${change}% vs last month`} tone={change >= 0 ? 'up' : 'down'} />
        <StatCard label="Active clients" value={summary.activeClients} />
        <StatCard label="Sessions this month" value={summary.sessionsThisMonth} />
        <StatCard label="No-show rate" value={`${summary.noShowRate}%`} note={`${summary.noShows} of ${summary.heldSessions} in the last 90 days`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="panel-title">Upcoming sessions</h2>
            <Link to="/dashboard/schedule" className="text-sm font-semibold text-brand hover:underline">Open schedule</Link>
          </div>
          {upcoming.length ? (
            <ul className="mt-3 divide-y divide-line">
              {upcoming.map((session) => (
                <li key={session._id} className="flex items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="font-semibold">{session.client ? session.client.name : 'Client'}</p>
                    <p className="text-sm text-muted">{formatDateTime(session.startsAt, therapist.timezone, "EEE d MMM, h:mm a")} · {session.serviceTitle}</p>
                  </div>
                  {session.meetingLink && <a href={session.meetingLink} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm">Join</a>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming sessions" message="Share your link to start filling your calendar." />
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="panel-title">New enquiries</h2>
              {summary.newLeads > 0 && <Badge tone="brand">{summary.newLeads}</Badge>}
            </div>
            {leads.length ? (
              <ul className="mt-3 divide-y divide-line">
                {leads.slice(0, 4).map((lead) => (
                  <li key={lead._id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{lead.name}</p>
                        <p className="truncate text-xs text-muted">{lead.email}</p>
                        {lead.concern && <p className="mt-1 line-clamp-2 text-sm text-muted">{lead.concern}</p>}
                      </div>
                      <Badge tone={lead.source === 'waitlist' ? 'warn' : 'neutral'}>{lead.source === 'waitlist' ? 'Waitlist' : 'Enquiry'}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => markContacted(lead)}>Mark contacted</Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No new enquiries right now.</p>
            )}
          </section>

          <section className="card p-6">
            <h2 className="panel-title">Recent notifications</h2>
            <p className="mt-1 text-xs text-muted">Messages the system sent or queued for your clients.</p>
            {outbox.length ? (
              <ul className="mt-3 space-y-3">
                {outbox.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 text-sm">
                    <Badge tone={item.channel === 'whatsapp' ? 'calm' : 'brand'}>{item.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</Badge>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.subject || item.event}</p>
                      <p className="truncate text-xs text-muted">To {item.to} · {item.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Nothing sent yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
