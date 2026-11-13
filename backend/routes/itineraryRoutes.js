const express = require('express');
const mongoose = require('mongoose');
const { demoStore } = require('../utils/demoStore');
const Booking = require('../models/Booking');
const Itinerary = require('../models/Itinerary');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ''));
const validDays = (days) => Array.isArray(days)
  && days.length > 0
  && days.every((day) => day && Number.isInteger(Number(day.day)) && Number(day.day) > 0
    && typeof day.plan === 'string' && day.plan.trim());

router.get('/', protect, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    const bookingFilter = req.user.role === 'CUSTOMER' ? { customer: req.user._id } : {};
    const bookings = await Booking.find(bookingFilter).select('_id').lean();
    const bookingIds = bookings.map((booking) => booking._id);
    return res.json(bookingIds.length ? await Itinerary.find({ booking: { $in: bookingIds } }).lean() : []);
  }
  if (req.user.role !== 'CUSTOMER') return res.json(demoStore.itineraries);
  const customerBookingIds = new Set(demoStore.bookings
    .filter((booking) => booking.customer === req.user._id)
    .map((booking) => booking._id));
  return res.json(demoStore.itineraries.filter((itinerary) => customerBookingIds.has(itinerary.booking)));
});

router.post('/', protect, authorize('TRAVEL_AGENT', 'ADMIN', 'CUSTOMER'), async (req, res) => {
  const { booking: bookingId, title, days } = req.body;
  if (typeof title !== 'string' || !title.trim() || !validDays(days)) {
    return res.status(400).json({ message: 'Provide an itinerary title and at least one valid day plan.' });
  }

  if (mongoose.connection.readyState === 1) {
    if (!isObjectId(bookingId)) return res.status(400).json({ message: 'Choose a valid booking.' });
    const booking = await Booking.findById(bookingId);
    if (!booking || (req.user.role === 'CUSTOMER' && String(booking.customer) !== String(req.user._id))) {
      return res.status(404).json({ message: 'Booking not found for this customer.' });
    }
    return res.status(201).json(await Itinerary.create({
      booking: booking._id,
      title: title.trim(),
      days: days.map((day) => ({ day: Number(day.day), plan: day.plan.trim() })),
    }));
  }

  const booking = demoStore.bookings.find((item) => item._id === bookingId
    && (req.user.role !== 'CUSTOMER' || item.customer === req.user._id));
  if (!booking) return res.status(404).json({ message: 'Booking not found for this customer.' });
  const itinerary = {
    _id: `${Date.now()}`,
    booking: booking._id,
    title: title.trim(),
    days: days.map((day) => ({ day: Number(day.day), plan: day.plan.trim() })),
    createdAt: new Date().toISOString(),
  };
  demoStore.itineraries.push(itinerary);
  res.status(201).json(itinerary);
});

router.put('/:id', protect, authorize('TRAVEL_AGENT', 'ADMIN', 'CUSTOMER'), async (req, res) => {
  const { title, days } = req.body;
  if (typeof title !== 'string' || !title.trim() || !validDays(days)) {
    return res.status(400).json({ message: 'Provide an itinerary title and at least one valid day plan.' });
  }

  if (mongoose.connection.readyState === 1) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid itinerary ID.' });
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found' });
    if (req.user.role === 'CUSTOMER'
      && !await Booking.exists({ _id: itinerary.booking, customer: req.user._id })) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    itinerary.title = title.trim();
    itinerary.days = days.map((day) => ({ day: Number(day.day), plan: day.plan.trim() }));
    await itinerary.save();
    return res.json(itinerary);
  }

  const index = demoStore.itineraries.findIndex((i) => i._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Itinerary not found' });
  demoStore.itineraries[index] = {
    ...demoStore.itineraries[index],
    title: title.trim(),
    days: days.map((day) => ({ day: Number(day.day), plan: day.plan.trim() })),
  };
  res.json(demoStore.itineraries[index]);
});

module.exports = router;
