const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    concern: { type: String, trim: true, maxlength: 1000, default: '' },
    preferredSpecialization: { type: String, trim: true, default: '' },
    preferredLanguage: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['marketplace', 'waitlist'], default: 'marketplace' },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'closed'], default: 'new', index: true },
    assignedTherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', index: true },
    notifiedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
