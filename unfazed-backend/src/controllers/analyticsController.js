const { startOfMonth, subMonths, addMonths, format } = require('date-fns');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const asyncHandler = require('../utils/asyncHandler');
const { canAccess } = require('../services/entitlementService');

const BASIC_MONTHS = 6;
const ADVANCED_MONTHS = 12;
const ATTENDANCE_WINDOW_DAYS = 90;

function monthBoundaries(timezone, months) {
  const zonedNow = toZonedTime(new Date(), timezone);
  const monthStart = startOfMonth(zonedNow);
  return {
    zonedMonthStart: monthStart,
    currentStart: fromZonedTime(monthStart, timezone),
    previousStart: fromZonedTime(subMonths(monthStart, 1), timezone),
    nextStart: fromZonedTime(addMonths(monthStart, 1), timezone),
    trendStart: fromZonedTime(subMonths(monthStart, months - 1), timezone),
  };
}

function fillTrend(rows, zonedMonthStart, months) {
  const byKey = new Map(rows.map((row) => [`${row._id.year}-${row._id.month}`, row]));
  const filled = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = subMonths(zonedMonthStart, offset);
    const row = byKey.get(`${date.getFullYear()}-${date.getMonth() + 1}`);
    filled.push({
      month: format(date, 'yyyy-MM'),
      label: format(date, 'MMM'),
      gross: row ? row.gross : 0,
      net: row ? row.net : 0,
      payments: row ? row.count : 0,
    });
  }
  return filled;
}

function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

exports.overview = asyncHandler(async (req, res) => {
  const therapist = req.therapist;
  const timezone = therapist.timezone;
  const advancedAccess = await canAccess(therapist._id, 'analytics.advanced');
  const months = advancedAccess.allowed ? ADVANCED_MONTHS : BASIC_MONTHS;
  const bounds = monthBoundaries(timezone, months);
  const now = new Date();
  const attendanceFrom = new Date(now.getTime() - ATTENDANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [revenueRows, trendRows, activeClients, attendanceRows, sessionsThisMonth, upcoming, newLeads] = await Promise.all([
    Payment.aggregate([
      { $match: { therapist: therapist._id, status: 'paid', paidAt: { $gte: bounds.previousStart } } },
      { $group: {
        _id: { $cond: [{ $gte: ['$paidAt', bounds.currentStart] }, 'current', 'previous'] },
        gross: { $sum: '$amount' },
        net: { $sum: '$netAmount' },
        count: { $sum: 1 },
      } },
    ]),
    Payment.aggregate([
      { $match: { therapist: therapist._id, status: 'paid', paidAt: { $gte: bounds.trendStart } } },
      { $group: {
        _id: { year: { $year: { date: '$paidAt', timezone } }, month: { $month: { date: '$paidAt', timezone } } },
        gross: { $sum: '$amount' },
        net: { $sum: '$netAmount' },
        count: { $sum: 1 },
      } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Client.countDocuments({ therapist: therapist._id, status: 'active' }),
    Session.aggregate([
      { $match: { therapist: therapist._id, status: { $in: ['completed', 'no_show'] }, startsAt: { $gte: attendanceFrom, $lte: now } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Session.countDocuments({
      therapist: therapist._id,
      status: { $in: ['confirmed', 'completed'] },
      startsAt: { $gte: bounds.currentStart, $lt: bounds.nextStart },
    }),
    Session.find({ therapist: therapist._id, status: 'confirmed', startsAt: { $gt: now } })
      .sort({ startsAt: 1 })
      .limit(5)
      .populate('client', 'name'),
    Lead.countDocuments({ assignedTherapist: therapist._id, status: 'new' }),
  ]);

  const revenue = Object.fromEntries(revenueRows.map((row) => [row._id, row]));
  const current = revenue.current || { gross: 0, net: 0, count: 0 };
  const previous = revenue.previous || { gross: 0, net: 0, count: 0 };
  const attendance = Object.fromEntries(attendanceRows.map((row) => [row._id, row.count]));
  const completed = attendance.completed || 0;
  const noShows = attendance.no_show || 0;
  const heldSessions = completed + noShows;

  res.json({
    depth: advancedAccess.allowed ? 'advanced' : 'basic',
    summary: {
      revenueThisMonth: current.gross,
      netRevenueThisMonth: current.net,
      revenueChangePercent: percentChange(current.gross, previous.gross),
      activeClients,
      sessionsThisMonth,
      noShowRate: heldSessions ? Math.round((noShows / heldSessions) * 1000) / 10 : 0,
      noShows,
      heldSessions,
      newLeads,
    },
    revenueTrend: fillTrend(trendRows, bounds.zonedMonthStart, months),
    upcoming,
  });
});

exports.advanced = asyncHandler(async (req, res) => {
  const therapist = req.therapist;
  const timezone = therapist.timezone;
  const bounds = monthBoundaries(timezone, ADVANCED_MONTHS);
  const sessionMatch = { therapist: therapist._id, startsAt: { $gte: bounds.trendStart, $lt: bounds.nextStart } };

  const [revenueByService, topClients, busiestHours, statusBreakdown, retention] = await Promise.all([
    Session.aggregate([
      { $match: { ...sessionMatch, status: 'completed' } },
      { $group: { _id: '$serviceTitle', sessions: { $sum: 1 }, revenue: { $sum: '$fee' } } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    Payment.aggregate([
      { $match: { therapist: therapist._id, status: 'paid', paidAt: { $gte: bounds.trendStart } } },
      { $group: { _id: '$client', total: { $sum: '$amount' }, payments: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
      { $project: { total: 1, payments: 1, name: { $arrayElemAt: ['$client.name', 0] } } },
    ]),
    Session.aggregate([
      { $match: { ...sessionMatch, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: { $hour: { date: '$startsAt', timezone } }, sessions: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Session.aggregate([
      { $match: { ...sessionMatch, status: { $in: ['completed', 'no_show', 'cancelled', 'confirmed'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Session.aggregate([
      { $match: { therapist: therapist._id, status: 'completed' } },
      { $group: { _id: '$client', sessions: { $sum: 1 } } },
      { $group: { _id: null, clients: { $sum: 1 }, returning: { $sum: { $cond: [{ $gte: ['$sessions', 2] }, 1, 0] } } } },
    ]),
  ]);

  const retained = retention[0] || { clients: 0, returning: 0 };
  res.json({
    revenueByService: revenueByService.map((row) => ({ service: row._id, sessions: row.sessions, revenue: row.revenue })),
    topClients: topClients.map((row) => ({ name: row.name || 'Former client', total: row.total, payments: row.payments })),
    busiestHours: busiestHours.map((row) => ({ hour: row._id, sessions: row.sessions })),
    statusBreakdown: statusBreakdown.map((row) => ({ status: row._id, count: row.count })),
    retentionRate: retained.clients ? Math.round((retained.returning / retained.clients) * 100) : 0,
  });
});
