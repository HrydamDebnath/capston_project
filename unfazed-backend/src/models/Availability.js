const mongoose = require('mongoose');

const rangeSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, unique: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    weekly: [
      {
        day: { type: Number, min: 0, max: 6, required: true },
        ranges: [rangeSchema],
        _id: false,
      },
    ],
    overrides: [
      {
        date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        ranges: [rangeSchema],
        _id: false,
      },
    ],
    blocked: [
      {
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        reason: { type: String, trim: true },
      },
    ],
    durations: { type: [Number], default: [45, 60] },
    bufferMinutes: { type: Number, default: 15, min: 0, max: 120 },
    minNoticeHours: { type: Number, default: 12, min: 0 },
    maxAdvanceDays: { type: Number, default: 45, min: 1, max: 180 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Availability', availabilitySchema);
