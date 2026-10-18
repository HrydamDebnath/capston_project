const { canAccess } = require('../services/entitlementService');

function sendUpgradeRequired(res, result) {
  return res.status(403).json({
    code: 'UPGRADE_REQUIRED',
    message: result.message,
    feature: result.featureKey,
    limit: result.limit,
    used: result.used,
    currentTier: result.currentTier,
    requiredTier: result.requiredTier,
  });
}

function requireEntitlement(featureKey, contextBuilder) {
  return async (req, res, next) => {
    try {
      const key = typeof featureKey === 'function' ? featureKey(req) : featureKey;
      if (!key) return next();
      const context = contextBuilder ? contextBuilder(req) : {};
      const result = await canAccess(req.therapist._id, key, context);
      if (!result.allowed) return sendUpgradeRequired(res, result);
      req.entitlement = result;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { requireEntitlement, sendUpgradeRequired };
