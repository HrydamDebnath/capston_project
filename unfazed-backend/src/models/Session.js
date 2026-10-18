const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    serviceTitle: { type: String, default: 'Therapy session' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired'],
      default: 'pending',
    },
    holdsSlot: { type: Boolean, default: true },
    holdExpiresAt: { type: Date },
    fee: { type: Number, default: 0, min: 0 },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    clientPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientPackage' },
    clientTimezone: { type: String, default: 'Asia/Kolkata' },
    meetingLink: { type: String, default: '' },
    cancelledBy: { type: String, enum: ['therapist', 'client'] },
    cancelReason: { type: String, trim: true },
    reminderSentAt: { type: Date },
    followUpSentAt: { type: Date },
  },
  { timestamps: true }
);

sessionSchema.index({ therapist: 1, startsAt: 1 }, { unique: true, partialFilterExpression: { holdsSlot: true } });
sessionSchema.index({ client: 1, startsAt: -1 });
sessionSchema.index({ status: 1, startsAt: 1 });

sessionSchema.methods.release = function release(status) {
  this.status = status;
  this.holdsSlot = false;
  this.holdExpiresAt = undefined;
};

module.exports = mongoose.model('Session', sessionSchema);
