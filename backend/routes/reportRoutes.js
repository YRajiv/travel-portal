const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Cancellation = require('../models/Cancellation');
const Destination = require('../models/Destination');
const Payment = require('../models/Payment');
const TravelPackage = require('../models/TravelPackage');
const User = require('../models/User');
const { demoStore } = require('../utils/demoStore');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const countForStatus = (rows, status) => (
  rows.find((row) => String(row._id).toLowerCase() === status)?.count || 0
);

function buildReportSummary({ bookingsByDestination, bookingStatuses, paymentStatuses, cancellationStatuses, customerHistory }) {
  const totalBookings = bookingStatuses.reduce((sum, row) => sum + row.count, 0);
  const paidPayments = paymentStatuses.find((row) => String(row._id).toLowerCase() === 'paid');

  return {
    bookingsByDestination,
    bookings: {
      total: totalBookings,
      confirmed: countForStatus(bookingStatuses, 'confirmed'),
      cancelled: countForStatus(bookingStatuses, 'cancelled'),
      pending: countForStatus(bookingStatuses, 'pending'),
    },
    revenue: {
      totalRevenue: paidPayments?.amount || 0,
      paid: paidPayments?.count || 0,
      pending: countForStatus(paymentStatuses, 'pending'),
      refunded: countForStatus(paymentStatuses, 'refunded'),
    },
    cancellations: {
      total: cancellationStatuses.reduce((sum, row) => sum + row.count, 0),
      approved: countForStatus(cancellationStatuses, 'approved'),
      rejected: countForStatus(cancellationStatuses, 'rejected'),
      pending: countForStatus(cancellationStatuses, 'pending'),
    },
    customerHistory,
  };
}

function getReferenceId(value) {
  if (!value) return '';
  return String(value._id || value);
}

function buildCustomerReportSummary({ bookings, payments, packages, destinations, now = new Date() }) {
  const packagesById = new Map(packages.map((travelPackage) => [getReferenceId(travelPackage), travelPackage]));
  const destinationsById = new Map(destinations.map((destination) => [getReferenceId(destination), destination]));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const destinationTotals = new Map();
  let upcomingTrips = 0;
  let completedTrips = 0;
  let cancelledBookings = 0;
  let totalTravelers = 0;

  const customerBookings = bookings.map((booking) => {
    const travelPackage = packagesById.get(getReferenceId(booking.package));
    const destinationId = getReferenceId(booking.destination || travelPackage?.destination);
    const destinationName = destinationsById.get(destinationId)?.name
      || travelPackage?.destinationName
      || 'Unassigned';
    const status = String(booking.status || 'Pending').toLowerCase();
    const travelers = Number(booking.travelers);
    const travelDate = booking.travelDate ? new Date(booking.travelDate) : null;
    const timestamp = new Date(booking.createdAt || booking.travelDate || 0).getTime();

    if (status === 'completed') completedTrips += 1;
    if (status === 'cancelled') cancelledBookings += 1;
    if (
      travelDate
      && !Number.isNaN(travelDate.getTime())
      && travelDate >= today
      && !['cancelled', 'completed'].includes(status)
    ) {
      upcomingTrips += 1;
    }
    if (Number.isFinite(travelers) && travelers > 0) totalTravelers += travelers;

    const destinationTotal = destinationTotals.get(destinationName) || { destination: destinationName, totalBookings: 0 };
    destinationTotal.totalBookings += 1;
    destinationTotals.set(destinationName, destinationTotal);

    return {
      bookingId: booking.bookingId || 'Booking reference pending',
      packageName: travelPackage?.name || 'Travel package',
      destinationName,
      travelDate: booking.travelDate || null,
      travelers: Number.isFinite(travelers) && travelers > 0 ? travelers : 0,
      totalPrice: Number.isFinite(Number(booking.totalPrice)) ? Number(booking.totalPrice) : 0,
      status: booking.status || 'Pending',
      paymentStatus: booking.paymentStatus || 'Pending',
      timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    };
  });

  const paymentSummary = payments.reduce((summary, payment) => {
    const status = String(payment.status || 'Pending').toLowerCase();
    const amount = Number(payment.amount);
    const validAmount = Number.isFinite(amount) ? amount : 0;
    summary.total += 1;
    if (status === 'paid') {
      summary.paid += 1;
      summary.paidAmount += validAmount;
    } else if (status === 'refunded') {
      summary.refunded += 1;
    } else if (status === 'pending') {
      summary.pending += 1;
      summary.pendingAmount += validAmount;
    }
    return summary;
  }, { total: 0, paid: 0, pending: 0, refunded: 0, paidAmount: 0, pendingAmount: 0 });

  return {
    generatedAt: new Date(now).toISOString(),
    overview: {
      totalBookings: bookings.length,
      upcomingTrips,
      completedTrips,
      cancelledBookings,
      totalTravelers,
    },
    payments: paymentSummary,
    bookingsByDestination: [...destinationTotals.values()].sort((a, b) => b.totalBookings - a.totalBookings),
    recentBookings: customerBookings
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(({ timestamp, ...booking }) => booking),
  };
}

