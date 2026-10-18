const mongoose = require('mongoose');

const clientPackageSchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    name: { type: String, required: true },
    sessionsTotal: { type: Number, required: true },
    sessionsUsed: { type: Number, default: 0 },
    ratePerSession: { type: Number, required: true },
    validityDays: { type: Number, required: true },
    expiresAt: { type: Date },
    status: { type: String, enum: ['pending', 'active', 'exhausted', 'expired'], default: 'pending' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

clientPackageSchema.virtual('sessionsRemaining').get(function sessionsRemaining() {
  return Math.max(this.sessionsTotal - this.sessionsUsed, 0);
});

clientPackageSchema.methods.isUsable = function isUsable(now = new Date()) {
  return this.status === 'active' && this.sessionsUsed < this.sessionsTotal && (!this.expiresAt || this.expiresAt > now);
};

clientPackageSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret.__v; delete ret.id; return ret; } });

module.exports = mongoose.model('ClientPackage', clientPackageSchema);
