const mongoose = require('mongoose');

const intakeSchema = new mongoose.Schema(
  {
    demographics: {
      age: { type: Number, min: 0, max: 120 },
      gender: { type: String, trim: true },
      occupation: { type: String, trim: true },
      city: { type: String, trim: true },
      emergencyContactName: { type: String, trim: true },
      emergencyContactPhone: { type: String, trim: true },
    },
    presentingConcern: { type: String, trim: true, maxlength: 3000 },
    goals: { type: String, trim: true, maxlength: 2000 },
    history: {
      previousTherapy: { type: Boolean, default: false },
      medications: { type: String, trim: true, maxlength: 1000 },
      medicalConditions: { type: String, trim: true, maxlength: 1000 },
      familyHistory: { type: String, trim: true, maxlength: 1000 },
    },
    completedAt: { type: Date },
  },
  { _id: false }
);

const consentSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['treatment', 'privacy', 'telehealth'] },
  version: { type: String, required: true },
  accepted: { type: Boolean, required: true },
  acceptedAt: { type: Date, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
});

const clientSchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    source: { type: String, enum: ['profile', 'lead', 'manual'], default: 'profile' },
    accessCode: { type: String, select: false },
    intake: { type: intakeSchema, default: undefined },
    consents: [consentSchema],
    internalSummary: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

clientSchema.index({ therapist: 1, email: 1 }, { unique: true });

clientSchema.methods.hasConsent = function hasConsent(type) {
  return this.consents.some((entry) => entry.type === type && entry.accepted);
};

clientSchema.methods.onboardingState = function onboardingState() {
  const intakeDone = Boolean(this.intake && this.intake.completedAt);
  const consentDone = ['treatment', 'privacy', 'telehealth'].every((type) => this.hasConsent(type));
  return { intakeDone, consentDone, complete: intakeDone && consentDone };
};

clientSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.accessCode;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Client', clientSchema);
