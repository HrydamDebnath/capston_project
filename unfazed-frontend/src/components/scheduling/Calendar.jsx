import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar({ month, onMonthChange, counts, selectedKey, onSelect, todayKey, canGoBack = true }) {
  const first = startOfMonth(month);
  const days = eachDayOfInterval({ start: first, end: endOfMonth(month) });
  const leading = (getDay(first) + 6) % 7;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMonthChange(subMonths(month, 1))} disabled={!canGoBack} className="rounded-lg p-2 hover:bg-mist disabled:opacity-30" aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="rounded-lg p-2 hover:bg-mist" aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
        {WEEK.map((day) => <div key={day} className="py-1.5">{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }).map((_, index) => <div key={`blank-${index}`} />)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const count = counts.get(key) || 0;
          const selected = key === selectedKey;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={!count}
              onClick={() => onSelect(key)}
              aria-pressed={selected}
              aria-label={`${format(day, 'EEEE d MMMM')}${count ? `, ${count} open times` : ', no open times'}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                selected ? 'bg-brand text-white' : count ? 'bg-brand-soft/60 text-ink hover:bg-brand-soft' : 'text-muted/50'
              }`}
            >
              {format(day, 'd')}
              {count > 0 && !selected && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-brand" />}
              {isToday && !selected && <span className="absolute inset-0 rounded-xl ring-1 ring-ink/25" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
