const fallback = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney', 'UTC',
];

export function listTimezones(current) {
  const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : fallback;
  const zones = supported.includes('Asia/Kolkata') ? supported : ['Asia/Kolkata', ...supported];
  return current && !zones.includes(current) ? [current, ...zones] : zones;
}
