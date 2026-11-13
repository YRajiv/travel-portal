const mongoose = require('mongoose');

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoURI = process.env.MONGO_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/travel-portal');

  if (!mongoURI) {
    throw new Error('MONGO_URI must be configured in production.');
  }

  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 4000 });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    if (isProduction) throw error;
    console.warn(`MongoDB not available. Starting in demo mode: ${error.message}`);
    return false;
  }
};

module.exports = { connectDB };