router.get('/customer-summary', protect, authorize('CUSTOMER'), async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    const bookings = demoStore.bookings.filter((booking) => booking.customer === req.user._id);
    const bookingIds = new Set(bookings.map((booking) => getReferenceId(booking)));
    const packageIds = new Set(bookings.map((booking) => getReferenceId(booking.package)));
    const packages = demoStore.travelPackages.filter((travelPackage) => packageIds.has(getReferenceId(travelPackage)));
    const destinationsById = new Set([
      ...bookings.map((booking) => getReferenceId(booking.destination)),
      ...packages.map((travelPackage) => getReferenceId(travelPackage.destination)),
    ]);
    const destinations = demoStore.destinations.filter((destination) => destinationsById.has(getReferenceId(destination)));
    const payments = demoStore.payments.filter((payment) => bookingIds.has(getReferenceId(payment.booking)));

    return res.json(buildCustomerReportSummary({ bookings, payments, packages, destinations }));
  }

  const bookings = await Booking.find({ customer: req.user._id }).lean();
  const bookingIds = bookings.map((booking) => booking._id);
  const packageIds = [...new Set(bookings.map((booking) => getReferenceId(booking.package)).filter(Boolean))];
  const packages = packageIds.length
    ? await TravelPackage.find({ _id: { $in: packageIds } }).select('name destinationName destination').lean()
    : [];
  const destinationIds = [...new Set([
    ...bookings.map((booking) => getReferenceId(booking.destination)),
    ...packages.map((travelPackage) => getReferenceId(travelPackage.destination)),
  ].filter(Boolean))];
  const [payments, destinations] = await Promise.all([
    bookingIds.length ? Payment.find({ booking: { $in: bookingIds } }).select('booking amount status').lean() : [],
    destinationIds.length ? Destination.find({ _id: { $in: destinationIds } }).select('name').lean() : [],
  ]);

  return res.json(buildCustomerReportSummary({ bookings, payments, packages, destinations }));
});

router.get('/summary', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Reports are unavailable because MongoDB is not connected.' });
  }

  const [
    bookingsByDestination,
    bookingStatuses,
    paymentStatuses,
    cancellationStatuses,
    customers,
  ] = await Promise.all([
    Booking.aggregate([
      {
        $group: {
          _id: '$destination',
          totalBookings: { $sum: 1 },
          travelers: { $sum: { $ifNull: ['$travelers', 0] } },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Paid'] },
                { $ifNull: ['$totalPrice', 0] },
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: Destination.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'destinationInfo',
        },
      },
      { $unwind: { path: '$destinationInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          destination: { $ifNull: ['$destinationInfo.name', 'Unassigned'] },
          totalBookings: 1,
          travelers: 1,
          revenue: 1,
        },
      },
      { $sort: { destination: 1 } },
    ]),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]),
    Cancellation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.find({ role: 'CUSTOMER' }).select('name email').lean(),
  ]);

  const customerIds = customers.map((customer) => customer._id);
  const customerBookings = customerIds.length
    ? await Booking.find({ customer: { $in: customerIds } }).lean()
    : [];
  const customerHistory = customers.map((customer) => ({
    name: customer.name,
    email: customer.email,
    bookings: customerBookings.filter((booking) => String(booking.customer) === String(customer._id)),
  }));

  return res.json(buildReportSummary({
    bookingsByDestination,
    bookingStatuses,
    paymentStatuses,
    cancellationStatuses,
    customerHistory,
  }));
});

module.exports = router;
module.exports.buildReportSummary = buildReportSummary;
module.exports.buildCustomerReportSummary = buildCustomerReportSummary;
