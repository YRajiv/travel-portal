const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  amount: Number,
  method: String,
  status: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
