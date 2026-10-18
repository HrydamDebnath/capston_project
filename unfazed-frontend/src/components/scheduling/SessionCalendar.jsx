import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enIN } from 'date-fns/locale';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-IN': enIN },
});

const palette = {
  confirmed: { backgroundColor: '#3d4fd9', color: '#fff' },
  completed: { backgroundColor: '#1f9d82', color: '#fff' },
  no_show: { backgroundColor: '#c93a54', color: '#fff' },
  cancelled: { backgroundColor: '#e3e7ef', color: '#5b6477' },
  pending: { backgroundColor: '#fcefd8', color: '#b96f0e' },
};

export default function SessionCalendar({ sessions, date, view, onNavigate, onView, onSelect }) {
  const events = useMemo(
    () =>
      sessions
        .filter((session) => session.status !== 'cancelled')
        .map((session) => ({
          id: session._id,
          title: `${session.client ? session.client.name : 'Client'} · ${session.serviceTitle}`,
          start: new Date(session.startsAt),
          end: new Date(session.endsAt),
          session,
        })),
    [sessions]
  );

  return (
    <div className="h-[44rem]">
      <Calendar
        localizer={localizer}
        culture="en-IN"
        events={events}
        date={date}
        view={view}
        views={['month', 'week', 'day']}
        onNavigate={onNavigate}
        onView={onView}
        onSelectEvent={(event) => onSelect(event.session)}
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 0, 1, 9)}
        eventPropGetter={(event) => ({ style: palette[event.session.status] || palette.confirmed })}
        popup
      />
    </div>
  );
}
