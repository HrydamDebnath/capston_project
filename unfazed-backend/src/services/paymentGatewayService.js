const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const { webhookSecret } = require('../config/billing');
const ApiError = require('../utils/ApiError');

const MOCK_SIGNATURE = 'mock_signature';
const mockAllowed = process.env.ALLOW_MOCK_PAYMENTS !== 'false';

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function createOrder({ amount, currency, receipt, notes }) {
  if (!razorpay.isConfigured) {
    if (!mockAllowed) throw new ApiError(503, 'Payments are not configured');
    return { id: `order_mock_${crypto.randomBytes(8).toString('hex')}`, amount, currency, mock: true };
  }
  const order = await razorpay.client.orders.create({ amount, currency, receipt, notes });
  return { ...order, mock: false };
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;
  if (!razorpay.isConfigured) return mockAllowed && signature === MOCK_SIGNATURE;
  return safeEqual(hmac(razorpay.keySecret, `${orderId}|${paymentId}`), signature);
}

function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody) return false;
  if (!razorpay.isConfigured) return mockAllowed && signature === MOCK_SIGNATURE;
  if (!webhookSecret) return false;
  return safeEqual(hmac(webhookSecret, rawBody), signature);
}

async function refundPayment(paymentId, amount) {
  if (!razorpay.isConfigured || !paymentId || paymentId.startsWith('pay_mock_')) return { mock: true };
  return razorpay.client.payments.refund(paymentId, { amount });
}

function toCheckoutOrder(order, description) {
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: razorpay.isConfigured ? razorpay.keyId : null,
    mock: Boolean(order.mock),
    description,
  };
}

module.exports = { createOrder, verifyPaymentSignature, verifyWebhookSignature, refundPayment, toCheckoutOrder, MOCK_SIGNATURE };
