import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import Calendar from './Calendar.jsx';
import Loader from '../common/Loader.jsx';
import { listTimezones } from '../../utils/timezones.js';

export default function SlotPicker({ slots, loading, timezone, onTimezoneChange, month, onMonthChange, selectedSlot, onSelect }) {
  const [dayKey, setDayKey] = useState('');

  const grouped = useMemo(() => {
    const map = new Map();
    slots.forEach((slot) => {
      const key = formatInTimeZone(new Date(slot), timezone, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(slot);
    });
    return map;
  }, [slots, timezone]);

  const counts = useMemo(() => new Map([...grouped.entries()].map(([key, list]) => [key, list.length])), [grouped]);
  const todayKey = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
  const currentMonthKey = format(startOfMonth(parseISO(todayKey)), 'yyyy-MM');

  useEffect(() => {
    if (!dayKey || !grouped.has(dayKey)) {
      const firstKey = [...grouped.keys()].sort()[0];
      setDayKey(firstKey || '');
    }
  }, [grouped, dayKey]);

  const daySlots = grouped.get(dayKey) || [];
  const zones = useMemo(() => listTimezones(timezone), [timezone]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
      <div>
        <Calendar
          month={month}
          onMonthChange={onMonthChange}
          counts={counts}
          selectedKey={dayKey}
          onSelect={setDayKey}
          todayKey={todayKey}
          canGoBack={format(month, 'yyyy-MM') > currentMonthKey}
        />
        <div className="mt-5">
          <label htmlFor="timezone" className="mb-1.5 block text-xs font-semibold text-muted">Times shown in</label>
          <select id="timezone" value={timezone} onChange={(event) => onTimezoneChange(event.target.value)} className="input !py-2 text-sm">
            {zones.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold">{dayKey ? format(parseISO(dayKey), 'EEEE, d MMM') : 'Open times'}</h4>
        {loading ? (
          <Loader label="Checking times" />
        ) : daySlots.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-1">
            {daySlots.map((slot) => {
              const selected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onSelect(slot)}
                  aria-pressed={selected}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${selected ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}
                >
                  {formatInTimeZone(new Date(slot), timezone, 'h:mm a')}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No open times in this month. Try the next one.</p>
        )}
      </div>
    </div>
  );
}
