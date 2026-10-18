const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protectTherapist } = require('../middleware/authMiddleware');
const { requireEntitlement } = require('../middleware/entitlementMiddleware');
const controller = require('../controllers/noteController');

const router = express.Router();

router.use(protectTherapist);

router.get('/', controller.listNotes);

router.post(
  '/',
  [
    body('clientId').isMongoId().withMessage('Choose a client for this note'),
    body('type').optional().isIn(['private', 'shared']),
    body('format').optional().isIn(['freeform', 'soap', 'dap']),
    body('title').optional().trim().isLength({ max: 120 }),
  ],
  validate,
  requireEntitlement((req) => `notes.template.${req.body.format || 'freeform'}`),
  controller.createNote
);

router.put(
  '/:id',
  [
    body('type').optional().isIn(['private', 'shared']),
    body('format').optional().isIn(['freeform', 'soap', 'dap']),
    body('title').optional().trim().isLength({ max: 120 }),
  ],
  validate,
  requireEntitlement((req) => (req.body.format ? `notes.template.${req.body.format}` : null)),
  controller.updateNote
);

router.delete('/:id', controller.deleteNote);

module.exports = router;
