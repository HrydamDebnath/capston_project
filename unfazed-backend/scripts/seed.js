require('dotenv').config();

const { addDays, startOfWeek, subWeeks, format, addMinutes } = require('date-fns');
const { fromZonedTime } = require('date-fns-tz');
const connectDB = require('../src/config/db');
const Therapist = require('../src/models/Therapist');
const Client = require('../src/models/Client');
const Session = require('../src/models/Session');
const SessionNote = require('../src/models/SessionNote');
const Availability = require('../src/models/Availability');
const Payment = require('../src/models/Payment');
const Package = require('../src/models/Package');
const ClientPackage = require('../src/models/ClientPackage');
const Lead = require('../src/models/Lead');
const Message = require('../src/models/Message');
const SubscriptionTierConfig = require('../src/models/SubscriptionTierConfig');
const { ensureDefaultTiers, getTierByKey } = require('../src/services/entitlementService');
const { percentOf } = require('../src/utils/money');
const { gstRatePercent, currency } = require('../src/config/billing');
const { consentVersion } = require('../src/config/defaults');

const TIMEZONE = 'Asia/Kolkata';
const DEMO_EMAIL = 'demo@unfazed.in';
const DEMO_PASSWORD = 'Password@123';
const DEMO_ACCESS_CODE = 'DEMO2024';
const SLOT_TIMES = [[10, 0], [11, 15], [15, 0], [16, 15], [17, 30]];

function createRandom(seed) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20240611);

const clientSeeds = [
  ['Aarav Menon', 'aarav@example.com', ['anxiety', 'weekly']],
  ['Diya Raghavan', 'diya@example.com', ['work stress']],
  ['Kabir Nair', 'kabir@example.com', ['grief']],
  ['Ishita Verma', 'ishita@example.com', ['relationships']],
  ['Rohan Iyer', 'rohan@example.com', ['anxiety']],
  ['Meghna Pillai', 'meghna@example.com', ['burnout', 'weekly']],
  ['Vikram Subramanian', 'vikram@example.com', ['work stress']],
  ['Ananya Krishnan', 'ananya@example.com', ['self esteem']],
  ['Siddharth Rao', 'siddharth@example.com', ['relationships']],
  ['Pooja Ramesh', 'pooja@example.com', ['grief', 'weekly']],
  ['Nikhil Joseph', 'nikhil@example.com', ['burnout']],
  ['Lakshmi Gopal', 'lakshmi@example.com', ['anxiety']],
];

function sessionStart(index, weeksAgo) {
  const monday = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
  const day = addDays(monday, index % 5);
  const [hour, minute] = SLOT_TIMES[Math.floor(index / 5) % SLOT_TIMES.length];
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return fromZonedTime(`${format(day, 'yyyy-MM-dd')}T${hh}:${mm}:00`, TIMEZONE);
}

async function wipe() {
  await Promise.all([
    Therapist.deleteMany({}), Client.deleteMany({}), Session.deleteMany({}), SessionNote.deleteMany({}),
    Availability.deleteMany({}), Payment.deleteMany({}), Package.deleteMany({}), ClientPackage.deleteMany({}),
    Lead.deleteMany({}), Message.deleteMany({}), SubscriptionTierConfig.deleteMany({}),
  ]);
}

