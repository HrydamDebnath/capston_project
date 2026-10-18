const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const ApiError = require('../utils/ApiError');
const { protectTherapist } = require('../middleware/authMiddleware');
const { allowedTypes } = require('../services/storageService');
const controller = require('../controllers/therapistController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new ApiError(400, 'Upload a JPG, PNG or WebP image'));
  },
});

router.get('/public/:slug', controller.getPublicProfile);
router.get('/slug-check', controller.checkSlug);
router.get('/tiers', controller.listTiers);

router.post(
  '/leads/enquiry',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Tell us your name'),
    body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
    body('concern').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  controller.submitEnquiry
);

router.use(protectTherapist);

router.get('/me', controller.getMe);

router.put(
  '/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name'),
    body('bio').optional().isLength({ max: 2000 }).withMessage('Bio can be up to 2000 characters'),
    body('specializations').optional().isArray(),
    body('languages').optional().isArray(),
    body('services').optional().isArray(),
    body('services.*.title').optional().trim().notEmpty().withMessage('Every service needs a title'),
    body('services.*.price').optional().isInt({ min: 0 }).withMessage('Service prices must be whole numbers'),
    body('services.*.durationMinutes').optional().isIn([30, 45, 60, 90]).withMessage('Choose 30, 45, 60 or 90 minutes'),
  ],
  validate,
  controller.updateMe
);

router.post('/me/photo', upload.single('photo'), controller.uploadPhoto);
router.get('/me/entitlements', controller.getMyEntitlements);
router.post('/me/tier', [body('tier').trim().notEmpty()], validate, controller.changeTier);
router.get('/me/leads', controller.listLeads);
router.patch('/me/leads/:id', [body('status').isIn(['new', 'contacted', 'converted', 'closed'])], validate, controller.updateLead);
router.get('/me/outbox', controller.getOutbox);

module.exports = router;
