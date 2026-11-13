const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { seedDemoData } = require('./utils/demoStore');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const packageRoutes = require('./routes/packageRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const itineraryRoutes = require('./routes/itineraryRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  const missingConfiguration = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL']
    .filter((name) => !process.env[name]);
  if (missingConfiguration.length) {
    throw new Error(`Missing production environment variables: ${missingConfiguration.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Travel portal API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/itineraries', itineraryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/reports', reportRoutes);

app.use(errorHandler);

const startServer = async () => {
  const connected = await connectDB();
  if (!connected) await seedDemoData();

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error(`Server failed to start: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = app;
module.exports.startServer = startServer;
