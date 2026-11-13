const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  country: { type: String, trim: true, maxlength: 100 },
  city: { type: String, trim: true, maxlength: 100 },
  location: { type: String, trim: true, maxlength: 160 },
  category: { type: String, trim: true, maxlength: 60 },
  tag: { type: String, trim: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 3000 },
  image: { type: String, trim: true },
  images: { type: [String], default: [] },
  attractions: { type: [String], default: [] },
  bestTimeToVisit: { type: String, trim: true, maxlength: 160 },
  estimatedCost: { type: Number, min: 0 },
  rating: { type: Number, min: 0, max: 5 },
  popularity: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Destination', destinationSchema);
