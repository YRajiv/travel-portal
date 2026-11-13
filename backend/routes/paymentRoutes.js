const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { demoStore } = require('../utils/demoStore');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const isMongoConnected = () => mongoose.connection.readyState === 1;
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ''));
const notice = 'Payment processing is not available; no charge was made.';

router.get('/', protect, authorize('ADMIN', 'TRAVEL_AGENT', 'CUSTOMER'), async (req, res) => {
  if (isMongoConnected()) {
    if (req.user.role !== 'CUSTOMER') return res.json(await Payment.find({}).lean());
    const bookings = await Booking.find({ customer: req.user._id }).select('_id').lean();
    const bookingIds = bookings.map((booking) => booking._id);
    return res.json(bookingIds.length ? await Payment.find({ booking: { $in: bookingIds } }).lean() : []);
  }

  if (req.user.role !== 'CUSTOMER') return res.json(demoStore.payments);
  const bookingIds = new Set(demoStore.bookings
    .filter((booking) => booking.customer === req.user._id)
    .map((booking) => booking._id));
  return res.json(demoStore.payments.filter((payment) => bookingIds.has(payment.booking)));
});

router.post('/', protect, authorize('CUSTOMER'), async (req, res) => {
  const bookingId = req.body.booking;
  if (!bookingId) return res.status(400).json({ message: 'A booking is required to record a pending payment.' });

  if (isMongoConnected()) {
    if (!isObjectId(bookingId)) return res.status(400).json({ message: 'Invalid booking ID.' });
    const booking = await Booking.findOne({ _id: bookingId, customer: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found for this customer.' });

    let payment = await Payment.findOne({ booking: booking._id });
    let statusCode = 200;
    if (!payment) {
      if (booking.paymentStatus && booking.paymentStatus !== 'Pending') {
        return res.status(409).json({ message: 'A new pending payment cannot be recorded for this booking status.' });
      }
      if (booking.status === 'Cancelled') {
        return res.status(409).json({ message: 'A cancelled booking cannot receive a payment request.' });
      }
      try {
        payment = await Payment.create({
          booking: booking._id,
          amount: booking.totalPrice,
          method: 'Not processed',
          status: 'Pending',
        });
        statusCode = 201;
      } catch (error) {
        if (error.code !== 11000) throw error;
        payment = await Payment.findOne({ booking: booking._id });
        if (!payment) throw error;
      }
    }

    return res.status(statusCode).json({
      ...payment.toObject(),
      notice: payment.status === 'Pending' ? notice : undefined,
    });
  }

  const booking = demoStore.bookings.find((item) => item._id === bookingId && item.customer === req.user._id);
  if (!booking) return res.status(404).json({ message: 'Booking not found for this customer.' });
  let payment = demoStore.payments.find((item) => item.booking === booking._id);
  let statusCode = 200;
  if (!payment) {
    if (booking.paymentStatus && booking.paymentStatus !== 'Pending') {
      return res.status(409).json({ message: 'A new pending payment cannot be recorded for this booking status.' });
    }
    if (booking.status === 'Cancelled') {
      return res.status(409).json({ message: 'A cancelled booking cannot receive a payment request.' });
    }
    payment = {
      _id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      booking: booking._id,
      amount: Number(booking.totalPrice) || 0,
      method: 'Not processed',
      status: 'Pending',
    };
    demoStore.payments.push(payment);
    statusCode = 201;
  }
  return res.status(statusCode).json({
    ...payment,
    notice: payment.status === 'Pending' ? notice : undefined,
  });
});

module.exports = router;
