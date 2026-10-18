import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import CheckoutForm from '../../components/payments/CheckoutForm.jsx';
import Logo from '../../components/common/Logo.jsx';
import Button from '../../components/common/Button.jsx';
import { formatDateTime, formatMoney } from '../../utils/format.js';

function useCountdown(deadline) {
  const [remaining, setRemaining] = useState(() => (deadline ? new Date(deadline).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!deadline) return undefined;
    const timer = window.setInterval(() => setRemaining(new Date(deadline).getTime() - Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  return Math.max(remaining, 0);
}

export default function Payment() {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(null);
  const remaining = useCountdown(state && state.session && state.session.holdExpiresAt);

  if (!state || !state.checkout) return <Navigate to={`/${slug}`} replace />;

  const { checkout, session, accessCode, timezone, purchase } = state;
  const minutes = Math.floor(remaining / 60000);
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  const expired = Boolean(session) && remaining === 0 && !paid;

  if (paid) {
    return (
      <div className="min-h-screen bg-mist">
        <div className="mx-auto max-w-lg px-5 py-12">
          <Logo />
          <div className="card mt-8 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-calm-soft text-calm">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <h1 className="mt-5 text-2xl font-bold">{session ? 'Your session is booked' : 'Package purchased'}</h1>
            {session && <p className="mt-2 text-muted">{formatDateTime(session.startsAt, timezone, "EEEE, d MMM 'at' h:mm a")}</p>}
            <p className="mt-1 text-sm text-muted">Invoice {paid.invoiceNumber}. A confirmation is on its way to your inbox.</p>
            {accessCode && (
              <div className="mt-6 rounded-2xl bg-brand-soft p-4">
                <p className="text-sm font-semibold">Your portal access code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{accessCode}</p>
                <p className="mt-1 text-xs text-muted">Keep this to sign back in later. We also emailed it to you.</p>
              </div>
            )}
            <Button size="lg" className="mt-7 w-full" onClick={() => navigate(`/${slug}/portal`, { state: { booked: true } })}>Go to your portal</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <div className="mx-auto max-w-lg px-5 py-12">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to={`/${slug}`} className="text-sm font-semibold text-brand hover:underline">Cancel</Link>
        </div>
        <div className="card mt-8 p-7">
          <h1 className="text-2xl font-bold">Complete your payment</h1>
          <dl className="mt-5 space-y-3 border-b border-line pb-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">For</dt><dd className="text-right font-semibold">{checkout.description}</dd></div>
            {session && <div className="flex justify-between gap-4"><dt className="text-muted">When</dt><dd className="text-right font-semibold">{formatDateTime(session.startsAt, timezone, "EEE, d MMM 'at' h:mm a")}</dd></div>}
            <div className="flex justify-between gap-4 text-base"><dt className="font-semibold">Amount</dt><dd className="font-bold">{formatMoney(checkout.amount)}</dd></div>
          </dl>

          {session && !expired && (
            <p className="mt-4 text-sm text-muted">Your slot is held for <span className="font-semibold text-ink">{minutes}:{seconds}</span></p>
          )}

          <div className="mt-5">
            {expired ? (
              <div className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">
                <p className="font-bold">This slot is no longer held</p>
                <p className="mt-1">Pick a time again to start a fresh booking.</p>
                <Link to={`/${slug}/book`} className="btn btn-primary btn-sm mt-3">Choose another time</Link>
              </div>
            ) : (
              <CheckoutForm checkout={checkout} payer={{}} onPaid={setPaid} onError={setError} />
            )}
          </div>
          {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{error}</p>}
          {purchase && <p className="mt-4 text-xs text-muted">Package credits are added as soon as the payment is confirmed.</p>}
        </div>
      </div>
    </div>
  );
}