async function seed() {
  await connectDB(process.env.MONGO_URI);
  await wipe();
  await ensureDefaultTiers();
  const tier = await getTierByKey('growth');

  const therapist = await Therapist.create({
    name: 'Dr. Meera Sharma',
    email: DEMO_EMAIL,
    passwordHash: await Therapist.hashPassword(DEMO_PASSWORD),
    slug: 'dr-sharma',
    headline: 'Clinical psychologist helping professionals untangle anxiety, burnout and relationships',
    bio: 'I work with adults who feel stretched thin by work, family expectations and the quiet pressure to have it all figured out. Sessions are collaborative and practical: we make sense of what is happening, then build small routines that hold up in real life.\n\nI have spent over a decade in private practice and hospital settings, and I offer sessions in English, Tamil and Hindi.',
    city: 'Chennai',
    qualifications: ['M.Phil in Clinical Psychology, NIMHANS', 'RCI registered clinical psychologist', 'Certified in CBT and EMDR'],
    yearsOfExperience: 12,
    specializations: ['Anxiety', 'Burnout', 'Relationship counselling', 'Grief'],
    languages: ['English', 'Tamil', 'Hindi'],
    timezone: TIMEZONE,
    gstin: '33ABCDE1234F1Z5',
    businessAddress: '12 Cathedral Road, Chennai 600086',
    tier: 'growth',
    services: [
      { title: 'Individual session', description: 'One-on-one therapy focused on what is weighing on you right now.', durationMinutes: 60, price: 150000 },
      { title: 'Quick check-in', description: 'A shorter follow-up for existing clients.', durationMinutes: 30, price: 80000 },
      { title: 'Couples session', description: 'Structured conversation for partners working through a difficult patch.', durationMinutes: 90, price: 240000 },
    ],
  });

  await Availability.create({
    therapist: therapist._id,
    timezone: TIMEZONE,
    weekly: [
      ...[1, 2, 3, 4, 5].map((day) => ({ day, ranges: [{ start: '10:00', end: '13:00' }, { start: '15:00', end: '19:00' }] })),
      { day: 6, ranges: [{ start: '10:00', end: '14:00' }] },
    ],
    durations: [30, 60, 90],
    bufferMinutes: 15,
    minNoticeHours: 12,
    maxAdvanceDays: 45,
  });

  const packages = await Package.create([
    { therapist: therapist._id, name: 'Starter pack', description: 'Three sessions to find your footing.', sessionCount: 3, ratePerSession: 140000, validityDays: 60 },
    { therapist: therapist._id, name: 'Steady pack', description: 'Six sessions for sustained work.', sessionCount: 6, ratePerSession: 130000, validityDays: 120 },
  ]);

  const clients = [];
  for (let i = 0; i < clientSeeds.length; i += 1) {
    const [name, email, tags] = clientSeeds[i];
    const onboarded = i < 9;
    const now = new Date();
    clients.push(
      await Client.create({
        therapist: therapist._id,
        name,
        email,
        phone: `+9198${String(40000000 + i * 137531).slice(0, 8)}`,
        timezone: TIMEZONE,
        tags,
        status: i === 10 ? 'inactive' : 'active',
        accessCode: i === 0 ? DEMO_ACCESS_CODE : `SEED${String(i).padStart(4, '0')}`,
        intake: onboarded
          ? {
              demographics: { age: 24 + i * 2, gender: i % 2 ? 'Female' : 'Male', occupation: 'Software engineer', city: 'Chennai' },
              presentingConcern: 'Feeling overwhelmed at work and finding it hard to switch off in the evenings.',
              goals: 'Sleep better and stop dreading Monday mornings.',
              history: { previousTherapy: i % 3 === 0, medications: '', medicalConditions: '', familyHistory: '' },
              completedAt: now,
            }
          : undefined,
        consents: onboarded
          ? ['treatment', 'privacy', 'telehealth'].map((type) => ({ type, version: consentVersion, accepted: true, acceptedAt: now, ipAddress: '127.0.0.1', userAgent: 'seed' }))
          : [],
      })
    );
  }

  let paymentCounter = 0;
  const service = therapist.services[0];
  const sessionsByClient = new Map();

  for (let i = 0; i < clients.length; i += 1) {
    const client = clients[i];
    const startWeeks = 4 + Math.floor(random() * 30);
    const cadence = 1 + Math.floor(random() * 2);
    const list = [];

    for (let weeks = startWeeks; weeks >= -2; weeks -= cadence) {
      const startsAt = sessionStart(i, weeks);
      const past = startsAt < new Date();
      if (!past && startsAt > addDays(new Date(), 21)) continue;

      let status = 'confirmed';
      if (past) status = random() < 0.1 ? 'no_show' : 'completed';
      if (i === 11 && past && weeks > 6) continue;

      const endsAt = addMinutes(startsAt, service.durationMinutes);
      paymentCounter += 1;
      const platformFee = percentOf(service.price, tier.platformFeePercent);
      const paidAt = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);

      const payment = await Payment.create({
        therapist: therapist._id,
        client: client._id,
        description: `${service.title} with ${therapist.name}`,
        amount: service.price,
        platformFee,
        netAmount: service.price - platformFee,
        gstRatePercent,
        currency,
        status: 'paid',
        gatewayOrderId: `order_seed_${paymentCounter}`,
        gatewayTransactionId: `pay_seed_${paymentCounter}`,
        method: random() < 0.6 ? 'upi' : 'card',
        invoiceNumber: `UNF-${format(paidAt, 'yyyyMM')}-${String(paymentCounter).padStart(6, '0')}`,
        isMock: true,
        paidAt: paidAt > new Date() ? new Date() : paidAt,
      });

      const created = await Session.create({
        therapist: therapist._id,
        client: client._id,
        startsAt,
        endsAt,
        durationMinutes: service.durationMinutes,
        serviceTitle: service.title,
        status,
        holdsSlot: true,
        fee: service.price,
        payment: payment._id,
        clientTimezone: TIMEZONE,
        meetingLink: 'https://meet.jit.si/unfazed-demo',
        reminderSentAt: past ? startsAt : undefined,
        followUpSentAt: past ? endsAt : undefined,
      });
      list.push(created);
    }
    sessionsByClient.set(String(client._id), list);
  }

  const aarav = clients[0];
  const stewardPack = packages[1];
  const packagePayment = await Payment.create({
    therapist: therapist._id,
    client: aarav._id,
    description: `${stewardPack.name} (${stewardPack.sessionCount} sessions)`,
    amount: stewardPack.sessionCount * stewardPack.ratePerSession,
    platformFee: percentOf(stewardPack.sessionCount * stewardPack.ratePerSession, tier.platformFeePercent),
    netAmount: stewardPack.sessionCount * stewardPack.ratePerSession - percentOf(stewardPack.sessionCount * stewardPack.ratePerSession, tier.platformFeePercent),
    gstRatePercent,
    currency,
    status: 'paid',
    gatewayOrderId: 'order_seed_package',
    gatewayTransactionId: 'pay_seed_package',
    method: 'upi',
    invoiceNumber: `UNF-${format(new Date(), 'yyyyMM')}-PKG001`,
    isMock: true,
    paidAt: new Date(),
  });
  await ClientPackage.create({
    therapist: therapist._id,
    client: aarav._id,
    package: stewardPack._id,
    name: stewardPack.name,
    sessionsTotal: stewardPack.sessionCount,
    sessionsUsed: 2,
    ratePerSession: stewardPack.ratePerSession,
    validityDays: stewardPack.validityDays,
    expiresAt: addDays(new Date(), 90),
    status: 'active',
    payment: packagePayment._id,
  });

  const noteClients = clients.slice(0, 5);
  for (const client of noteClients) {
    const sessions = sessionsByClient.get(String(client._id)).filter((item) => item.status === 'completed');
    const latest = sessions[sessions.length - 1];
    await SessionNote.create({
      therapist: therapist._id,
      client: client._id,
      session: latest ? latest._id : undefined,
      type: 'private',
      format: 'soap',
      title: 'Session review',
      sections: [
        { key: 'subjective', label: 'Subjective', value: 'Reports poor sleep and rumination about deadlines. Mood described as flat on weekdays.' },
        { key: 'objective', label: 'Objective', value: 'Engaged and articulate. Restless in the first ten minutes, settled after grounding exercise.' },
        { key: 'assessment', label: 'Assessment', value: 'Symptoms consistent with generalised anxiety with a strong work-stress trigger. No risk indicators.' },
        { key: 'plan', label: 'Plan', value: 'Continue weekly sessions. Introduce worry postponement and a shutdown routine.' },
      ],
    });
    await SessionNote.create({
      therapist: therapist._id,
      client: client._id,
      session: latest ? latest._id : undefined,
      type: 'shared',
      format: 'freeform',
      title: 'Practice for this week',
      content: '<p>Three things to try before we meet again:</p><ul><li><p>Write down worries at 6pm, then close the notebook.</p></li><li><p>Take a ten minute walk without your phone after lunch.</p></li><li><p>Notice one moment each day when your shoulders drop.</p></li></ul>',
    });
  }

  await Lead.create([
    { name: 'Tanvi Shah', email: 'tanvi@example.com', phone: '+919811100011', concern: 'Panic attacks before presentations.', preferredSpecialization: 'Anxiety', preferredLanguage: 'English', source: 'marketplace', assignedTherapist: therapist._id },
    { name: 'Harish Kumar', email: 'harish@example.com', concern: 'Struggling after losing a parent.', preferredSpecialization: 'Grief', preferredLanguage: 'Tamil', source: 'marketplace', assignedTherapist: therapist._id },
    { name: 'Sneha Patil', email: 'sneha@example.com', concern: 'Relationship communication.', preferredSpecialization: 'Relationship counselling', source: 'waitlist', assignedTherapist: therapist._id },
  ]);

  const thread = [
    ['therapist', 'Hi Aarav, how did the shutdown routine go this week?'],
    ['client', 'Better than expected. I managed four evenings without checking email.'],
    ['therapist', 'That is real progress. Let us talk about what made the fifth one hard when we meet.'],
  ];
  for (let i = 0; i < thread.length; i += 1) {
    await Message.create({
      therapist: therapist._id,
      client: aarav._id,
      senderRole: thread[i][0],
      body: thread[i][1],
      readAt: new Date(),
      createdAt: new Date(Date.now() - (thread.length - i) * 3600 * 1000),
    });
  }

  console.log('Seed complete');
  console.log(`  Therapist login : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log('  Public page     : /dr-sharma');
  console.log(`  Client portal   : /dr-sharma/portal with aarav@example.com / ${DEMO_ACCESS_CODE}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
