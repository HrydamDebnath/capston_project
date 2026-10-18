const Razorpay = require('razorpay');

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isConfigured = Boolean(keyId && keySecret && !keyId.startsWith('your_') && !keySecret.startsWith('your_'));

const client = isConfigured ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;

module.exports = { client, keyId, keySecret, isConfigured };
