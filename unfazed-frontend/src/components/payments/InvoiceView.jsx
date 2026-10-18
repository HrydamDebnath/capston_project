import { useState } from 'react';
import Button from '../common/Button.jsx';
import { StatusBadge } from '../common/Badge.jsx';
import { useToast } from '../common/Toast.jsx';
import { getErrorMessage } from '../../api/axiosInstance.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { openInvoice } from '../../utils/invoice.js';

export default function InvoiceView({ payment, actor = 'therapist', showClient = false }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const download = async () => {
    setBusy(true);
    try {
      await openInvoice(payment._id, actor);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not open the invoice'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="truncate font-semibold">{payment.description}</p>
        <p className="mt-0.5 text-xs text-muted">
          {showClient && payment.client && payment.client.name ? `${payment.client.name} · ` : ''}
          {payment.invoiceNumber || 'Invoice pending'} · {formatDate(payment.paidAt || payment.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={payment.status} />
        <span className="w-24 text-right font-bold">{formatMoney(payment.amount)}</span>
        {payment.status === 'paid' && <Button size="sm" variant="outline" loading={busy} onClick={download}>Invoice</Button>}
      </div>
    </div>
  );
}
