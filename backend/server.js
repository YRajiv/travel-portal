const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { isProduction } = require('./config/runtime');
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

if (process.env.RENDER === 'true' && process.env.NODE_ENV !== 'production') {
  throw new Error('NODE_ENV must be set to production on Render.');
}

const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (isProduction()) {
  const missingConfiguration = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL']
    .filter((name) => !process.env[name]?.trim());
  if (missingConfiguration.length) {
    throw new Error(`Missing production environment variables: ${missingConfiguration.join(', ')}`);
  }
  if (!clientOrigins.length) {
    throw new Error('CLIENT_URL must contain at least one frontend origin.');
  }
  if (process.env.JWT_SECRET.trim().length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}

const app = express();
const port = process.env.PORT || 5000;

if (process.env.RENDER === 'true') app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || clientOrigins.includes(origin.replace(/\/+$/, ''))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(express.json());
app.use(morgan('dev'));

const isDatabaseReady = () => mongoose.connection.readyState === 1;
const databaseUnavailable = (res) => res.status(503).json({
  status: 'not_ready',
  database: 'disconnected',
  message: 'Database is temporarily unavailable. Please try again later.',
});

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  message: 'Travel portal API is running',
  database: isDatabaseReady() ? 'connected' : 'disconnected',
}));
app.get('/api/ready', (req, res) => {
  if (!isDatabaseReady()) return databaseUnavailable(res);
  return res.json({ status: 'ready', database: 'connected' });
});
app.use('/api', (req, res, next) => {
  if (isProduction() && !isDatabaseReady()) return databaseUnavailable(res);
  return next();
});
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
  if (!connected && isProduction()) {
    throw new Error('MongoDB is required in production; demo mode is disabled.');
  }
  if (!connected) await seedDemoData();

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    const detail = isProduction()
      ? `${error.name}. Check production configuration and MongoDB connectivity.`
      : error.message;
    console.error(`Server failed to start: ${detail}`);
    process.exitCode = 1;
  });
}

module.exports = app;
module.exports.startServer = startServer;
