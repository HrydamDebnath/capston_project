import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../utils/format.js';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold">{label}</p>
      <p className="mt-1 text-muted">Collected {formatMoney(row.gross)}</p>
      <p className="text-muted">After platform fee {formatMoney(row.net)}</p>
    </div>
  );
}

export default function RevenueChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d4fd9" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#3d4fd9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e3e7ef" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#5b6477', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: '#5b6477', fontSize: 12 }} tickFormatter={(value) => formatMoney(value, { compact: true })} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#c5ccdc' }} />
          <Area type="monotone" dataKey="gross" stroke="#3d4fd9" strokeWidth={2.5} fill="url(#revenueFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
