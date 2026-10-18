const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    clientPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientPackage' },
    description: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    gstRatePercent: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created', index: true },
    gatewayOrderId: { type: String, required: true, unique: true },
    gatewayTransactionId: { type: String, index: true, sparse: true },
    method: { type: String },
    invoiceNumber: { type: String, index: true, sparse: true },
    isMock: { type: Boolean, default: false },
    paidAt: { type: Date, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
