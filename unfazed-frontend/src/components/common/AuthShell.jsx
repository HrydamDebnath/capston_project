import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-muted">{footer}</div>
        </div>
        <p className="text-xs text-muted">
          <Link to="/" className="hover:text-ink">Back to home</Link>
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-night p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-calm/25 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-md">
          <p className="font-display text-3xl font-bold leading-tight">Spend your energy on clients, not on admin.</p>
          <p className="mt-4 text-white/70">
            One link handles intake, booking, payment and follow-up, so the hour you spend with a client is the only hour that needs you.
          </p>
        </div>
      </div>
    </div>
  );
}
