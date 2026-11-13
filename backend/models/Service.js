const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  type: { type: String, enum: ['Hotel', 'Transport', 'Activity'], required: true },
  location: String,
  availability: { type: String, default: 'Available' },
  price: Number,
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
