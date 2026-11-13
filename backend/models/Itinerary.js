const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  title: String,
  days: [{ day: Number, plan: String }],
}, { timestamps: true });

module.exports = mongoose.model('Itinerary', itinerarySchema);
