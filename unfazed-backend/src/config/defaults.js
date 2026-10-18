module.exports = {
  defaultService: {
    title: 'Individual session',
    description: 'A one-on-one conversation to understand what you are going through and plan next steps.',
    durationMinutes: 60,
    price: Number(process.env.DEFAULT_SESSION_PRICE || 150000),
  },
  defaultWeeklyHours: [1, 2, 3, 4, 5].map((day) => ({ day, ranges: [{ start: '10:00', end: '17:00' }] })),
  cancellationWindowHours: Number(process.env.CANCELLATION_WINDOW_HOURS || 24),
  consentVersion: '2024-01',
  noteTemplates: {
    soap: [
      { key: 'subjective', label: 'Subjective' },
      { key: 'objective', label: 'Objective' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'plan', label: 'Plan' },
    ],
    dap: [
      { key: 'data', label: 'Data' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'plan', label: 'Plan' },
    ],
  },
};
