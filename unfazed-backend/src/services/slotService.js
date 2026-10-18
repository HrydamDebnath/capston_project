const { addMinutes } = require('date-fns');
const { fromZonedTime } = require('date-fns-tz');
const Session = require('../models/Session');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 62;

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function rangesForDate(availability, dateStr) {
  const override = availability.overrides.find((item) => item.date === dateStr);
  if (override) return override.ranges;
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const entry = availability.weekly.find((item) => item.day === weekday);
  return entry ? entry.ranges : [];
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function generateSlots({ availability, fromDate, toDate, duration, busy = [], now = new Date() }) {
  const timezone = availability.timezone;
  const earliest = addMinutes(now, availability.minNoticeHours * 60);
  const latest = new Date(now.getTime() + availability.maxAdvanceDays * DAY_MS);
  const step = duration + availability.bufferMinutes;
  const first = new Date(`${fromDate}T00:00:00Z`);
  const last = new Date(`${toDate}T00:00:00Z`);

  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last < first) return [];
  if ((last - first) / DAY_MS > MAX_RANGE_DAYS) return [];

  const slots = [];
  for (let cursor = first; cursor <= last; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const dateStr = cursor.toISOString().slice(0, 10);
    for (const range of rangesForDate(availability, dateStr)) {
      const rangeEnd = toMinutes(range.end);
      for (let minute = toMinutes(range.start); minute + duration <= rangeEnd; minute += step) {
        const start = fromZonedTime(`${dateStr}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00`, timezone);
        const end = addMinutes(start, duration);
        if (start < earliest || start > latest) continue;
        if (availability.blocked.some((block) => overlaps(start, end, block.start, block.end))) continue;
        if (busy.some((slot) => overlaps(start, end, slot.start, slot.end))) continue;
        slots.push(start);
      }
    }
  }
  return slots;
}

async function getBusyIntervals(therapistId, fromDate, toDate, bufferMinutes, now = new Date()) {
  const from = new Date(new Date(`${fromDate}T00:00:00Z`).getTime() - 2 * DAY_MS);
  const to = new Date(new Date(`${toDate}T00:00:00Z`).getTime() + 3 * DAY_MS);
  const sessions = await Session.find({
    therapist: therapistId,
    holdsSlot: true,
    startsAt: { $gte: from, $lte: to },
    $or: [{ status: 'confirmed' }, { status: 'pending', holdExpiresAt: { $gt: now } }],
  }).select('startsAt endsAt');
  return sessions.map((item) => ({
    start: addMinutes(item.startsAt, -bufferMinutes),
    end: addMinutes(item.endsAt, bufferMinutes),
  }));
}

module.exports = { generateSlots, getBusyIntervals, MAX_RANGE_DAYS };
