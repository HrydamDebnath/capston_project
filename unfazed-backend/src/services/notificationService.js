const crypto = require('crypto');
const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const { formatInTimeZone } = require('date-fns-tz');
const Session = require('../models/Session');
const Client = require('../models/Client');
const Therapist = require('../models/Therapist');
const { clientUrl } = require('../config/billing');
const { formatMoney } = require('../utils/money');

const OUTBOX_LIMIT = 300;
const outbox = [];

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

function record(entry) {
  const item = { id: crypto.randomUUID(), createdAt: new Date(), ...entry };
  outbox.unshift(item);
  if (outbox.length > OUTBOX_LIMIT) outbox.pop();
  return item;
}

async function sendEmail({ therapistId, event, to, subject, text }) {
  if (!to) return null;
  const item = record({ therapistId: String(therapistId), event, channel: 'email', to, subject, message: text, status: 'queued' });
  if (!transporter) {
    console.log(`[email:${event}] ${to} - ${subject}`);
    return item;
  }
  try {
    await transporter.sendMail({ from: process.env.MAIL_FROM || 'Unfazed <no-reply@unfazed.in>', to, subject, text });
    item.status = 'sent';
  } catch (error) {
    item.status = 'failed';
    console.error(`[email:${event}] delivery failed: ${error.message}`);
  }
  return item;
}

function sendWhatsApp({ therapistId, event, to, text }) {
  if (!to) return null;
  console.log(`[whatsapp:${event}] queued for ${to}`);
  return record({ therapistId: String(therapistId), event, channel: 'whatsapp', to, subject: '', message: text, status: 'queued' });
}

function when(date, timezone) {
  return formatInTimeZone(date, timezone || 'Asia/Kolkata', "EEE, d MMM yyyy 'at' h:mm a zzz");
}

function portalUrl(therapist) {
  return `${clientUrl}/${therapist.slug}/portal`;
}

const handlers = {
  'booking.confirmed': async ({ session, client, therapist }) => {
    const slot = when(session.startsAt, session.clientTimezone);
    const text = `Hi ${client.name}, your session with ${therapist.name} is confirmed for ${slot}.\nJoin link: ${session.meetingLink}\nManage your booking: ${portalUrl(therapist)}`;
    await sendEmail({ therapistId: therapist._id, event: 'booking.confirmed', to: client.email, subject: 'Your session is confirmed', text });
    sendWhatsApp({ therapistId: therapist._id, event: 'booking.confirmed', to: client.phone, text });
    await sendEmail({
      therapistId: therapist._id,
      event: 'booking.confirmed',
      to: therapist.email,
      subject: `New booking from ${client.name}`,
      text: `${client.name} booked ${session.serviceTitle} on ${when(session.startsAt, therapist.timezone)}.`,
    });
  },

  'portal.access': async ({ client, therapist, accessCode }) => {
    const text = `Hi ${client.name}, use this code to sign in to your portal with ${therapist.name}: ${accessCode}\n${portalUrl(therapist)}`;
    await sendEmail({ therapistId: therapist._id, event: 'portal.access', to: client.email, subject: 'Your portal access code', text });
  },

  'session.cancelled': async ({ session, client, therapist, cancelledBy }) => {
    const text = `The session on ${when(session.startsAt, session.clientTimezone)} with ${therapist.name} was cancelled${cancelledBy === 'therapist' ? ' by your therapist' : ''}.`;
    await sendEmail({ therapistId: therapist._id, event: 'session.cancelled', to: client.email, subject: 'Session cancelled', text });
    await sendEmail({
      therapistId: therapist._id,
      event: 'session.cancelled',
      to: therapist.email,
      subject: `${client.name} cancelled a session`,
      text: `The session on ${when(session.startsAt, therapist.timezone)} is now open again.`,
    });
  },

  'payment.captured': async ({ payment, client, therapist }) => {
    const text = `Hi ${client.name}, we received ${formatMoney(payment.amount, payment.currency)} for ${payment.description}. Invoice ${payment.invoiceNumber} is available in your portal.`;
    await sendEmail({ therapistId: therapist._id, event: 'payment.captured', to: client.email, subject: 'Payment received', text });
    sendWhatsApp({ therapistId: therapist._id, event: 'payment.captured', to: client.phone, text });
  },

  'session.reminder': async ({ session, client, therapist }) => {
    const text = `Reminder: your session with ${therapist.name} starts ${when(session.startsAt, session.clientTimezone)}. Join: ${session.meetingLink}`;
    await sendEmail({ therapistId: therapist._id, event: 'session.reminder', to: client.email, subject: 'Your session is tomorrow', text });
    sendWhatsApp({ therapistId: therapist._id, event: 'session.reminder', to: client.phone, text });
  },

  'session.followup': async ({ client, therapist }) => {
    const text = `Hi ${client.name}, thank you for today's session. Any thoughts you want to share before next time? You can message ${therapist.name} from your portal: ${portalUrl(therapist)}`;
    await sendEmail({ therapistId: therapist._id, event: 'session.followup', to: client.email, subject: 'How are you feeling after your session?', text });
    sendWhatsApp({ therapistId: therapist._id, event: 'session.followup', to: client.phone, text });
  },

  'note.shared': async ({ client, therapist }) => {
    const text = `${therapist.name} shared a new note with you. Read it in your portal: ${portalUrl(therapist)}`;
    await sendEmail({ therapistId: therapist._id, event: 'note.shared', to: client.email, subject: 'A new note is waiting for you', text });
  },

  'waitlist.slotFreed': async ({ lead, therapist }) => {
    const text = `Hi ${lead.name}, a slot just opened up with ${therapist.name}. Book it before someone else does: ${clientUrl}/${therapist.slug}/book`;
    await sendEmail({ therapistId: therapist._id, event: 'waitlist.slotFreed', to: lead.email, subject: 'A slot just opened up', text });
    sendWhatsApp({ therapistId: therapist._id, event: 'waitlist.slotFreed', to: lead.phone, text });
  },

  'lead.assigned': async ({ lead, therapist }) => {
    await sendEmail({
      therapistId: therapist._id,
      event: 'lead.assigned',
      to: therapist.email,
      subject: 'New enquiry assigned to you',
      text: `${lead.name} is looking for support${lead.concern ? `: ${lead.concern}` : ''}. Reach them at ${lead.email}.`,
    });
  },
};

