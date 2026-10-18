const { addMinutes } = require('date-fns');
const { formatInTimeZone } = require('date-fns-tz');
const Therapist = require('../models/Therapist');
const Availability = require('../models/Availability');
const Client = require('../models/Client');
const Session = require('../models/Session');
const ClientPackage = require('../models/ClientPackage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { generateAccessCode } = require('../utils/accessCode');
const { generateSlots, getBusyIntervals } = require('../services/slotService');
const { canAccess } = require('../services/entitlementService');
const { createPaymentOrder } = require('../services/billingService');
const { confirmSession, cancelSession } = require('../services/bookingService');
const { registerLead } = require('../services/leadDistributionService');
const notificationService = require('../services/notificationService');
const { slotHoldMinutes } = require('../config/billing');
const { defaultWeeklyHours } = require('../config/defaults');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const SESSION_DURATIONS = [30, 45, 60, 90];

function assertRanges(ranges, label) {
  ranges.forEach((range) => {
    if (!TIME_PATTERN.test(range.start) || !TIME_PATTERN.test(range.end) || range.start >= range.end) {
      throw new ApiError(422, `${label} has an invalid time range`);
    }
  });
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start < sorted[i - 1].end) throw new ApiError(422, `${label} has overlapping time ranges`);
  }
}

async function loadAvailability(therapist) {
  let availability = await Availability.findOne({ therapist: therapist._id });
  if (!availability) {
    availability = await Availability.create({ therapist: therapist._id, timezone: therapist.timezone, weekly: defaultWeeklyHours });
  }
  return availability;
}

async function loadPublishedTherapist(slug) {
  const therapist = await Therapist.findOne({ slug: slug.toLowerCase(), isPublished: true });
  if (!therapist) throw new ApiError(404, 'We could not find a therapist at this link');
  return therapist;
}

function findService(therapist, serviceId) {
  const service = serviceId ? therapist.services.id(serviceId) : therapist.services[0];
  if (!service) throw new ApiError(404, 'That service is no longer offered');
  return service;
}

exports.getAvailability = asyncHandler(async (req, res) => {
  res.json({ availability: await loadAvailability(req.therapist) });
});

exports.updateAvailability = asyncHandler(async (req, res) => {
  const availability = await loadAvailability(req.therapist);
  const { weekly, overrides, blocked, durations, bufferMinutes, minNoticeHours, maxAdvanceDays } = req.body;

  if (weekly) {
    weekly.forEach((entry) => assertRanges(entry.ranges || [], 'Weekly hours'));
    availability.weekly = weekly;
  }
  if (overrides) {
    overrides.forEach((entry) => {
      if (!DATE_PATTERN.test(entry.date)) throw new ApiError(422, 'Override dates must look like 2025-01-31');
      assertRanges(entry.ranges || [], 'Date override');
    });
    availability.overrides = overrides;
  }
  if (blocked) {
    blocked.forEach((block) => {
      if (new Date(block.end) <= new Date(block.start)) throw new ApiError(422, 'A blocked period must end after it starts');
    });
    availability.blocked = blocked;
  }
  if (durations) {
    if (!durations.length || durations.some((value) => !SESSION_DURATIONS.includes(value))) {
      throw new ApiError(422, 'Session durations must be 30, 45, 60 or 90 minutes');
    }
    availability.durations = [...new Set(durations)].sort((a, b) => a - b);
  }
  if (bufferMinutes !== undefined) availability.bufferMinutes = bufferMinutes;
  if (minNoticeHours !== undefined) availability.minNoticeHours = minNoticeHours;
  if (maxAdvanceDays !== undefined) availability.maxAdvanceDays = maxAdvanceDays;

  await availability.save();
  res.json({ availability });
});

exports.listSessions = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const filter = { therapist: req.therapist._id, startsAt: { $gte: from, $lte: to }, status: { $nin: ['expired'] } };
  if (req.query.status) filter.status = req.query.status;
  const sessions = await Session.find(filter).sort({ startsAt: 1 }).populate('client', 'name email phone');
  res.json({ sessions });
});

exports.updateSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, therapist: req.therapist._id });
  if (!session) throw new ApiError(404, 'Session not found');
  const { status, reason } = req.body;

  if (status === 'cancelled') {
    await cancelSession(session, 'therapist', reason);
  } else {
    if (session.status !== 'confirmed') throw new ApiError(400, 'Only confirmed sessions can be marked as attended or missed');
    if (session.startsAt > new Date()) throw new ApiError(400, 'This session has not started yet');
    session.status = status;
    await session.save();
  }
  res.json({ session });
});

exports.getSlots = asyncHandler(async (req, res) => {
  const therapist = await loadPublishedTherapist(req.params.slug);
  const availability = await loadAvailability(therapist);
  const service = findService(therapist, req.query.serviceId);

  const today = formatInTimeZone(new Date(), availability.timezone, 'yyyy-MM-dd');
  const from = DATE_PATTERN.test(req.query.from || '') ? req.query.from : today;
  const defaultTo = formatInTimeZone(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), availability.timezone, 'yyyy-MM-dd');
  const to = DATE_PATTERN.test(req.query.to || '') ? req.query.to : defaultTo;

  if (!availability.durations.includes(service.durationMinutes)) {
    return res.json({ timezone: availability.timezone, duration: service.durationMinutes, slots: [] });
  }

  const busy = await getBusyIntervals(therapist._id, from, to, availability.bufferMinutes);
  const slots = generateSlots({ availability, fromDate: from, toDate: to, duration: service.durationMinutes, busy });
  res.json({
    timezone: availability.timezone,
    duration: service.durationMinutes,
    slots: slots.map((slot) => slot.toISOString()),
  });
});

