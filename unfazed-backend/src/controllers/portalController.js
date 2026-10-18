const Therapist = require('../models/Therapist');
const Client = require('../models/Client');
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const Package = require('../models/Package');
const ClientPackage = require('../models/ClientPackage');
const SessionNote = require('../models/SessionNote');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { cancelSession } = require('../services/bookingService');
const { cancellationWindowHours, consentVersion } = require('../config/defaults');

const CONSENT_TYPES = ['treatment', 'privacy', 'telehealth'];

exports.login = asyncHandler(async (req, res) => {
  const therapist = await Therapist.findOne({ slug: req.body.slug.toLowerCase() });
  const client = therapist
    ? await Client.findOne({ therapist: therapist._id, email: req.body.email.toLowerCase() }).select('+accessCode')
    : null;
  const valid = client && client.status !== 'archived' && client.accessCode === String(req.body.accessCode).trim().toUpperCase();
  if (!valid) throw new ApiError(401, 'That email and access code do not match');
  res.json({ token: signToken({ id: client._id, role: 'client' }, '30d'), slug: therapist.slug });
});

exports.me = asyncHandler(async (req, res) => {
  const client = req.client;
  const therapist = await Therapist.findById(client.therapist);

  const [sessions, payments, purchases, packages, unread] = await Promise.all([
    Session.find({ client: client._id, status: { $in: ['confirmed', 'completed', 'cancelled', 'no_show'] } }).sort({ startsAt: -1 }).limit(100),
    Payment.find({ client: client._id, status: 'paid' }).sort({ paidAt: -1 }).limit(100),
    ClientPackage.find({ client: client._id, status: { $ne: 'pending' } }).sort({ createdAt: -1 }),
    Package.find({ therapist: therapist._id, isActive: true }).sort({ sessionCount: 1 }),
    Message.countDocuments({ client: client._id, senderRole: 'therapist', readAt: { $exists: false } }),
  ]);

  res.json({
    client: {
      id: client._id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      timezone: client.timezone,
      intake: client.intake,
    },
    onboarding: client.onboardingState(),
    therapist: therapist.toPublic(),
    sessions,
    payments,
    purchases,
    packages,
    unreadMessages: unread,
    cancellationWindowHours,
  });
});

exports.submitIntake = asyncHandler(async (req, res) => {
  const { demographics, presentingConcern, goals, history, consents } = req.body;
  const missing = CONSENT_TYPES.filter((type) => !consents || consents[type] !== true);
  if (missing.length) throw new ApiError(422, 'Please accept all consent statements to continue');

  const client = req.client;
  const now = new Date();
  client.intake = { demographics, presentingConcern, goals, history, completedAt: now };
  CONSENT_TYPES.forEach((type) => {
    client.consents.push({
      type,
      version: consentVersion,
      accepted: true,
      acceptedAt: now,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  await client.save();
  res.json({ onboarding: client.onboardingState() });
});

exports.getSharedNotes = asyncHandler(async (req, res) => {
  const notes = await SessionNote.findSharedForClient(req.client._id, req.client.therapist);
  res.json({ notes });
});

exports.getMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ therapist: req.client.therapist, client: req.client._id }).sort({ createdAt: 1 }).limit(500);
  res.json({ messages });
});

exports.cancelSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, client: req.client._id });
  if (!session) throw new ApiError(404, 'Session not found');
  const hoursLeft = (session.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);
  if (hoursLeft < cancellationWindowHours) {
    throw new ApiError(400, `Sessions can be cancelled up to ${cancellationWindowHours} hours before the start time. Message your therapist instead.`);
  }
  await cancelSession(session, 'client', req.body.reason);
  res.json({ session });
});
