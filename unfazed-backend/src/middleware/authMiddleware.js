const Therapist = require('../models/Therapist');
const Client = require('../models/Client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function decode(req) {
  const token = readToken(req);
  if (!token) throw new ApiError(401, 'Please sign in to continue');
  try {
    return verifyToken(token);
  } catch (error) {
    throw new ApiError(401, 'Your session has expired. Please sign in again');
  }
}

async function loadTherapist(payload) {
  if (payload.role !== 'therapist') throw new ApiError(403, 'This area is only available to therapists');
  const therapist = await Therapist.findById(payload.id);
  if (!therapist) throw new ApiError(401, 'Account no longer exists');
  return therapist;
}

async function loadClient(payload) {
  if (payload.role !== 'client') throw new ApiError(403, 'This area is only available to clients');
  const client = await Client.findById(payload.id);
  if (!client || client.status === 'archived') throw new ApiError(401, 'Portal access is no longer available');
  return client;
}

const protectTherapist = asyncHandler(async (req, res, next) => {
  req.therapist = await loadTherapist(decode(req));
  next();
});

const protectClient = asyncHandler(async (req, res, next) => {
  req.client = await loadClient(decode(req));
  next();
});

const optionalClient = asyncHandler(async (req, res, next) => {
  if (!readToken(req)) return next();
  try {
    req.client = await loadClient(decode(req));
  } catch (error) {
    req.client = undefined;
  }
  return next();
});

const authenticateAny = asyncHandler(async (req, res, next) => {
  const payload = decode(req);
  if (payload.role === 'therapist') req.therapist = await loadTherapist(payload);
  else req.client = await loadClient(payload);
  req.authRole = payload.role;
  next();
});

module.exports = { protectTherapist, protectClient, optionalClient, authenticateAny };
