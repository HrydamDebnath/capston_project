const Session = require('../models/Session');
const Client = require('../models/Client');
const Therapist = require('../models/Therapist');
const ClientPackage = require('../models/ClientPackage');
const Lead = require('../models/Lead');
const notificationService = require('./notificationService');
const ApiError = require('../utils/ApiError');

async function confirmSession(sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');
  if (session.status === 'confirmed') return session;

  if (!session.holdsSlot) session.holdsSlot = true;
  session.status = 'confirmed';
  session.holdExpiresAt = undefined;
  session.meetingLink = session.meetingLink || `https://meet.jit.si/unfazed-${session._id}`;

  try {
    await session.save();
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'This slot was taken before payment completed');
    throw error;
  }

  const [client, therapist] = await Promise.all([Client.findById(session.client), Therapist.findById(session.therapist)]);
  notificationService.publish('booking.confirmed', { session, client, therapist });
  return session;
}

async function notifyWaitlist(therapistId) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const leads = await Lead.find({
    source: 'waitlist',
    status: 'new',
    assignedTherapist: therapistId,
    $or: [{ notifiedAt: { $exists: false } }, { notifiedAt: { $lt: dayAgo } }],
  }).limit(5);
  if (!leads.length) return;
  const therapist = await Therapist.findById(therapistId);
  for (const lead of leads) {
    lead.notifiedAt = new Date();
    await lead.save();
    notificationService.publish('waitlist.slotFreed', { lead, therapist });
  }
}

async function cancelSession(session, cancelledBy, reason) {
  if (!['pending', 'confirmed'].includes(session.status)) {
    throw new ApiError(400, 'Only upcoming sessions can be cancelled');
  }
  const wasConfirmed = session.status === 'confirmed';

  if (wasConfirmed && session.clientPackage) {
    await ClientPackage.updateOne({ _id: session.clientPackage, sessionsUsed: { $gt: 0 } }, { $inc: { sessionsUsed: -1 }, $set: { status: 'active' } });
  }

  session.release('cancelled');
  session.cancelledBy = cancelledBy;
  session.cancelReason = reason;
  await session.save();

  if (wasConfirmed) {
    const [client, therapist] = await Promise.all([Client.findById(session.client), Therapist.findById(session.therapist)]);
    notificationService.publish('session.cancelled', { session, client, therapist, cancelledBy });
    await notifyWaitlist(session.therapist);
  }
  return session;
}

async function releaseExpiredHolds(now = new Date()) {
  const result = await Session.updateMany(
    { status: 'pending', holdsSlot: true, holdExpiresAt: { $lt: now } },
    { $set: { status: 'expired', holdsSlot: false }, $unset: { holdExpiresAt: '' } }
  );
  return result.modifiedCount;
}

module.exports = { confirmSession, cancelSession, releaseExpiredHolds, notifyWaitlist };