async function resolveClient(therapist, req) {
  if (req.client && String(req.client.therapist) === String(therapist._id)) {
    return { client: req.client, created: false };
  }

  const email = req.body.email.toLowerCase();
  const existing = await Client.findOne({ therapist: therapist._id, email });

  if (existing) {
    if (existing.status !== 'active') {
      const access = await canAccess(therapist._id, 'clients.create');
      if (!access.allowed) throw new ApiError(403, 'This therapist is not taking returning clients right now', { code: 'NOT_ACCEPTING' });
      existing.status = 'active';
      await existing.save();
    }
    return { client: existing, created: false };
  }

  const access = await canAccess(therapist._id, 'clients.create');
  if (!access.allowed) throw new ApiError(403, 'This therapist is not accepting new clients right now. You can join the waitlist instead.', { code: 'NOT_ACCEPTING' });

  const accessCode = generateAccessCode();
  const client = await Client.create({
    therapist: therapist._id,
    name: req.body.name,
    email,
    phone: req.body.phone || '',
    timezone: req.body.timezone || 'Asia/Kolkata',
    accessCode,
    source: 'profile',
  });
  return { client, created: true, accessCode };
}

async function consumePackageCredit(client, clientPackageId) {
  const now = new Date();
  const updated = await ClientPackage.findOneAndUpdate(
    {
      _id: clientPackageId,
      client: client._id,
      status: 'active',
      expiresAt: { $gt: now },
      $expr: { $lt: ['$sessionsUsed', '$sessionsTotal'] },
    },
    { $inc: { sessionsUsed: 1 } },
    { new: true }
  );
  if (!updated) throw new ApiError(400, 'That package has no sessions left or has expired');
  if (updated.sessionsUsed >= updated.sessionsTotal) {
    updated.status = 'exhausted';
    await updated.save();
  }
  return updated;
}

exports.book = asyncHandler(async (req, res) => {
  const therapist = await loadPublishedTherapist(req.params.slug);
  const availability = await loadAvailability(therapist);
  const service = findService(therapist, req.body.serviceId);
  const duration = service.durationMinutes;

  const start = new Date(req.body.startsAt);
  if (Number.isNaN(start.getTime())) throw new ApiError(422, 'Choose a valid time slot');
  const end = addMinutes(start, duration);

  if (!availability.durations.includes(duration)) throw new ApiError(409, 'That session length is not currently offered');

  const dateStr = formatInTimeZone(start, availability.timezone, 'yyyy-MM-dd');
  const busy = await getBusyIntervals(therapist._id, dateStr, dateStr, availability.bufferMinutes);
  const slots = generateSlots({ availability, fromDate: dateStr, toDate: dateStr, duration, busy });
  if (!slots.some((slot) => slot.getTime() === start.getTime())) {
    throw new ApiError(409, 'Someone just booked that slot. Please pick another time.', { code: 'SLOT_TAKEN' });
  }

  const { client, created, accessCode } = await resolveClient(therapist, req);

  let session;
  try {
    session = await Session.create({
      therapist: therapist._id,
      client: client._id,
      startsAt: start,
      endsAt: end,
      durationMinutes: duration,
      serviceTitle: service.title,
      status: 'pending',
      holdsSlot: true,
      holdExpiresAt: new Date(Date.now() + slotHoldMinutes * 60 * 1000),
      fee: service.price,
      clientTimezone: req.body.timezone || client.timezone,
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'Someone just booked that slot. Please pick another time.', { code: 'SLOT_TAKEN' });
    throw error;
  }

  const portalToken = created ? signToken({ id: client._id, role: 'client' }, '30d') : undefined;
  if (created) notificationService.publish('portal.access', { client, therapist, accessCode });

  try {
    if (req.body.clientPackageId && req.client) {
      const purchase = await consumePackageCredit(client, req.body.clientPackageId);
      session.clientPackage = purchase._id;
      session.fee = purchase.ratePerSession;
      await session.save();
      const confirmed = await confirmSession(session._id);
      return res.status(201).json({ session: confirmed, checkout: null, portalToken, accessCode });
    }

    if (service.price > 0) {
      const { payment, checkout } = await createPaymentOrder({
        therapistId: therapist._id,
        clientId: client._id,
        amount: service.price,
        description: `${service.title} with ${therapist.name}`,
        sessionId: session._id,
      });
      session.payment = payment._id;
      await session.save();
      return res.status(201).json({ session, checkout, portalToken, accessCode });
    }

    const confirmed = await confirmSession(session._id);
    return res.status(201).json({ session: confirmed, checkout: null, portalToken, accessCode });
  } catch (error) {
    if (session.status === 'pending') {
      session.release('expired');
      await session.save();
    }
    throw error;
  }
});

exports.joinWaitlist = asyncHandler(async (req, res) => {
  const therapist = await loadPublishedTherapist(req.params.slug);
  await registerLead({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    concern: req.body.concern,
    source: 'waitlist',
    assignedTherapist: therapist._id,
  });
  res.status(201).json({ joined: true });
});
