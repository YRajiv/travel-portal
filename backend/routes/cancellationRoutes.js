const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Cancellation = require('../models/Cancellation');
const { demoStore } = require('../utils/demoStore');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const isMongoConnected = () => mongoose.connection.readyState === 1;
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ''));

router.get('/', protect, async (req, res) => {
  if (isMongoConnected()) {
    const filter = req.user.role === 'CUSTOMER' ? { customer: req.user._id } : {};
    return res.json(await Cancellation.find(filter).lean());
  }
  if (req.user.role === 'CUSTOMER') {
    return res.json(demoStore.cancellations.filter((item) => item.customer === req.user._id));
  }
  return res.json(demoStore.cancellations);
});

router.post('/', protect, async (req, res) => {
  const { booking: bookingId, reason } = req.body;
  if (isMongoConnected()) {
    if (!bookingId) return res.status(400).json({ message: 'A booking is required for a cancellation request.' });
    if (!isObjectId(bookingId)) return res.status(400).json({ message: 'Invalid booking ID.' });
    const booking = await Booking.findOne({ _id: bookingId, customer: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found for this customer.' });
    if (booking.status === 'Cancelled') {
      return res.status(409).json({ message: 'This booking is already cancelled.' });
    }

    const existingCancellation = await Cancellation.findOne({
      booking: booking._id,
      customer: req.user._id,
      status: { $ne: 'Rejected' },
    });
    if (existingCancellation) return res.json(existingCancellation);

    const item = await Cancellation.create({
      booking: booking._id,
      customer: req.user._id,
      reason,
      status: 'Pending',
    });
    return res.status(201).json(item);
  }

  const booking = demoStore.bookings.find((item) => item._id === bookingId && item.customer === req.user._id);
  if (!booking) return res.status(404).json({ message: 'Booking not found for this customer.' });
  if (booking.status === 'Cancelled') {
    return res.status(409).json({ message: 'This booking is already cancelled.' });
  }
  const existingCancellation = demoStore.cancellations.find((item) => (
    item.booking === booking._id && item.customer === req.user._id && item.status !== 'Rejected'
  ));
  if (existingCancellation) return res.json(existingCancellation);

  const item = {
    _id: `${Date.now()}`,
    booking: booking._id,
    customer: req.user._id,
    reason,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  demoStore.cancellations.push(item);
  return res.status(201).json(item);
});

router.put('/:id', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
  if (req.body.status && !allowedStatuses.includes(req.body.status)) {
    return res.status(400).json({ message: 'Unsupported cancellation status.' });
  }

  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid cancellation ID.' });
    const item = await Cancellation.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Cancellation request not found' });
    if (req.body.status) item.status = req.body.status;
    await item.save();
    if (item.status === 'Approved') {
      await Booking.findByIdAndUpdate(item.booking, { status: 'Cancelled' }, { runValidators: true });
    }
    return res.json(item);
  }

  const item = demoStore.cancellations.find((cancellation) => cancellation._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Cancellation request not found' });
  if (req.body.status) item.status = req.body.status;
  return res.json(item);
});

module.exports = router;
