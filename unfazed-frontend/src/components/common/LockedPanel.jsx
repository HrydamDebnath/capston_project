export default function LockedPanel({ title, message, actionLabel = 'See plans', onAction }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-brand/40 bg-brand-soft/40 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        </div>
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
        </div>
      </div>
      <button type="button" onClick={onAction} className="btn btn-primary btn-sm shrink-0">{actionLabel}</button>
    </div>
  );
}
