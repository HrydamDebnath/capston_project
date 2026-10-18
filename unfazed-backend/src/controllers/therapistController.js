const Therapist = require('../models/Therapist');
const Availability = require('../models/Availability');
const Package = require('../models/Package');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isSlugAvailable, normalizeSlug } = require('../utils/generateSlug');
const { getEntitlements, listTiers, invalidateTierCache } = require('../services/entitlementService');
const { saveImage } = require('../services/storageService');
const { registerLead } = require('../services/leadDistributionService');
const notificationService = require('../services/notificationService');
const { clientUrl } = require('../config/billing');

const PROFILE_FIELDS = [
  'name', 'headline', 'bio', 'city', 'qualifications', 'yearsOfExperience', 'specializations',
  'languages', 'timezone', 'services', 'gstin', 'businessAddress', 'isPublished',
];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function assertTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
  } catch (error) {
    throw new ApiError(422, 'Choose a valid timezone');
  }
}

exports.getPublicProfile = asyncHandler(async (req, res) => {
  const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase(), isPublished: true });
  if (!therapist) throw new ApiError(404, 'We could not find a therapist at this link');
  const [packages, availability] = await Promise.all([
    Package.find({ therapist: therapist._id, isActive: true }).sort({ sessionCount: 1 }),
    Availability.findOne({ therapist: therapist._id }).select('durations timezone'),
  ]);
  res.json({ therapist: therapist.toPublic(), packages, timezone: availability ? availability.timezone : therapist.timezone });
});

exports.checkSlug = asyncHandler(async (req, res) => {
  const slug = normalizeSlug(req.query.slug);
  const excludeId = req.query.exclude || undefined;
  res.json({ slug, available: await isSlugAvailable(slug, excludeId) });
});

exports.shareCard = asyncHandler(async (req, res) => {
  const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase(), isPublished: true });
  if (!therapist) return res.status(404).send('Not found');
  const target = `${clientUrl}/${therapist.slug}`;
  const apiOrigin = `${req.protocol}://${req.get('host')}`;
  const title = `${therapist.name} | Book a session on Unfazed`;
  const description = therapist.headline || therapist.bio.slice(0, 160);
  const image = therapist.photoUrl ? `${apiOrigin}${therapist.photoUrl}` : '';
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(target)}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
</head>
<body><a href="${escapeHtml(target)}">Continue to ${escapeHtml(therapist.name)}</a></body>
</html>`);
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ therapist: req.therapist });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const therapist = req.therapist;
  PROFILE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) therapist[field] = req.body[field];
  });

  if (req.body.timezone) assertTimezone(req.body.timezone);

  if (req.body.slug !== undefined && normalizeSlug(req.body.slug) !== therapist.slug) {
    const slug = normalizeSlug(req.body.slug);
    if (!(await isSlugAvailable(slug, therapist._id))) throw new ApiError(409, 'That link is already taken');
    therapist.slug = slug;
  }

  if (req.body.services) {
    const availability = await Availability.findOne({ therapist: therapist._id });
    const allowed = availability ? availability.durations : [];
    const invalid = req.body.services.find((service) => !allowed.includes(service.durationMinutes));
    if (invalid) throw new ApiError(422, `Enable a ${invalid.durationMinutes} minute duration in your availability first`);
  }

  await therapist.save();
  if (req.body.timezone) await Availability.updateOne({ therapist: therapist._id }, { timezone: req.body.timezone });
  res.json({ therapist });
});

exports.uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload');
  req.therapist.photoUrl = await saveImage(req.file.buffer, req.file.mimetype);
  await req.therapist.save();
  res.json({ therapist: req.therapist });
});

exports.listTiers = asyncHandler(async (req, res) => {
  const tiers = await listTiers();
  res.json({ tiers });
});

exports.getMyEntitlements = asyncHandler(async (req, res) => {
  res.json(await getEntitlements(req.therapist._id));
});

exports.changeTier = asyncHandler(async (req, res) => {
  const tiers = await listTiers();
  const target = tiers.find((tier) => tier.key === req.body.tier);
  if (!target) throw new ApiError(404, 'That plan does not exist');

  const cap = target.limits.activeClients;
  if (cap !== null && cap !== undefined) {
    const active = await Client.countDocuments({ therapist: req.therapist._id, status: 'active' });
    if (active > cap) {
      throw new ApiError(409, `You have ${active} active clients. Archive some before moving to ${target.name}, which allows ${cap}.`);
    }
  }

  req.therapist.tier = target.key;
  await req.therapist.save();
  invalidateTierCache();
  res.json(await getEntitlements(req.therapist._id));
});

exports.listLeads = asyncHandler(async (req, res) => {
  const filter = { assignedTherapist: req.therapist._id };
  if (req.query.status) filter.status = req.query.status;
  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ leads });
});

exports.updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, assignedTherapist: req.therapist._id },
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!lead) throw new ApiError(404, 'Enquiry not found');
  res.json({ lead });
});

exports.submitEnquiry = asyncHandler(async (req, res) => {
  const { name, email, phone, concern, preferredSpecialization, preferredLanguage } = req.body;
  const lead = await registerLead({ name, email, phone, concern, preferredSpecialization, preferredLanguage, source: 'marketplace' });
  res.status(201).json({ received: true, matched: Boolean(lead.assignedTherapist) });
});

exports.getOutbox = asyncHandler(async (req, res) => {
  res.json({ messages: notificationService.getOutbox(req.therapist._id) });
});
