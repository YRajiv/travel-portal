const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Destination = require('../models/Destination');
const Payment = require('../models/Payment');
const TravelPackage = require('../models/TravelPackage');
const { demoStore } = require('../utils/demoStore');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const isMongoConnected = () => mongoose.connection.readyState === 1;
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ''));
const newBookingId = () => `BK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function readLeadTraveler(value, res) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    res.status(400).json({ message: 'Provide valid lead traveler details.' });
    return null;
  }
  const name = String(value.name || '').trim();
  const email = String(value.email || '').trim().toLowerCase();
  const phone = String(value.phone || '').trim();
  const phoneDigits = phone.replace(/\D/g, '');
  if (!name || name.length > 120 || !validEmail(email) || phoneDigits.length < 8 || phoneDigits.length > 15) {
    res.status(400).json({ message: 'Lead traveler name, valid email, and phone number are required.' });
    return null;
  }
  return { name, email, phone };
}

function bookingPayload(booking) {
  return {
    ...(typeof booking.toObject === 'function' ? booking.toObject() : booking),
    paymentNotice: 'Payment processing is not available; no charge was made. Payment remains pending.',
  };
}

router.get('/', protect, async (req, res) => {
  if (isMongoConnected()) {
    const filter = req.user.role === 'CUSTOMER' ? { customer: req.user._id } : {};
    const bookings = await Booking.find(filter).lean();
    const packageIds = bookings.map((booking) => booking.package).filter(Boolean);
    const packages = packageIds.length
      ? await TravelPackage.find({ _id: { $in: packageIds } }).select('name destinationName destination images').lean()
      : [];
    const packageNames = new Map(packages.map((travelPackage) => [String(travelPackage._id), travelPackage.name]));
    const destinationsById = new Map(packages
      .filter((travelPackage) => travelPackage.destination)
      .map((travelPackage) => [String(travelPackage.destination), travelPackage.destination]));
    const destinationIds = [...new Set(bookings
      .map((booking) => booking.destination || destinationsById.get(String(booking.package)))
      .filter(Boolean)
      .map(String))];
    const destinations = destinationIds.length
      ? await Destination.find({ _id: { $in: destinationIds } }).select('name image').lean()
      : [];
    const destinationDetails = new Map(destinations.map((destination) => [String(destination._id), destination]));
    const packagesById = new Map(packages.map((travelPackage) => [String(travelPackage._id), travelPackage]));
    return res.json(bookings.map((booking) => ({
      ...booking,
      packageName: packageNames.get(String(booking.package)),
      destinationName: destinationDetails.get(String(booking.destination || packagesById.get(String(booking.package))?.destination))?.name
        || packagesById.get(String(booking.package))?.destinationName,
      destinationImage: destinationDetails.get(String(booking.destination || packagesById.get(String(booking.package))?.destination))?.image
        || packagesById.get(String(booking.package))?.images?.[0],
    })));
  }

  if (req.user.role === 'CUSTOMER') {
    return res.json(demoStore.bookings
      .filter((booking) => booking.customer === req.user._id)
      .map((booking) => {
        const travelPackage = demoStore.travelPackages.find((item) => item._id === booking.package);
        const destination = demoStore.destinations.find((item) => item._id === (booking.destination || travelPackage?.destination));
        return {
          ...booking,
          packageName: travelPackage?.name,
          destinationName: destination?.name || travelPackage?.destinationName,
          destinationImage: destination?.image || travelPackage?.images?.[0],
        };
      }));
  }
  return res.json(demoStore.bookings.map((booking) => ({
    ...booking,
    packageName: demoStore.travelPackages.find((item) => item._id === booking.package)?.name,
  })));
});

router.post('/', protect, async (req, res) => {
  const { package: packageId, travelDate, travelers } = req.body;
  if (isMongoConnected()) {
    const travelerCount = Number(travelers);
    if (!packageId || !travelDate || !Number.isInteger(travelerCount) || travelerCount < 1 || travelerCount > 20) {
      return res.status(400).json({ message: 'Choose a package, travel date, and at least one traveler.' });
    }
    const leadTraveler = readLeadTraveler(req.body.leadTraveler, res);
    if (leadTraveler === null) return;

    const clientRequestId = req.body.clientRequestId === undefined
      ? undefined
      : String(req.body.clientRequestId).trim();
    if (clientRequestId !== undefined && (clientRequestId.length < 8 || clientRequestId.length > 120)) {
      return res.status(400).json({ message: 'Booking request ID must be between 8 and 120 characters.' });
    }

    if (!isObjectId(packageId)) {
      return res.status(400).json({ message: 'Choose a package from the MongoDB catalog; demo package IDs cannot be booked while MongoDB is connected.' });
    }

    if (clientRequestId) {
      const existingBooking = await Booking.findOne({ customer: req.user._id, clientRequestId });
      if (existingBooking) return res.status(200).json(bookingPayload(existingBooking));
    }

    const travelPackage = await TravelPackage.findById(packageId).lean();
    if (!travelPackage) {
      return res.status(404).json({ message: 'Travel package not found in MongoDB. Add a valid package and destination before booking.' });
    }
    if (travelPackage.isActive === false || travelPackage.isAvailable === false) {
      return res.status(409).json({ message: 'This travel package is not currently available for booking.' });
    }

    if (!travelPackage.destination || !await Destination.exists({
      _id: travelPackage.destination,
      isActive: { $ne: false },
    })) {
      return res.status(409).json({ message: 'This package is not linked to an existing MongoDB destination. Correct the catalog before booking.' });
    }

    const unitPrice = Number(travelPackage.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(409).json({ message: 'This package has no valid price and cannot be booked.' });
    }

    const date = new Date(travelDate);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Provide a valid travel date.' });
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) {
      return res.status(400).json({ message: 'Travel date cannot be in the past.' });
    }

    const bookingData = {
      bookingId: newBookingId(),
      customer: req.user._id,
      package: travelPackage._id,
      destination: travelPackage.destination,
      travelDate: date,
      travelers: travelerCount,
      ...(leadTraveler ? { leadTraveler } : {}),
      ...(clientRequestId ? { clientRequestId } : {}),
      totalPrice: unitPrice * travelerCount,
      status: 'Pending',
      paymentStatus: 'Pending',
    };
    let booking;
    try {
      booking = await Booking.create(bookingData);
    } catch (error) {
      if (error.code === 11000 && clientRequestId) {
        const existingBooking = await Booking.findOne({ customer: req.user._id, clientRequestId });
        if (existingBooking) return res.status(200).json(bookingPayload(existingBooking));
      }
      throw error;
    }

    try {
      await Payment.create({
        booking: booking._id,
        amount: booking.totalPrice,
        method: 'Not processed',
        status: 'Pending',
      });
    } catch (error) {
      try {
        const rollback = await Booking.deleteOne({ _id: booking._id });
        if (rollback.deletedCount !== 1) {
          throw new Error('Booking rollback did not remove the newly created booking.');
        }
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Payment record creation failed and the new booking could not be rolled back.',
        );
      }
      throw error;
    }

    return res.status(201).json(bookingPayload(booking));
  }

  const clientRequestId = req.body.clientRequestId && String(req.body.clientRequestId).trim();
  if (clientRequestId) {
    const existingBooking = demoStore.bookings.find((item) => (
      item.customer === req.user._id && item.clientRequestId === clientRequestId
    ));
    if (existingBooking) return res.status(200).json(bookingPayload(existingBooking));
  }
  const booking = {
    ...req.body,
    _id: `${Date.now()}`,
    bookingId: newBookingId(),
    ...(clientRequestId ? { clientRequestId } : {}),
    customer: req.user._id,
    status: 'Pending',
    paymentStatus: 'Pending',
    createdAt: new Date().toISOString(),
  };
  demoStore.bookings.push(booking);
  demoStore.payments.push({
    _id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    booking: booking._id,
    amount: Number(booking.totalPrice) || 0,
    method: 'Not processed',
    status: 'Pending',
  });
  return res.status(201).json(bookingPayload(booking));
});

router.put('/:id/status', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  if (Object.prototype.hasOwnProperty.call(req.body, 'paymentStatus')) {
    return res.status(400).json({ message: 'Payment status cannot be changed without verified payment processing.' });
  }
  const allowedStatuses = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];
  if (req.body.status && !allowedStatuses.includes(req.body.status)) {
    return res.status(400).json({ message: 'Unsupported booking status.' });
  }

  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID.' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.body.status) booking.status = req.body.status;
    await booking.save();
    return res.json(booking);
  }

  const booking = demoStore.bookings.find((item) => item._id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (req.body.status) booking.status = req.body.status;
  return res.json(booking);
});

module.exports = router;
