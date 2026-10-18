import Avatar from '../common/Avatar.jsx';
import { StatusBadge } from '../common/Badge.jsx';
import { formatDate } from '../../utils/format.js';

export default function ClientCard({ client, onOpen, index = 0 }) {
  return (
    <button type="button" onClick={() => onOpen(client)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-mist/60">
      <Avatar name={client.name} size={42} shape={index} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{client.name}</p>
        <p className="truncate text-xs text-muted">{client.lastSessionAt ? `Last seen ${formatDate(client.lastSessionAt)}` : 'No sessions yet'}</p>
      </div>
      <StatusBadge status={client.status} />
    </button>
  );
}