class NotificationService extends EventEmitter {
  constructor() {
    super();
    Object.entries(handlers).forEach(([event, handler]) => {
      this.on(event, (payload) => {
        Promise.resolve(handler(payload)).catch((error) => console.error(`Notification ${event} failed: ${error.message}`));
      });
    });
  }

  publish(event, payload) {
    this.emit(event, payload);
  }

  getOutbox(therapistId, limit = 50) {
    return outbox.filter((item) => item.therapistId === String(therapistId)).slice(0, limit);
  }
}

const notificationService = new NotificationService();

async function runDueNotifications(now = new Date()) {
  const dayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twoDaysBack = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const upcoming = await Session.find({
    status: 'confirmed',
    startsAt: { $gt: now, $lte: dayAhead },
    reminderSentAt: { $exists: false },
  }).limit(100);

  for (const session of upcoming) {
    const claimed = await Session.updateOne({ _id: session._id, reminderSentAt: { $exists: false } }, { reminderSentAt: now });
    if (!claimed.modifiedCount) continue;
    const [client, therapist] = await Promise.all([Client.findById(session.client), Therapist.findById(session.therapist)]);
    if (client && therapist) notificationService.publish('session.reminder', { session, client, therapist });
  }

  const finished = await Session.find({
    status: 'completed',
    endsAt: { $gt: twoDaysBack },
    followUpSentAt: { $exists: false },
  }).limit(100);

  for (const session of finished) {
    const claimed = await Session.updateOne({ _id: session._id, followUpSentAt: { $exists: false } }, { followUpSentAt: now });
    if (!claimed.modifiedCount) continue;
    const [client, therapist] = await Promise.all([Client.findById(session.client), Therapist.findById(session.therapist)]);
    if (client && therapist) notificationService.publish('session.followup', { session, client, therapist });
  }
}

module.exports = notificationService;
module.exports.runDueNotifications = runDueNotifications;
