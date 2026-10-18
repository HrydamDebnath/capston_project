const { format } = require('date-fns');
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const Client = require('../models/Client');
const Therapist = require('../models/Therapist');
const ClientPackage = require('../models/ClientPackage');
const gateway = require('./paymentGatewayService');
const notificationService = require('./notificationService');
const bookingService = require('./bookingService');
const { getTierForTherapist } = require('./entitlementService');
const { currency, gstRatePercent } = require('../config/billing');
const { percentOf } = require('../utils/money');
const ApiError = require('../utils/ApiError');

async function createPaymentOrder({ therapistId, clientId, amount, description, sessionId, clientPackageId }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new ApiError(400, 'Amount must be a positive number');
  const tier = await getTierForTherapist(therapistId);
  const platformFee = percentOf(amount, tier.platformFeePercent);

  const order = await gateway.createOrder({
    amount,
    currency,
    receipt: `unf_${Date.now()}`,
    notes: { therapistId: String(therapistId), clientId: String(clientId), description },
  });

  const payment = await Payment.create({
    therapist: therapistId,
    client: clientId,
    session: sessionId,
    clientPackage: clientPackageId,
    description,
    amount,
    platformFee,
    netAmount: amount - platformFee,
    gstRatePercent,
    currency,
    gatewayOrderId: order.id,
    isMock: Boolean(order.mock),
  });

  return { payment, checkout: { ...gateway.toCheckoutOrder(order, description), paymentId: payment._id } };
}

function buildInvoiceNumber(payment) {
  return `UNF-${format(payment.paidAt, 'yyyyMM')}-${String(payment._id).slice(-6).toUpperCase()}`;
}

async function activatePackage(clientPackageId) {
  const purchase = await ClientPackage.findById(clientPackageId);
  if (!purchase || purchase.status !== 'pending') return purchase;
  purchase.status = 'active';
  purchase.expiresAt = new Date(Date.now() + purchase.validityDays * 24 * 60 * 60 * 1000);
  await purchase.save();
  return purchase;
}

async function settlePayment(orderId, gatewayPaymentId, method) {
  const payment = await Payment.findOneAndUpdate(
    { gatewayOrderId: orderId, status: 'created' },
    { status: 'paid', gatewayTransactionId: gatewayPaymentId, method, paidAt: new Date() },
    { new: true }
  );
  if (!payment) {
    const existing = await Payment.findOne({ gatewayOrderId: orderId });
    if (!existing) throw new ApiError(404, 'Payment order not found');
    return existing;
  }

  payment.invoiceNumber = buildInvoiceNumber(payment);
  await payment.save();

  try {
    if (payment.session) {
      const session = await bookingService.confirmSession(payment.session);
      if (session && !session.payment) {
        session.payment = payment._id;
        await session.save();
      }
    }
    if (payment.clientPackage) {
      await activatePackage(payment.clientPackage);
    }
  } catch (error) {
    payment.status = 'refunded';
    payment.description = `${payment.description} (refunded: ${error.message})`;
    await payment.save();
    await gateway.refundPayment(gatewayPaymentId, payment.amount);
    throw error;
  }

  const [client, therapist] = await Promise.all([Client.findById(payment.client), Therapist.findById(payment.therapist)]);
  notificationService.publish('payment.captured', { payment, client, therapist });
  return payment;
}

async function failPayment(orderId) {
  await Payment.updateOne({ gatewayOrderId: orderId, status: 'created' }, { status: 'failed' });
  const payment = await Payment.findOne({ gatewayOrderId: orderId });
  if (payment && payment.session) {
    const session = await Session.findById(payment.session);
    if (session && session.status === 'pending') {
      session.release('expired');
      await session.save();
    }
  }
}

module.exports = { createPaymentOrder, settlePayment, failPayment, activatePackage };
