const tones = {
  brand: 'badge-brand',
  calm: 'badge-calm',
  warn: 'badge-warn',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
};

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`badge ${tones[tone]} ${className}`}>{children}</span>;
}

const statusTones = {
  confirmed: ['brand', 'Confirmed'],
  completed: ['calm', 'Completed'],
  cancelled: ['neutral', 'Cancelled'],
  no_show: ['danger', 'No-show'],
  pending: ['warn', 'Awaiting payment'],
  active: ['calm', 'Active'],
  inactive: ['neutral', 'Inactive'],
  archived: ['neutral', 'Archived'],
  paid: ['calm', 'Paid'],
  refunded: ['warn', 'Refunded'],
  failed: ['danger', 'Failed'],
  created: ['warn', 'Created'],
};

export function StatusBadge({ status }) {
  const [tone, label] = statusTones[status] || ['neutral', status];
  return <Badge tone={tone}>{label}</Badge>;
}
