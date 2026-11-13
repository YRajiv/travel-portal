const express = require('express');
const mongoose = require('mongoose');
const { demoStore } = require('../utils/demoStore');
const Service = require('../models/Service');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const serviceFields = ['name', 'type', 'location', 'availability', 'price'];
const pickServiceFields = (source) => Object.fromEntries(serviceFields
  .filter((field) => Object.prototype.hasOwnProperty.call(source, field))
  .map((field) => [field, source[field]]));

router.get('/', async (req, res) => {
  if (mongoose.connection.readyState === 1) return res.json(await Service.find({}).lean());
  return res.json(demoStore.services);
});

router.get('/mine', protect, authorize('SERVICE_PROVIDER', 'ADMIN'), async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    const filter = req.user.role === 'ADMIN' ? {} : { provider: req.user._id };
    return res.json(await Service.find(filter).lean());
  }
  if (req.user.role === 'ADMIN') return res.json(demoStore.services);
  return res.json(demoStore.services.filter((service) => service.provider === req.user._id));
});

router.post('/', protect, authorize('SERVICE_PROVIDER', 'ADMIN'), async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(201).json(await Service.create({
      ...pickServiceFields(req.body),
      provider: req.user._id,
    }));
  }
  const service = {
    _id: `${Date.now()}`,
    ...pickServiceFields(req.body),
    provider: req.user._id,
    createdAt: new Date().toISOString(),
  };
  demoStore.services.push(service);
  res.status(201).json(service);
});

router.put('/:id', protect, authorize('SERVICE_PROVIDER', 'ADMIN'), async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    if (!/^[a-f\d]{24}$/i.test(String(req.params.id || ''))) {
      return res.status(400).json({ message: 'Invalid service ID.' });
    }
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (req.user.role !== 'ADMIN' && String(service.provider) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only update your own service listings.' });
    }
    Object.assign(service, pickServiceFields(req.body));
    await service.save();
    return res.json(service);
  }
  const index = demoStore.services.findIndex((s) => s._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Service not found' });
  demoStore.services[index] = { ...demoStore.services[index], ...pickServiceFields(req.body) };
  res.json(demoStore.services[index]);
});

module.exports = router;
