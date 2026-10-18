const Payment = require('../models/Payment');
const Package = require('../models/Package');
const ClientPackage = require('../models/ClientPackage');
const Client = require('../models/Client');
const Therapist = require('../models/Therapist');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const gateway = require('../services/paymentGatewayService');
const razorpay = require('../config/razorpay');
const { createPaymentOrder, settlePayment, failPayment, activatePackage } = require('../services/billingService');
const { streamInvoice } = require('../services/invoiceService');

exports.getCheckoutConfig = (req, res) => {
  res.json({ keyId: razorpay.isConfigured ? razorpay.keyId : null, mock: !razorpay.isConfigured });
};

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  if (!gateway.verifyPaymentSignature({ orderId, paymentId, signature })) {
    throw new ApiError(400, 'We could not verify this payment');
  }
  const payment = await settlePayment(orderId, paymentId, req.body.method);
  res.json({ status: payment.status, paymentId: payment._id, invoiceNumber: payment.invoiceNumber, sessionId: payment.session });
});

exports.webhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  if (!gateway.verifyWebhookSignature(req.rawBody, signature)) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const { event, payload } = req.body;
  const entity = payload && payload.payment ? payload.payment.entity : null;

  try {
    if (entity && (event === 'payment.captured' || event === 'order.paid')) {
      await settlePayment(entity.order_id, entity.id, entity.method);
    } else if (entity && event === 'payment.failed') {
      await failPayment(entity.order_id);
    }
  } catch (error) {
    console.error(`Webhook ${event} could not be applied: ${error.message}`);
  }
  res.json({ received: true });
});

exports.listPayments = asyncHandler(async (req, res) => {
  const filter = { therapist: req.therapist._id };
  if (req.query.status) filter.status = req.query.status;
  const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(200).populate('client', 'name email');
  res.json({ payments });
});

exports.downloadInvoice = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment || payment.status !== 'paid') throw new ApiError(404, 'Invoice not found');

  const allowed = req.therapist
    ? String(payment.therapist) === String(req.therapist._id)
    : String(payment.client) === String(req.client._id);
  if (!allowed) throw new ApiError(404, 'Invoice not found');

  const [therapist, client] = await Promise.all([Therapist.findById(payment.therapist), Client.findById(payment.client)]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${payment.invoiceNumber}.pdf"`);
  streamInvoice({ payment, therapist, client }, res);
});

exports.listPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({ therapist: req.therapist._id, isActive: true }).sort({ sessionCount: 1 });
  res.json({ packages });
});

exports.createPackage = asyncHandler(async (req, res) => {
  const { name, description, sessionCount, ratePerSession, validityDays } = req.body;
  const created = await Package.create({ therapist: req.therapist._id, name, description, sessionCount, ratePerSession, validityDays });
  res.status(201).json({ package: created });
});

exports.updatePackage = asyncHandler(async (req, res) => {
  const found = await Package.findOne({ _id: req.params.id, therapist: req.therapist._id });
  if (!found) throw new ApiError(404, 'Package not found');
  ['name', 'description', 'ratePerSession', 'validityDays'].forEach((field) => {
    if (req.body[field] !== undefined) found[field] = req.body[field];
  });
  await found.save();
  res.json({ package: found });
});

exports.archivePackage = asyncHandler(async (req, res) => {
  const found = await Package.findOneAndUpdate({ _id: req.params.id, therapist: req.therapist._id }, { isActive: false }, { new: true });
  if (!found) throw new ApiError(404, 'Package not found');
  res.json({ package: found });
});

exports.createPackageOrder = asyncHandler(async (req, res) => {
  const found = await Package.findOne({ _id: req.body.packageId, therapist: req.client.therapist, isActive: true });
  if (!found) throw new ApiError(404, 'That package is no longer available');

  const purchase = await ClientPackage.create({
    therapist: found.therapist,
    client: req.client._id,
    package: found._id,
    name: found.name,
    sessionsTotal: found.sessionCount,
    ratePerSession: found.ratePerSession,
    validityDays: found.validityDays,
  });

  const total = found.sessionCount * found.ratePerSession;
  if (total === 0) {
    await activatePackage(purchase._id);
    return res.status(201).json({ purchase, checkout: null });
  }

  const { payment, checkout } = await createPaymentOrder({
    therapistId: found.therapist,
    clientId: req.client._id,
    amount: total,
    description: `${found.name} (${found.sessionCount} sessions)`,
    clientPackageId: purchase._id,
  });
  purchase.payment = payment._id;
  await purchase.save();
  return res.status(201).json({ purchase, checkout });
});
