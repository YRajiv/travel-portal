const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { isProduction } = require('../config/runtime');
const { demoStore } = require('../utils/demoStore');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'travel-secret');
  } catch (error) {
    return res.status(401).json({ message: 'Token invalid' });
  }

  if (isProduction() && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again later.' });
  }

  if (mongoose.connection.readyState === 1) {
    if (!/^[a-f\d]{24}$/i.test(String(decoded.id || ''))) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ message: 'Invalid token' });
      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  try {
    const user = demoStore.users.find((item) => item._id === decoded.id || item.email === decoded.email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied for this role' });
  }
  next();
};

module.exports = { protect, authorize };
