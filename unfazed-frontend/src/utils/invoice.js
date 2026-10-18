import api from '../api/axiosInstance.js';

export async function openInvoice(paymentId, actor = 'therapist') {
  const response = await api.get(`/payments/${paymentId}/invoice`, { responseType: 'blob', actor });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
