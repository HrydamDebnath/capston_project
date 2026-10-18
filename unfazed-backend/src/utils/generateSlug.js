const Therapist = require('../models/Therapist');

const reservedSlugs = ['api', 'login', 'register', 'dashboard', 'share', 'uploads', 'admin', 'static', 'assets', 'portal', 'book', 'help', 'about'];

function normalizeSlug(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function isSlugAvailable(slug, excludeId) {
  if (!slug || reservedSlugs.includes(slug)) return false;
  const filter = { slug };
  if (excludeId) filter._id = { $ne: excludeId };
  return !(await Therapist.exists(filter));
}

async function generateSlug(name, excludeId) {
  const root = normalizeSlug(name) || 'therapist';
  let candidate = reservedSlugs.includes(root) ? `${root}-therapy` : root;
  let attempt = 1;
  while (!(await isSlugAvailable(candidate, excludeId))) {
    attempt += 1;
    candidate = `${root}-${attempt}`;
  }
  return candidate;
}

module.exports = { generateSlug, isSlugAvailable, normalizeSlug, reservedSlugs };
