const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protectTherapist, optionalClient } = require('../middleware/authMiddleware');
const controller = require('../controllers/schedulingController');

const router = express.Router();

router.get('/public/:slug/slots', controller.getSlots);

router.post(
  '/public/:slug/book',
  optionalClient,
  [
    body('name').if((value, { req }) => !req.client).trim().isLength({ min: 2, max: 80 }).withMessage('Enter your name'),
    body('email').if((value, { req }) => !req.client).trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
    body('startsAt').isISO8601().withMessage('Choose a time slot'),
    body('serviceId').optional().isMongoId(),
    body('clientPackageId').optional({ values: 'falsy' }).isMongoId(),
  ],
  validate,
  controller.book
);

router.post(
  '/public/:slug/waitlist',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your name'),
    body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
  ],
  validate,
  controller.joinWaitlist
);

router.use(protectTherapist);

router.get('/availability', controller.getAvailability);
router.put(
  '/availability',
  [
    body('weekly').optional().isArray(),
    body('overrides').optional().isArray(),
    body('blocked').optional().isArray(),
    body('durations').optional().isArray(),
    body('bufferMinutes').optional().isInt({ min: 0, max: 120 }),
    body('minNoticeHours').optional().isInt({ min: 0, max: 168 }),
    body('maxAdvanceDays').optional().isInt({ min: 1, max: 180 }),
  ],
  validate,
  controller.updateAvailability
);

router.get('/sessions', controller.listSessions);
router.patch('/sessions/:id', [body('status').isIn(['completed', 'no_show', 'cancelled'])], validate, controller.updateSession);

module.exports = router;
