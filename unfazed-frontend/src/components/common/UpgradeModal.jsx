import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMoney } from '../../utils/format.js';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Loader from './Loader.jsx';
import { useToast } from './Toast.jsx';

export default function UpgradeModal() {
  const { entitlements, refreshEntitlements } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [tiers, setTiers] = useState(null);
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    const onUpgrade = (event) => setDetail(event.detail);
    window.addEventListener('unfazed:upgrade', onUpgrade);
    return () => window.removeEventListener('unfazed:upgrade', onUpgrade);
  }, []);

  useEffect(() => {
    if (!detail || tiers) return;
    api.get('/therapists/tiers').then(({ data }) => setTiers(data.tiers)).catch(() => setTiers([]));
  }, [detail, tiers]);

  const close = useCallback(() => setDetail(null), []);

  const switchPlan = async (tier) => {
    setSwitching(tier.key);
    try {
      await api.post('/therapists/me/tier', { tier: tier.key });
      await refreshEntitlements();
      toast.success(`You are now on the ${tier.name} plan`);
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSwitching(null);
    }
  };

  const currentRank = entitlements ? entitlements.tier.rank : 0;

  return (
    <Modal open={Boolean(detail)} onClose={close} title="This needs a higher plan" description={detail ? detail.message : ''} width="max-w-3xl">
      {!tiers ? (
        <Loader label="Loading plans" />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent = tier.rank === currentRank;
            const suggested = detail && detail.requiredTier && detail.requiredTier.rank === tier.rank;
            return (
              <div key={tier.key} className={`flex flex-col rounded-2xl border p-4 ${suggested ? 'border-brand bg-brand-soft/40' : 'border-line'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  {suggested && <span className="badge badge-brand">Unlocks this</span>}
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {tier.monthlyPrice ? formatMoney(tier.monthlyPrice) : 'Free'}
                  {tier.monthlyPrice > 0 && <span className="text-sm font-medium text-muted"> / month</span>}
                </p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted">
                  {tier.highlights.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-calm" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={tier.rank > currentRank ? 'primary' : 'outline'}
                  disabled={isCurrent}
                  loading={switching === tier.key}
                  onClick={() => switchPlan(tier)}
                >
                  {isCurrent ? 'Current plan' : tier.rank > currentRank ? `Upgrade to ${tier.name}` : `Switch to ${tier.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
