import { formatMoney } from '../../utils/format.js';

export default function ServiceCard({ service, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(service)}
      className="group flex w-full items-start justify-between gap-4 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand"
    >
      <div>
        <p className="font-bold">{service.title}</p>
        <p className="mt-0.5 text-sm text-muted">{service.durationMinutes} minutes</p>
        {service.description && <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold">{formatMoney(service.price)}</p>
        <p className="mt-2 text-xs font-semibold text-brand group-hover:underline">See times</p>
      </div>
    </button>
  );
}
