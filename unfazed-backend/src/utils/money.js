function formatMoney(paise, currency = 'INR') {
  const value = (Number(paise) || 0) / 100;
  const formatted = value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${formatted}`;
}

function percentOf(amount, percent) {
  return Math.round((amount * percent) / 100);
}

module.exports = { formatMoney, percentOf };
