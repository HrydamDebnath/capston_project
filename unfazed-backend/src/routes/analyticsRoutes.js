const express = require('express');
const { protectTherapist } = require('../middleware/authMiddleware');
const { requireEntitlement } = require('../middleware/entitlementMiddleware');
const controller = require('../controllers/analyticsController');

const router = express.Router();

router.use(protectTherapist);

router.get('/overview', controller.overview);
router.get('/advanced', requireEntitlement('analytics.advanced'), controller.advanced);

module.exports = router;
