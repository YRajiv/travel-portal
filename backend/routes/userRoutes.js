const express = require('express');
const mongoose = require('mongoose');
const { demoStore } = require('../utils/demoStore');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.json(await User.find({}).select('-password').lean());
  }
  return res.json(demoStore.users.map((user) => ({ ...user, password: undefined })));
});

module.exports = router;
