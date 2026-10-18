const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protectClient } = require('../middleware/authMiddleware');
const controller = require('../controllers/portalController');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post(
  '/login',
  loginLimiter,
  [
    body('slug').trim().notEmpty(),
    body('email').trim().toLowerCase().isEmail().withMessage('Enter the email you booked with'),
    body('accessCode').trim().notEmpty().withMessage('Enter your access code'),
  ],
  validate,
  controller.login
);

router.use(protectClient);

router.get('/me', controller.me);
router.post('/intake', controller.submitIntake);
router.get('/notes', controller.getSharedNotes);
router.get('/messages', controller.getMessages);
router.post('/sessions/:id/cancel', controller.cancelSession);

module.exports = router;
