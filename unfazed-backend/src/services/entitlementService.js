const Client = require('../models/Client');
const Package = require('../models/Package');
const Therapist = require('../models/Therapist');
const SubscriptionTierConfig = require('../models/SubscriptionTierConfig');
const defaultTiers = require('../config/defaultTiers');
const { defaultTierKey } = require('../config/billing');
const ApiError = require('../utils/ApiError');

const NOTE_FORMATS = ['freeform', 'soap', 'dap'];
const CACHE_TTL_MS = 30 * 1000;
const cache = { tiers: null, loadedAt: 0 };

function limitRule(limitKey, countUsage) {
  return async ({ tier, therapistId }) => {
    const limit = tier.limits ? tier.limits[limitKey] : null;
    if (limit === null || limit === undefined) return { allowed: true, limit: null };
    const used = await countUsage(therapistId);
    return { allowed: used < limit, limit, used };
  };
}

const rules = {
  'clients.create': limitRule('activeClients', (id) => Client.countDocuments({ therapist: id, status: 'active' })),
  'packages.create': limitRule('packages', (id) => Package.countDocuments({ therapist: id, isActive: true })),
  'analytics.advanced': async ({ tier }) => ({ allowed: tier.features.analyticsDepth === 'advanced' }),
};

NOTE_FORMATS.forEach((format) => {
  rules[`notes.template.${format}`] = async ({ tier }) => ({ allowed: tier.features.noteTemplates.includes(format) });
});

const actionLabels = {
  'clients.create': 'add more active clients',
  'packages.create': 'create more session packages',
  'analytics.advanced': 'see advanced analytics',
  'notes.template.freeform': 'write freeform notes',
  'notes.template.soap': 'use the SOAP note template',
  'notes.template.dap': 'use the DAP note template',
};

async function ensureDefaultTiers() {
  await Promise.all(
    defaultTiers.map((tier) => SubscriptionTierConfig.updateOne({ key: tier.key }, { $setOnInsert: tier }, { upsert: true }))
  );
  invalidateTierCache();
}

function invalidateTierCache() {
  cache.tiers = null;
  cache.loadedAt = 0;
}

async function listTiers() {
  const fresh = cache.tiers && Date.now() - cache.loadedAt < CACHE_TTL_MS;
  if (fresh) return cache.tiers;
  cache.tiers = await SubscriptionTierConfig.find().sort({ rank: 1 }).lean();
  cache.loadedAt = Date.now();
  return cache.tiers;
}

async function getTierByKey(key) {
  const tiers = await listTiers();
  const match = tiers.find((tier) => tier.key === key) || tiers.find((tier) => tier.key === defaultTierKey) || tiers[0];
  if (!match) throw new ApiError(500, 'Subscription tiers have not been configured');
  return match;
}

async function getTierForTherapist(therapistId) {
  const therapist = await Therapist.findById(therapistId).select('tier').lean();
  if (!therapist) throw new ApiError(404, 'Therapist not found');
  return getTierByKey(therapist.tier);
}

function publicTier(tier) {
  return { key: tier.key, name: tier.name, rank: tier.rank };
}

async function evaluate(featureKey, tier, therapistId, context) {
  const rule = rules[featureKey];
  if (!rule) throw new ApiError(500, `Unknown feature key: ${featureKey}`);
  return rule({ tier, therapistId, context });
}

async function findRequiredTier(featureKey, currentTier, therapistId, context) {
  const tiers = await listTiers();
  const higher = tiers.filter((tier) => tier.rank > currentTier.rank);
  for (const tier of higher) {
    const result = await evaluate(featureKey, tier, therapistId, context);
    if (result.allowed) return tier;
  }
  return null;
}

function buildMessage(featureKey, result, requiredTier) {
  if (result.allowed) return '';
  const action = actionLabels[featureKey] || 'use this feature';
  if (result.limit !== undefined && result.limit !== null && result.used !== undefined) {
    const upgrade = requiredTier ? ` Upgrade to ${requiredTier.name} to ${action}.` : '';
    return `You have reached the limit of ${result.limit} on your current plan.${upgrade}`;
  }
  return requiredTier ? `Upgrade to ${requiredTier.name} to ${action}.` : `Your plan does not include the ability to ${action}.`;
}

async function canAccess(therapistId, featureKey, context = {}) {
  const tier = await getTierForTherapist(therapistId);
  const result = await evaluate(featureKey, tier, therapistId, context);
  let requiredTier = null;
  if (!result.allowed) requiredTier = await findRequiredTier(featureKey, tier, therapistId, context);
  return {
    featureKey,
    allowed: result.allowed,
    limit: result.limit === undefined ? null : result.limit,
    used: result.used === undefined ? null : result.used,
    currentTier: publicTier(tier),
    requiredTier: requiredTier ? publicTier(requiredTier) : null,
    message: buildMessage(featureKey, result, requiredTier),
  };
}

async function getEntitlements(therapistId) {
  const tier = await getTierForTherapist(therapistId);
  const entries = await Promise.all(Object.keys(rules).map(async (key) => [key, await canAccess(therapistId, key)]));
  return {
    tier: {
      key: tier.key,
      name: tier.name,
      rank: tier.rank,
      monthlyPrice: tier.monthlyPrice,
      platformFeePercent: tier.platformFeePercent,
    },
    features: Object.fromEntries(entries),
  };
}

module.exports = {
  canAccess,
  getEntitlements,
  getTierForTherapist,
  getTierByKey,
  listTiers,
  ensureDefaultTiers,
  invalidateTierCache,
};
