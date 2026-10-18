import { formatMoney } from '../../utils/format.js';

export default function PackageCard({ pkg }) {
  const savingsNote = `${formatMoney(pkg.ratePerSession)} per session`;
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{pkg.name}</p>
          <p className="mt-0.5 text-sm text-muted">{pkg.sessionCount} sessions, valid for {pkg.validityDays} days</p>
        </div>
        <p className="font-bold">{formatMoney(pkg.sessionCount * pkg.ratePerSession)}</p>
      </div>
      {pkg.description && <p className="mt-2 text-sm text-muted">{pkg.description}</p>}
      <p className="mt-3 text-xs font-semibold text-calm">{savingsNote}</p>
    </div>
  );
}
