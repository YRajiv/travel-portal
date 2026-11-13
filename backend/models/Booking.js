const mongoose = require('mongoose');

const leadTravelerSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 24 },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  clientRequestId: { type: String, maxlength: 120, unique: true, sparse: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelPackage', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  leadTraveler: leadTravelerSchema,
  travelDate: Date,
  travelers: Number,
  totalPrice: Number,
  status: { type: String, enum: ['Pending', 'Confirmed', 'Paid', 'Cancelled', 'Completed'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
