const Client = require('../models/Client');
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const SessionNote = require('../models/SessionNote');
const ClientPackage = require('../models/ClientPackage');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessCode } = require('../utils/accessCode');
const { canAccess } = require('../services/entitlementService');
const { sendUpgradeRequired } = require('../middleware/entitlementMiddleware');
const notificationService = require('../services/notificationService');

const SORT_FIELDS = { name: 'name', lastSession: 'lastSessionAt', nextSession: 'nextSessionAt', joined: 'createdAt', status: 'status' };

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sessionLookup(as, match, sort) {
  return {
    $lookup: {
      from: 'sessions',
      let: { clientId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$client', '$$clientId'] }, ...match } },
        { $sort: { startsAt: sort } },
        { $limit: 1 },
        { $project: { startsAt: 1 } },
      ],
      as,
    },
  };
}

exports.listClients = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
  const sortField = SORT_FIELDS[req.query.sort] || 'createdAt';
  const direction = req.query.order === 'asc' ? 1 : -1;

  const match = { therapist: req.therapist._id };
  if (req.query.status && req.query.status !== 'all') match.status = req.query.status;
  else if (!req.query.status) match.status = { $ne: 'archived' };
  if (req.query.tag) match.tags = req.query.tag.toLowerCase();
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    match.$or = [{ name: pattern }, { email: pattern }];
  }

  const now = new Date();
  const [result] = await Client.aggregate([
    { $match: match },
    sessionLookup('lastSession', { status: 'completed' }, -1),
    { $lookup: {
      from: 'sessions',
      let: { clientId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$client', '$$clientId'] }, status: 'confirmed', startsAt: { $gt: now } } },
        { $sort: { startsAt: 1 } },
        { $limit: 1 },
        { $project: { startsAt: 1 } },
      ],
      as: 'nextSession',
    } },
    { $addFields: {
      lastSessionAt: { $arrayElemAt: ['$lastSession.startsAt', 0] },
      nextSessionAt: { $arrayElemAt: ['$nextSession.startsAt', 0] },
      intakeDone: { $ne: [{ $ifNull: ['$intake.completedAt', null] }, null] },
      consentCount: { $size: { $ifNull: ['$consents', []] } },
    } },
    { $project: { lastSession: 0, nextSession: 0, accessCode: 0, consents: 0, intake: 0, __v: 0 } },
    { $sort: { [sortField]: direction, _id: 1 } },
    { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);

  const total = result.total[0] ? result.total[0].count : 0;
  res.json({ clients: result.items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

exports.getClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, therapist: req.therapist._id });
  if (!client) throw new ApiError(404, 'Client not found');

  const [sessions, payments, notes, packages, unread] = await Promise.all([
    Session.find({ client: client._id, status: { $ne: 'expired' } }).sort({ startsAt: -1 }),
    Payment.find({ client: client._id, status: { $in: ['paid', 'refunded'] } }).sort({ paidAt: -1 }),
    SessionNote.find({ client: client._id, therapist: req.therapist._id }).sort({ createdAt: -1 }),
    ClientPackage.find({ client: client._id, status: { $ne: 'pending' } }).sort({ createdAt: -1 }),
    Message.countDocuments({ client: client._id, senderRole: 'client', readAt: { $exists: false } }),
  ]);

  res.json({ client, onboarding: client.onboardingState(), sessions, payments, notes, packages, unreadMessages: unread });
});

exports.createClient = asyncHandler(async (req, res) => {
  const accessCode = generateAccessCode();
  const client = await Client.create({
    therapist: req.therapist._id,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    timezone: req.body.timezone,
    tags: req.body.tags,
    internalSummary: req.body.internalSummary,
    source: 'manual',
    accessCode,
  });
  notificationService.publish('portal.access', { client, therapist: req.therapist, accessCode });
  res.status(201).json({ client, accessCode });
});

exports.updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, therapist: req.therapist._id });
  if (!client) throw new ApiError(404, 'Client not found');

  if (req.body.status === 'active' && client.status !== 'active') {
    const access = await canAccess(req.therapist._id, 'clients.create');
    if (!access.allowed) return sendUpgradeRequired(res, access);
  }

  ['name', 'phone', 'timezone', 'tags', 'status', 'internalSummary'].forEach((field) => {
    if (req.body[field] !== undefined) client[field] = req.body[field];
  });
  await client.save();
  return res.json({ client });
});

exports.resetAccessCode = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, therapist: req.therapist._id });
  if (!client) throw new ApiError(404, 'Client not found');
  const accessCode = generateAccessCode();
  client.accessCode = accessCode;
  await client.save();
  notificationService.publish('portal.access', { client, therapist: req.therapist, accessCode });
  res.json({ accessCode });
});

exports.getMessages = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, therapist: req.therapist._id }).select('_id');
  if (!client) throw new ApiError(404, 'Client not found');
  const messages = await Message.find({ therapist: req.therapist._id, client: client._id }).sort({ createdAt: 1 }).limit(500);
  res.json({ messages });
});
