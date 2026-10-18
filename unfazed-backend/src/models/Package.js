const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    sessionCount: { type: Number, required: true, enum: [3, 6, 12] },
    ratePerSession: { type: Number, required: true, min: 0 },
    validityDays: { type: Number, required: true, min: 7, default: 90 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

packageSchema.virtual('totalPrice').get(function totalPrice() {
  return this.sessionCount * this.ratePerSession;
});

packageSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret.__v; delete ret.id; return ret; } });

module.exports = mongoose.model('Package', packageSchema);
