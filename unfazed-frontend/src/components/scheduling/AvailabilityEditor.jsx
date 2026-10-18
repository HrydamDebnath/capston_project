import { useState } from 'react';
import { format } from 'date-fns';
import Button from '../common/Button.jsx';
import { Select } from '../common/Field.jsx';
import { WEEKDAYS, SESSION_DURATIONS } from '../../utils/constants.js';

const DEFAULT_RANGE = { start: '10:00', end: '13:00' };

function RangeList({ ranges, onChange }) {
  const update = (index, field, value) => onChange(ranges.map((range, i) => (i === index ? { ...range, [field]: value } : range)));
  const remove = (index) => onChange(ranges.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {ranges.map((range, index) => (
        <div key={index} className="flex items-center gap-2">
          <input type="time" value={range.start} onChange={(event) => update(index, 'start', event.target.value)} className="input !w-32 !py-2" aria-label="Start time" />
          <span className="text-muted">to</span>
          <input type="time" value={range.end} onChange={(event) => update(index, 'end', event.target.value)} className="input !w-32 !py-2" aria-label="End time" />
          <button type="button" onClick={() => remove(index)} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remove time range">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...ranges, DEFAULT_RANGE])} className="text-sm font-semibold text-brand hover:underline">Add hours</button>
    </div>
  );
}

function toLocalInput(iso) {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export default function AvailabilityEditor({ availability, saving, onSave }) {
  const [draft, setDraft] = useState(() => ({
    weekly: availability.weekly,
    overrides: availability.overrides,
    blocked: availability.blocked,
    durations: availability.durations,
    bufferMinutes: availability.bufferMinutes,
    minNoticeHours: availability.minNoticeHours,
    maxAdvanceDays: availability.maxAdvanceDays,
  }));

  const rangesFor = (day) => {
    const entry = draft.weekly.find((item) => item.day === day);
    return entry ? entry.ranges : [];
  };

  const setDayRanges = (day, ranges) => {
    const others = draft.weekly.filter((item) => item.day !== day);
    setDraft({ ...draft, weekly: ranges.length ? [...others, { day, ranges }] : others });
  };

  const toggleDay = (day, enabled) => setDayRanges(day, enabled ? [{ start: '10:00', end: '17:00' }] : []);

  const toggleDuration = (value) => {
    const next = draft.durations.includes(value) ? draft.durations.filter((item) => item !== value) : [...draft.durations, value];
    setDraft({ ...draft, durations: next.sort((a, b) => a - b) });
  };

  const addOverride = () => setDraft({ ...draft, overrides: [...draft.overrides, { date: format(new Date(), 'yyyy-MM-dd'), ranges: [] }] });
  const updateOverride = (index, changes) => setDraft({ ...draft, overrides: draft.overrides.map((item, i) => (i === index ? { ...item, ...changes } : item)) });
  const removeOverride = (index) => setDraft({ ...draft, overrides: draft.overrides.filter((_, i) => i !== index) });

  const addBlock = () => {
    const start = new Date();
    start.setHours(start.getHours() + 24, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    setDraft({ ...draft, blocked: [...draft.blocked, { start: start.toISOString(), end: end.toISOString(), reason: '' }] });
  };
  const updateBlock = (index, changes) => setDraft({ ...draft, blocked: draft.blocked.map((item, i) => (i === index ? { ...item, ...changes } : item)) });
  const removeBlock = (index) => setDraft({ ...draft, blocked: draft.blocked.filter((_, i) => i !== index) });

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="panel-title">Weekly hours</h2>
        <p className="mt-1 text-sm text-muted">Clients can book inside these windows, shown to them in their own timezone.</p>
        <div className="mt-5 divide-y divide-line">
          {WEEKDAYS.map(({ day, label }) => {
            const ranges = rangesFor(day);
            return (
              <div key={day} className="grid gap-3 py-4 sm:grid-cols-[10rem_1fr]">
                <label className="flex items-center gap-3 font-semibold">
                  <input type="checkbox" className="h-4 w-4 accent-brand" checked={ranges.length > 0} onChange={(event) => toggleDay(day, event.target.checked)} />
                  {label}
                </label>
                {ranges.length ? <RangeList ranges={ranges} onChange={(next) => setDayRanges(day, next)} /> : <p className="text-sm text-muted">Unavailable</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="panel-title">Session lengths and spacing</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {SESSION_DURATIONS.map((value) => {
            const on = draft.durations.includes(value);
            return (
              <button key={value} type="button" onClick={() => toggleDuration(value)} aria-pressed={on} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${on ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line hover:border-brand/50'}`}>
                {value} min
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Select label="Buffer between sessions" value={draft.bufferMinutes} onChange={(event) => setDraft({ ...draft, bufferMinutes: Number(event.target.value) })}>
            {[0, 5, 10, 15, 30, 45, 60].map((value) => <option key={value} value={value}>{value === 0 ? 'No buffer' : `${value} minutes`}</option>)}
          </Select>
          <Select label="Minimum notice" value={draft.minNoticeHours} onChange={(event) => setDraft({ ...draft, minNoticeHours: Number(event.target.value) })}>
            {[0, 2, 6, 12, 24, 48].map((value) => <option key={value} value={value}>{value === 0 ? 'None' : `${value} hours`}</option>)}
          </Select>
          <Select label="Book up to" value={draft.maxAdvanceDays} onChange={(event) => setDraft({ ...draft, maxAdvanceDays: Number(event.target.value) })}>
            {[14, 30, 45, 60, 90, 180].map((value) => <option key={value} value={value}>{value} days ahead</option>)}
          </Select>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="panel-title">Date overrides</h2>
            <p className="mt-1 text-sm text-muted">Change your hours for a single day, or close it entirely.</p>
          </div>
          <Button size="sm" variant="outline" onClick={addOverride}>Add override</Button>
        </div>
        <div className="mt-4 space-y-4">
          {draft.overrides.length === 0 && <p className="text-sm text-muted">No overrides set.</p>}
          {draft.overrides.map((override, index) => (
            <div key={index} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center gap-3">
                <input type="date" value={override.date} onChange={(event) => updateOverride(index, { date: event.target.value })} className="input !w-44 !py-2" aria-label="Override date" />
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" className="h-4 w-4 accent-brand" checked={override.ranges.length === 0} onChange={(event) => updateOverride(index, { ranges: event.target.checked ? [] : [DEFAULT_RANGE] })} />
                  Closed all day
                </label>
                <button type="button" onClick={() => removeOverride(index)} className="ml-auto text-sm font-semibold text-danger hover:underline">Remove</button>
              </div>
              {override.ranges.length > 0 && <div className="mt-3"><RangeList ranges={override.ranges} onChange={(next) => updateOverride(index, { ranges: next })} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="panel-title">Blocked time</h2>
            <p className="mt-1 text-sm text-muted">Holidays, conferences or anything else that needs a clear calendar.</p>
          </div>
          <Button size="sm" variant="outline" onClick={addBlock}>Block time</Button>
        </div>
        <div className="mt-4 space-y-3">
          {draft.blocked.length === 0 && <p className="text-sm text-muted">Nothing blocked.</p>}
          {draft.blocked.map((block, index) => (
            <div key={index} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-4">
              <input type="datetime-local" value={toLocalInput(block.start)} onChange={(event) => updateBlock(index, { start: new Date(event.target.value).toISOString() })} className="input !w-56 !py-2" aria-label="Block starts" />
              <span className="text-muted">until</span>
              <input type="datetime-local" value={toLocalInput(block.end)} onChange={(event) => updateBlock(index, { end: new Date(event.target.value).toISOString() })} className="input !w-56 !py-2" aria-label="Block ends" />
              <input type="text" value={block.reason || ''} onChange={(event) => updateBlock(index, { reason: event.target.value })} placeholder="Reason (optional)" className="input !w-48 !py-2" aria-label="Reason" />
              <button type="button" onClick={() => removeBlock(index)} className="ml-auto text-sm font-semibold text-danger hover:underline">Remove</button>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" loading={saving} onClick={() => onSave(draft)} className="shadow-lg">Save availability</Button>
      </div>
    </div>
  );
}
