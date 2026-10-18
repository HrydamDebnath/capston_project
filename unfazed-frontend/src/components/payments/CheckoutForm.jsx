import { useState } from 'react';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import Button from '../common/Button.jsx';
import { loadRazorpay } from '../../utils/razorpay.js';
import { formatMoney } from '../../utils/format.js';

export default function CheckoutForm({ checkout, payer, onPaid, onError }) {
  const [busy, setBusy] = useState(false);

  const verify = async (payload) => {
    const { data } = await api.post('/payments/verify', payload, { skipAuthRedirect: true });
    onPaid(data);
  };

  const payWithGateway = async () => {
    setBusy(true);
    try {
      const Razorpay = await loadRazorpay();
      const instance = new Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        order_id: checkout.orderId,
        name: 'Unfazed',
        description: checkout.description,
        prefill: payer,
        theme: { color: '#3d4fd9' },
        handler: async (response) => {
          try {
            await verify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
          } catch (error) {
            onError(getErrorMessage(error));
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      instance.on('payment.failed', (event) => {
        setBusy(false);
        onError(event.error && event.error.description ? event.error.description : 'The payment did not go through');
      });
      instance.open();
    } catch (error) {
      setBusy(false);
      onError(getErrorMessage(error));
    }
  };

  const payWithTestMode = async () => {
    setBusy(true);
    try {
      await verify({
        orderId: checkout.orderId,
        paymentId: `pay_mock_${Math.random().toString(36).slice(2, 12)}`,
        signature: 'mock_signature',
        method: 'upi',
      });
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {checkout.mock && (
        <div className="rounded-2xl border border-dashed border-warn/50 bg-warn-soft p-4 text-sm text-warn">
          <p className="font-bold">Test mode</p>
          <p className="mt-1">No Razorpay keys are configured on the server, so this payment is simulated. Add test keys to the backend .env to use the real checkout.</p>
        </div>
      )}
      <Button size="lg" className="w-full" loading={busy} onClick={checkout.mock ? payWithTestMode : payWithGateway}>
        {checkout.mock ? `Simulate payment of ${formatMoney(checkout.amount)}` : `Pay ${formatMoney(checkout.amount)}`}
      </Button>
    </div>
  );
}
