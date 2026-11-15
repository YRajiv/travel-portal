const mongoose = require('mongoose');
const { isProduction } = require('./runtime');

const connectDB = async () => {
  const production = isProduction();
  const mongoURI = process.env.MONGO_URI || (production ? '' : 'mongodb://127.0.0.1:27017/travel-portal');

  if (!mongoURI || !mongoURI.trim()) {
    throw new Error('MONGO_URI must be configured in production.');
  }

  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 4000 });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    if (production) throw error;
    console.warn(`MongoDB not available. Starting in demo mode: ${error.message}`);
    return false;
  }
};

module.exports = { connectDB };
