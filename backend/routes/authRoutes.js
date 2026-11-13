const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { demoStore } = require('../utils/demoStore');
const { protect } = require('../middleware/auth');

const router = express.Router();

const createToken = (user) => jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'travel-secret', { expiresIn: '7d' });
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Please provide name, email and password' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!validEmail(normalizedEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  const existingUser = mongoose.connection.readyState === 1
    ? await User.findOne({ email: normalizedEmail })
    : demoStore.users.find((user) => user.email.toLowerCase() === normalizedEmail);
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hashed, role: 'CUSTOMER' });
      return res.status(201).json({ token: createToken(user), user: publicUser(user) });
    } catch (error) {
      if (error.code === 11000) return res.status(400).json({ message: 'User already exists' });
      throw error;
    }
  }

  const newUser = {
    _id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    name: name.trim(),
    email: normalizedEmail,
    password: hashed,
    role: 'CUSTOMER',
    createdAt: new Date().toISOString(),
  };

  demoStore.users.push(newUser);
  const token = createToken(newUser);
  res.status(201).json({ token, user: { ...newUser, password: undefined } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Please provide email and password' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = mongoose.connection.readyState === 1
    ? await User.findOne({ email: normalizedEmail })
    : demoStore.users.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

  const token = createToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
