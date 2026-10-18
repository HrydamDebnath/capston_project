const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protectTherapist } = require('../middleware/authMiddleware');
const { register, login, me } = require('../controllers/authController');

const router = express.Router();

const email = body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address');

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name'),
    email,
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('slug').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 40 }).withMessage('Your link must be 3 to 40 characters'),
  ],
  validate,
  register
);

router.post('/login', [email, body('password').notEmpty().withMessage('Enter your password')], validate, login);

router.get('/me', protectTherapist, me);

module.exports = router;
