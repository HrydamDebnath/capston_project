const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protectTherapist, protectClient, authenticateAny } = require('../middleware/authMiddleware');
const { requireEntitlement } = require('../middleware/entitlementMiddleware');
const controller = require('../controllers/paymentController');

const router = express.Router();

router.get('/config', controller.getCheckoutConfig);

router.post(
  '/verify',
  [
    body('orderId').notEmpty(),
    body('paymentId').notEmpty(),
    body('signature').notEmpty(),
  ],
  validate,
  controller.verifyPayment
);

router.post('/webhook', controller.webhook);

router.post('/package-order', protectClient, [body('packageId').isMongoId()], validate, controller.createPackageOrder);

router.get('/', protectTherapist, controller.listPayments);

const packageRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Give the package a name'),
  body('sessionCount').isIn([3, 6, 12]).withMessage('Packages include 3, 6 or 12 sessions'),
  body('ratePerSession').isInt({ min: 0 }).withMessage('Enter a rate per session'),
  body('validityDays').isInt({ min: 7, max: 730 }).withMessage('Validity must be between 7 and 730 days'),
];

router.get('/packages', protectTherapist, controller.listPackages);
router.post('/packages', protectTherapist, packageRules, validate, requireEntitlement('packages.create'), controller.createPackage);
router.put(
  '/packages/:id',
  protectTherapist,
  [body('ratePerSession').optional().isInt({ min: 0 }), body('validityDays').optional().isInt({ min: 7, max: 730 })],
  validate,
  controller.updatePackage
);
router.delete('/packages/:id', protectTherapist, controller.archivePackage);

router.get('/:id/invoice', authenticateAny, controller.downloadInvoice);

module.exports = router;
