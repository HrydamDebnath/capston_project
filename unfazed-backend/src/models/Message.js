const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    senderRole: { type: String, enum: ['therapist', 'client'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    readAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.index({ therapist: 1, client: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
