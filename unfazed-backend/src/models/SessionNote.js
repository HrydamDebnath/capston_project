const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, default: '' },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    type: { type: String, enum: ['private', 'shared'], default: 'private', required: true },
    format: { type: String, enum: ['freeform', 'soap', 'dap'], default: 'freeform' },
    title: { type: String, trim: true, maxlength: 120, default: 'Untitled note' },
    content: { type: String, default: '' },
    sections: [sectionSchema],
  },
  { timestamps: true }
);

noteSchema.index({ client: 1, type: 1, createdAt: -1 });

noteSchema.methods.toClientView = function toClientView() {
  return {
    id: this._id,
    title: this.title,
    format: this.format,
    content: this.content,
    sections: this.sections,
    sharedAt: this.updatedAt,
  };
};

noteSchema.statics.findSharedForClient = async function findSharedForClient(clientId, therapistId) {
  const notes = await this.find({ client: clientId, therapist: therapistId, type: 'shared' }).sort({ updatedAt: -1 });
  return notes.map((note) => note.toClientView());
};

module.exports = mongoose.model('SessionNote', noteSchema);
