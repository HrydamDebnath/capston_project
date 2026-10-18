const Therapist = require('../models/Therapist');
const Availability = require('../models/Availability');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { generateSlug } = require('../utils/generateSlug');
const { defaultService, defaultWeeklyHours } = require('../config/defaults');

function session(therapist) {
  return { token: signToken({ id: therapist._id, role: 'therapist' }), therapist };
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await Therapist.exists({ email: email.toLowerCase() })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await Therapist.hashPassword(password);
  const slug = await generateSlug(req.body.slug || name);
  const therapist = await Therapist.create({ name, email, passwordHash, slug, services: [defaultService] });
  await Availability.create({ therapist: therapist._id, timezone: therapist.timezone, weekly: defaultWeeklyHours });

  res.status(201).json(session(therapist));
});

exports.login = asyncHandler(async (req, res) => {
  const therapist = await Therapist.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  const valid = therapist && (await therapist.comparePassword(req.body.password));
  if (!valid) throw new ApiError(401, 'Email or password is incorrect');
  res.json(session(therapist));
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ therapist: req.therapist });
});
