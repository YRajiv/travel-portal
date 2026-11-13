const mongoose = require('mongoose');

const itineraryDaySchema = new mongoose.Schema({
  day: { type: Number, required: true, min: 1 },
  title: { type: String, trim: true, maxlength: 140 },
  description: { type: String, trim: true, maxlength: 1000 },
}, { _id: false });

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  destinationName: { type: String, trim: true, maxlength: 120 },
  duration: { type: Number, required: true, min: 1 },
  nights: { type: Number, min: 0 },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true, maxlength: 3000 },
  images: { type: [String], default: [] },
  includedServices: { type: [String], default: [] },
  excludedServices: { type: [String], default: [] },
  accommodation: { type: String, trim: true, maxlength: 500 },
  transportation: { type: String, trim: true, maxlength: 500 },
  activities: { type: [String], default: [] },
  itinerary: { type: [itineraryDaySchema], default: [] },
  isAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TravelPackage', packageSchema);
