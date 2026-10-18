const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protectTherapist } = require('../middleware/authMiddleware');
const { requireEntitlement } = require('../middleware/entitlementMiddleware');
const controller = require('../controllers/clientController');

const router = express.Router();

router.use(protectTherapist);

router.get('/', controller.listClients);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the client name'),
    body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
    body('tags').optional().isArray(),
  ],
  validate,
  requireEntitlement('clients.create'),
  controller.createClient
);

router.get('/:id', controller.getClient);

router.patch(
  '/:id',
  [
    body('status').optional().isIn(['active', 'inactive', 'archived']),
    body('tags').optional().isArray(),
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
  ],
  validate,
  controller.updateClient
);

router.post('/:id/access-code', controller.resetAccessCode);
router.get('/:id/messages', controller.getMessages);

module.exports = router;
