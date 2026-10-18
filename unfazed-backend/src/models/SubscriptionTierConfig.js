const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    rank: { type: Number, required: true, index: true },
    monthlyPrice: { type: Number, required: true, min: 0 },
    platformFeePercent: { type: Number, required: true, min: 0, max: 100 },
    description: { type: String, default: '' },
    limits: {
      activeClients: { type: Number, default: null },
      packages: { type: Number, default: null },
    },
    features: {
      noteTemplates: [{ type: String, enum: ['freeform', 'soap', 'dap'] }],
      analyticsDepth: { type: String, enum: ['basic', 'advanced'], default: 'basic' },
    },
    highlights: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionTierConfig', tierSchema);
