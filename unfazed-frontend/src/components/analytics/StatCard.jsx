export default function StatCard({ label, value, note, tone = 'neutral' }) {
  const tones = { neutral: 'text-muted', up: 'text-calm', down: 'text-danger' };
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {note && <p className={`mt-1.5 text-xs font-semibold ${tones[tone]}`}>{note}</p>}
    </div>
  );
}
