const Lead = require('../models/Lead');
const Therapist = require('../models/Therapist');
const { canAccess } = require('./entitlementService');
const notificationService = require('./notificationService');

function exactMatch(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
}

async function pickTherapist(lead) {
  const filter = { isPublished: true };
  if (lead.preferredSpecialization) filter.specializations = exactMatch(lead.preferredSpecialization);
  if (lead.preferredLanguage) filter.languages = exactMatch(lead.preferredLanguage);

  let candidates = await Therapist.find(filter).select('_id');
  if (!candidates.length) candidates = await Therapist.find({ isPublished: true }).select('_id');

  const eligible = [];
  for (const candidate of candidates) {
    const access = await canAccess(candidate._id, 'clients.create');
    if (access.allowed) eligible.push(candidate._id);
  }
  if (!eligible.length) return null;

  const workload = await Lead.aggregate([
    { $match: { assignedTherapist: { $in: eligible }, status: { $in: ['new', 'contacted'] } } },
    { $group: { _id: '$assignedTherapist', open: { $sum: 1 } } },
  ]);
  const openByTherapist = new Map(workload.map((row) => [String(row._id), row.open]));

  return eligible.reduce((best, id) => {
    const load = openByTherapist.get(String(id)) || 0;
    return !best || load < best.load ? { id, load } : best;
  }, null).id;
}

async function registerLead(data) {
  const lead = new Lead(data);
  const therapistId = lead.assignedTherapist || (await pickTherapist(lead));
  if (therapistId) lead.assignedTherapist = therapistId;
  await lead.save();

  if (therapistId && lead.source === 'marketplace') {
    const therapist = await Therapist.findById(therapistId);
    notificationService.publish('lead.assigned', { lead, therapist });
  }
  return lead;
}

module.exports = { registerLead, pickTherapist };
