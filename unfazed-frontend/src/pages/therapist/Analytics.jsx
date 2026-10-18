import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/analytics/StatCard.jsx';
import RevenueChart from '../../components/analytics/RevenueChart.jsx';
import LockedPanel from '../../components/common/LockedPanel.jsx';
import Loader from '../../components/common/Loader.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import useEntitlement from '../../hooks/useEntitlement.js';
import { formatMoney } from '../../utils/format.js';

const statusLabels = { completed: 'Attended', confirmed: 'Upcoming', no_show: 'No-show', cancelled: 'Cancelled' };

function hourLabel(hour) {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function AdvancedPanels({ advanced }) {
  const maxRevenue = Math.max(...advanced.revenueByService.map((row) => row.revenue), 1);
  const total = advanced.statusBreakdown.reduce((sum, row) => sum + row.count, 0) || 1;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="panel-title">Revenue by session type</h2>
        <p className="mt-1 text-xs text-muted">Attended sessions in the last 12 months</p>
        <div className="mt-5 space-y-4">
          {advanced.revenueByService.length === 0 && <p className="text-sm text-muted">No attended sessions yet.</p>}
          {advanced.revenueByService.map((row) => (
            <div key={row.service}>
              <div className="flex justify-between text-sm"><span className="font-semibold">{row.service}</span><span className="text-muted">{formatMoney(row.revenue)} · {row.sessions} sessions</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-brand" style={{ width: `${(row.revenue / maxRevenue) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="panel-title">Busiest hours</h2>
        <p className="mt-1 text-xs text-muted">Sessions by start hour, in your timezone</p>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={advanced.busiestHours.map((row) => ({ ...row, label: hourLabel(row.hour) }))} margin={{ left: -20, right: 4, top: 4 }}>
              <CartesianGrid stroke="#e3e7ef" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#5b6477', fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#5b6477', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f3f5f9' }} />
              <Bar dataKey="sessions" fill="#3d4fd9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="panel-title">Top clients by spend</h2>
        <ul className="mt-4 divide-y divide-line">
          {advanced.topClients.map((row, index) => (
            <li key={`${row.name}-${index}`} className="flex items-center justify-between py-3 text-sm">
              <span className="font-semibold">{row.name}</span>
              <span className="text-muted">{formatMoney(row.total)} · {row.payments} payments</span>
            </li>
          ))}
          {advanced.topClients.length === 0 && <li className="py-3 text-sm text-muted">No payments yet.</li>}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="panel-title">Session outcomes</h2>
        <p className="mt-1 text-xs text-muted">Client retention: {advanced.retentionRate}% have come back for a second session</p>
        <div className="mt-5 space-y-3">
          {advanced.statusBreakdown.map((row) => (
            <div key={row.status} className="flex items-center gap-3 text-sm">
              <span className="w-24 font-semibold">{statusLabels[row.status] || row.status}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-calm" style={{ width: `${(row.count / total) * 100}%` }} /></div>
              <span className="w-10 text-right text-muted">{row.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Analytics() {
  const toast = useToast();
  const { can, ready } = useEntitlement();
  const [overview, setOverview] = useState(null);
  const [advanced, setAdvanced] = useState(null);
  const advancedAllowed = can('analytics.advanced');

  useEffect(() => {
    api.get('/analytics/overview').then(({ data }) => setOverview(data)).catch((error) => toast.error(getErrorMessage(error)));
  }, [toast, advancedAllowed]);

  useEffect(() => {
    if (!ready || !advancedAllowed) {
      setAdvanced(null);
      return;
    }
    api.get('/analytics/advanced').then(({ data }) => setAdvanced(data)).catch((error) => toast.error(getErrorMessage(error)));
  }, [ready, advancedAllowed, toast]);

  const requestAdvanced = () => {
    api.get('/analytics/advanced').catch(() => {});
  };

  if (!overview) return <Loader label="Crunching your numbers" />;
  const { summary, revenueTrend, depth } = overview;

  return (
    <div>
      <PageHeader title="Analytics" description={`Revenue over the last ${revenueTrend.length} months, plus how your caseload is holding up.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected this month" value={formatMoney(summary.revenueThisMonth)} note={`${formatMoney(summary.netRevenueThisMonth)} after platform fee`} />
        <StatCard label="Active clients" value={summary.activeClients} />
        <StatCard label="Sessions this month" value={summary.sessionsThisMonth} />
        <StatCard label="No-show rate" value={`${summary.noShowRate}%`} note="Last 90 days" tone={summary.noShowRate > 15 ? 'down' : 'neutral'} />
      </div>

      <section className="card mt-6 p-6">
        <h2 className="panel-title">Revenue trend</h2>
        <div className="mt-4"><RevenueChart data={revenueTrend} /></div>
      </section>

      <div className="mt-6">
        {depth === 'advanced' && advanced ? (
          <AdvancedPanels advanced={advanced} />
        ) : depth === 'advanced' ? (
          <Loader label="Loading detailed insights" />
        ) : (
          <LockedPanel
            title="Advanced analytics"
            message="See revenue by session type, your busiest hours, top clients and how many clients come back, plus a full 12 months of trend."
            actionLabel="Unlock insights"
            onAction={requestAdvanced}
          />
        )}
      </div>
    </div>
  );
}
