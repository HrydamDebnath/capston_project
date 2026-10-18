module.exports = {
  currency: process.env.CURRENCY || 'INR',
  gstRatePercent: Number(process.env.GST_RATE_PERCENT || 18),
  slotHoldMinutes: Number(process.env.SLOT_HOLD_MINUTES || 10),
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  defaultTierKey: process.env.DEFAULT_TIER_KEY || 'starter',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0],
};
