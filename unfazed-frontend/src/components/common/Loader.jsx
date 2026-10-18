export function Spinner({ size = 20 }) {
  return (
    <svg className="animate-spin text-brand" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Loader({ label = 'Loading', fullPage = false }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-sm text-muted ${fullPage ? 'min-h-screen' : 'py-16'}`} role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
