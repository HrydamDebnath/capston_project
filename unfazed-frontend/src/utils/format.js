import { formatInTimeZone } from 'date-fns-tz';

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

export function formatMoney(paise, options = {}) {
  const value = (Number(paise) || 0) / 100;
  const hasFraction = value % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasFraction || options.fraction ? 2 : 0,
    maximumFractionDigits: 2,
    notation: options.compact ? 'compact' : 'standard',
  }).format(value);
}

export const rupeesToPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
export const paiseToRupees = (paise) => (Number(paise) || 0) / 100;

export function formatDateTime(value, timezone = browserTimezone(), pattern = "EEE d MMM, h:mm a") {
  if (!value) return '';
  return formatInTimeZone(new Date(value), timezone, pattern);
}

export function formatDate(value, timezone = browserTimezone(), pattern = 'd MMM yyyy') {
  if (!value) return '';
  return formatInTimeZone(new Date(value), timezone, pattern);
}

export function initials(name = '') {
  return name
    .replace(/^(dr|mr|ms|mrs)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${base}${path}`;
}

export function apiOrigin() {
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
}

export function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
