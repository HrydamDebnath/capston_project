import { useCallback, useEffect, useState } from 'react';
import { addDays, endOfMonth, startOfMonth, subDays } from 'date-fns';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Loader from '../../components/common/Loader.jsx';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import SessionCalendar from '../../components/scheduling/SessionCalendar.jsx';
import AvailabilityEditor from '../../components/scheduling/AvailabilityEditor.jsx';
import { formatDateTime, formatMoney } from '../../utils/format.js';

export default function Schedule() {
  const { therapist } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('calendar');
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [sessions, setSessions] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    const from = subDays(startOfMonth(date), 7);
    const to = addDays(endOfMonth(date), 7);
    try {
      const { data } = await api.get('/scheduling/sessions', { params: { from: from.toISOString(), to: to.toISOString() } });
      setSessions(data.sessions);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [date, toast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    api.get('/scheduling/availability').then(({ data }) => setAvailability(data.availability)).catch((error) => toast.error(getErrorMessage(error)));
  }, [toast]);

  const act = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/scheduling/sessions/${selected._id}`, { status });
      toast.success(status === 'cancelled' ? 'Session cancelled' : status === 'completed' ? 'Marked as attended' : 'Marked as no-show');
      setSelected(null);
      loadSessions();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const save = async (draft) => {
    setSaving(true);
    try {
      const { data } = await api.put('/scheduling/availability', draft);
      setAvailability(data.availability);
      toast.success('Availability saved');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const started = selected && new Date(selected.startsAt) <= new Date();
  const upcoming = selected && new Date(selected.startsAt) > new Date();

  return (
    <div>
      <PageHeader title="Schedule" description={`Times shown in ${therapist.timezone.replace(/_/g, ' ')}.`} />

      <div className="mb-6 inline-flex rounded-xl bg-white p-1 ring-1 ring-line" role="tablist">
        {[['calendar', 'Calendar'], ['availability', 'Availability']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-5 py-2 text-sm font-semibold ${tab === key ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        <div className="card p-4 sm:p-5">
          <SessionCalendar sessions={sessions} date={date} view={view} onNavigate={setDate} onView={setView} onSelect={setSelected} />
        </div>
      ) : availability ? (
        <AvailabilityEditor availability={availability} saving={saving} onSave={save} />
      ) : (
        <Loader label="Loading availability" />
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected && selected.client ? selected.client.name : 'Session'} description={selected ? selected.serviceTitle : ''}>
        {selected && (
          <div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">When</dt><dd className="font-semibold">{formatDateTime(selected.startsAt, therapist.timezone, 'EEE d MMM yyyy, h:mm a')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Length</dt><dd className="font-semibold">{selected.durationMinutes} minutes</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Fee</dt><dd className="font-semibold">{formatMoney(selected.fee)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd><StatusBadge status={selected.status} /></dd></div>
            </dl>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {selected.status === 'confirmed' && selected.meetingLink && <a href={selected.meetingLink} target="_blank" rel="noreferrer" className="btn btn-outline">Open video room</a>}
              {selected.status === 'confirmed' && started && (
                <>
                  <Button variant="soft" loading={busy} onClick={() => act('completed')}>Attended</Button>
                  <Button variant="danger" loading={busy} onClick={() => act('no_show')}>No-show</Button>
                </>
              )}
              {selected.status === 'confirmed' && upcoming && <Button variant="danger" loading={busy} onClick={() => act('cancelled')}>Cancel session</Button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
