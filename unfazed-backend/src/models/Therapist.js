const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { defaultTierKey } = require('../config/billing');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 400, default: '' },
  durationMinutes: { type: Number, required: true, enum: [30, 45, 60, 90] },
  price: { type: Number, required: true, min: 0 },
});

const therapistSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    headline: { type: String, trim: true, maxlength: 140, default: '' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    photoUrl: { type: String, default: '' },
    city: { type: String, trim: true, default: '' },
    qualifications: [{ type: String, trim: true }],
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    specializations: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    timezone: { type: String, default: 'Asia/Kolkata' },
    services: [serviceSchema],
    gstin: { type: String, trim: true, uppercase: true, default: '' },
    businessAddress: { type: String, trim: true, default: '' },
    tier: { type: String, default: defaultTierKey },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

therapistSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

therapistSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

therapistSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    headline: this.headline,
    bio: this.bio,
    photoUrl: this.photoUrl,
    city: this.city,
    qualifications: this.qualifications,
    yearsOfExperience: this.yearsOfExperience,
    specializations: this.specializations,
    languages: this.languages,
    timezone: this.timezone,
    services: this.services,
  };
};

therapistSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Therapist', therapistSchema);
