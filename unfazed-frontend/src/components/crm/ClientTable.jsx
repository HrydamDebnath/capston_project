import Avatar from '../common/Avatar.jsx';
import Badge, { StatusBadge } from '../common/Badge.jsx';
import { formatDate } from '../../utils/format.js';

function SortHeader({ label, field, sort, order, onSort }) {
  const active = sort === field;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-left">
      <button type="button" onClick={() => onSort(field)} className={`inline-flex items-center gap-1 text-xs font-bold ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}>
        {label}
        <span aria-hidden="true">{active ? (order === 'asc' ? '↑' : '↓') : ''}</span>
      </button>
    </th>
  );
}

function Onboarding({ client }) {
  if (client.intakeDone && client.consentCount >= 3) return <Badge tone="calm">Ready</Badge>;
  return <Badge tone="warn">Intake pending</Badge>;
}

export default function ClientTable({ clients, sort, order, onSort, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="border-b border-line bg-mist/60">
          <tr>
            <SortHeader label="Client" field="name" sort={sort} order={order} onSort={onSort} />
            <SortHeader label="Status" field="status" sort={sort} order={order} onSort={onSort} />
            <SortHeader label="Last session" field="lastSession" sort={sort} order={order} onSort={onSort} />
            <SortHeader label="Next session" field="nextSession" sort={sort} order={order} onSort={onSort} />
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-muted">Tags</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-muted">Onboarding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {clients.map((client, index) => (
            <tr key={client._id} onClick={() => onOpen(client)} className="cursor-pointer hover:bg-mist/60">
              <td className="px-4 py-3">
                <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(client); }} className="flex items-center gap-3 text-left">
                  <Avatar name={client.name} size={38} shape={index} />
                  <span>
                    <span className="block font-semibold">{client.name}</span>
                    <span className="block text-xs text-muted">{client.email}</span>
                  </span>
                </button>
              </td>
              <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
              <td className="px-4 py-3 text-muted">{client.lastSessionAt ? formatDate(client.lastSessionAt) : 'No sessions yet'}</td>
              <td className="px-4 py-3 text-muted">{client.nextSessionAt ? formatDate(client.nextSessionAt) : 'Not booked'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {client.tags.slice(0, 3).map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}
                </div>
              </td>
              <td className="px-4 py-3"><Onboarding client={client} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
