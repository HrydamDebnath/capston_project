const SessionNote = require('../models/SessionNote');
const Client = require('../models/Client');
const Session = require('../models/Session');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const { noteTemplates } = require('../config/defaults');

function buildSections(format, provided = []) {
  const template = noteTemplates[format];
  if (!template) return [];
  const values = new Map(provided.map((section) => [section.key, section.value]));
  return template.map((item) => ({ key: item.key, label: item.label, value: values.get(item.key) || '' }));
}

async function ownedClient(therapistId, clientId) {
  const client = await Client.findOne({ _id: clientId, therapist: therapistId });
  if (!client) throw new ApiError(404, 'Client not found');
  return client;
}

exports.listNotes = asyncHandler(async (req, res) => {
  const filter = { therapist: req.therapist._id };
  if (req.query.clientId) {
    await ownedClient(req.therapist._id, req.query.clientId);
    filter.client = req.query.clientId;
  }
  if (req.query.type) filter.type = req.query.type;
  const notes = await SessionNote.find(filter)
    .sort({ updatedAt: -1 })
    .limit(req.query.clientId ? 200 : 50)
    .populate('client', 'name');
  res.json({ notes });
});

exports.createNote = asyncHandler(async (req, res) => {
  const { clientId, sessionId, type, format = 'freeform', title, content } = req.body;
  const client = await ownedClient(req.therapist._id, clientId);

  if (sessionId) {
    const session = await Session.findOne({ _id: sessionId, therapist: req.therapist._id, client: client._id });
    if (!session) throw new ApiError(404, 'Session not found for this client');
  }

  const note = await SessionNote.create({
    therapist: req.therapist._id,
    client: client._id,
    session: sessionId,
    type: type || 'private',
    format,
    title,
    content: format === 'freeform' ? content : '',
    sections: buildSections(format, req.body.sections),
  });

  if (note.type === 'shared') notificationService.publish('note.shared', { note, client, therapist: req.therapist });
  res.status(201).json({ note });
});

exports.updateNote = asyncHandler(async (req, res) => {
  const note = await SessionNote.findOne({ _id: req.params.id, therapist: req.therapist._id });
  if (!note) throw new ApiError(404, 'Note not found');

  const wasShared = note.type === 'shared';
  if (req.body.title !== undefined) note.title = req.body.title;
  if (req.body.type !== undefined) note.type = req.body.type;
  if (req.body.format !== undefined && req.body.format !== note.format) note.format = req.body.format;

  if (note.format === 'freeform') {
    if (req.body.content !== undefined) note.content = req.body.content;
    note.sections = [];
  } else {
    note.content = '';
    note.sections = buildSections(note.format, req.body.sections || note.sections);
  }

  await note.save();

  if (!wasShared && note.type === 'shared') {
    const client = await Client.findById(note.client);
    notificationService.publish('note.shared', { note, client, therapist: req.therapist });
  }
  res.json({ note });
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await SessionNote.findOneAndDelete({ _id: req.params.id, therapist: req.therapist._id });
  if (!note) throw new ApiError(404, 'Note not found');
  res.json({ deleted: true });
});
