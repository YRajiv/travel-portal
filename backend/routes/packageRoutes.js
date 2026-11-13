const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const TravelPackage = require('../models/TravelPackage');
const Destination = require('../models/Destination');
const { demoStore } = require('../utils/demoStore');
const { protect, authorize } = require('../middleware/auth');
const {
  readNonNegativeNumber,
  readPagination,
  searchRegex,
  sendCatalogResults,
} = require('../utils/catalogQuery');

const router = express.Router();
const isMongoConnected = () => mongoose.connection.readyState === 1;
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ''));
const packageFields = [
  'name', 'destination', 'duration', 'nights', 'price', 'description',
  'images', 'includedServices', 'excludedServices', 'accommodation',
  'transportation', 'activities', 'itinerary', 'isAvailable', 'isActive',
];
const pick = (source) => Object.fromEntries(packageFields
  .filter((field) => Object.prototype.hasOwnProperty.call(source, field))
  .map((field) => [field, source[field]]));

function requireAdminForInactive(req, res, next) {
  if (req.query.includeInactive !== 'true') return next();
  return protect(req, res, () => authorize('ADMIN')(req, res, next));
}

function demoDestinationMatches(item, term) {
  const destination = demoStore.destinations.find((candidate) => (
    String(candidate._id) === String(item.destination)
  ));
  return term.test(String(item.name || ''))
    || term.test(String(item.destinationName || destination?.name || ''))
    || term.test(String(item.description || ''));
}

function sortPackages(items, sort) {
  const sorters = {
    price: (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
    duration: (a, b) => (Number(a.duration) || 0) - (Number(b.duration) || 0),
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
    newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  };
  return [...items].sort((a, b) => sorters[sort](a, b) || String(a.name).localeCompare(String(b.name)));
}

async function addDestinationDetails(items, includeInactive = false) {
  if (!items.length) return items;
  const ids = [...new Set(items.map((item) => String(item.destination)).filter(isObjectId))];
  if (!ids.length) return items;
  const filter = { _id: { $in: ids } };
  if (!includeInactive) filter.isActive = { $ne: false };
  const destinations = await Destination.find(filter).select('name country city image').lean();
  const byId = new Map(destinations.map((item) => [String(item._id), item]));
  return items.map((item) => ({
    ...item,
    destinationInfo: byId.get(String(item.destination)) || null,
    destinationName: byId.get(String(item.destination))?.name || item.destinationName,
  }));
}

async function validateDestination(data, res, allowInactive = false) {
  if (!data.destination) {
    res.status(400).json({ message: 'A MongoDB destination is required for a package.' });
    return false;
  }
  if (!isObjectId(data.destination)) {
    res.status(400).json({ message: 'Choose a destination from the MongoDB catalog.' });
    return false;
  }
  const filter = { _id: data.destination };
  if (!allowInactive) filter.isActive = { $ne: false };
  const destination = await Destination.findOne(filter);
  if (!destination) {
    res.status(404).json({ message: 'An active destination is required for this package.' });
    return false;
  }
  data.destinationName = destination.name;
  return true;
}

router.get('/', requireAdminForInactive, async (req, res) => {
  const pagination = readPagination(req, res);
  if (!pagination) return;

  const sort = req.query.sort || 'price';
  if (!['price', 'duration', 'name', 'newest'].includes(sort)) {
    return res.status(400).json({ message: 'Sort must be price, duration, name, or newest.' });
  }

  const minPrice = readNonNegativeNumber(req, res, 'minPrice');
  if (minPrice === null) return;
  const maxPrice = readNonNegativeNumber(req, res, 'maxPrice');
  if (maxPrice === null) return;
  const minDuration = readNonNegativeNumber(req, res, 'minDuration');
  if (minDuration === null) return;
  const maxDuration = readNonNegativeNumber(req, res, 'maxDuration');
  if (maxDuration === null) return;
  if ((minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    || (minDuration !== undefined && maxDuration !== undefined && minDuration > maxDuration)) {
    return res.status(400).json({ message: 'Minimum filter values cannot exceed their maximum values.' });
  }

  const includeInactive = req.query.includeInactive === 'true';
  const clauses = [];
  if (!includeInactive) {
    clauses.push({ isActive: { $ne: false }, isAvailable: { $ne: false } });
  }
  if (req.query.destination) {
    if (isMongoConnected() && !isObjectId(req.query.destination)) {
      return res.status(400).json({ message: 'Invalid destination ID.' });
    }
    clauses.push({ destination: req.query.destination });
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    clauses.push({ price: { ...(minPrice !== undefined ? { $gte: minPrice } : {}), ...(maxPrice !== undefined ? { $lte: maxPrice } : {}) } });
  }
  if (minDuration !== undefined || maxDuration !== undefined) {
    clauses.push({ duration: { ...(minDuration !== undefined ? { $gte: minDuration } : {}), ...(maxDuration !== undefined ? { $lte: maxDuration } : {}) } });
  }
  const search = searchRegex(req.query.search || req.query.q);
  if (search) {
    const searchClause = { $or: [{ name: search }, { destinationName: search }, { description: search }] };
    if (isMongoConnected()) {
      const destinationFilter = { name: search };
      if (!includeInactive) destinationFilter.isActive = { $ne: false };
      const destinationIds = await Destination.find(destinationFilter).distinct('_id');
      if (destinationIds.length) searchClause.$or.push({ destination: { $in: destinationIds } });
    }
    clauses.push(searchClause);
  }

  if (!isMongoConnected()) {
    let items = demoStore.travelPackages.filter((item) => {
      if (!includeInactive && (item.isActive === false || item.isAvailable === false)) return false;
      const destination = demoStore.destinations.find((candidate) => (
        String(candidate._id) === String(item.destination)
      ));
      if (!includeInactive && (!destination || destination.isActive === false)) return false;
      if (req.query.destination && String(item.destination) !== req.query.destination) return false;
      const price = Number(item.price);
      const duration = Number(item.duration);
      if (minPrice !== undefined && price < minPrice) return false;
      if (maxPrice !== undefined && price > maxPrice) return false;
      if (minDuration !== undefined && duration < minDuration) return false;
      if (maxDuration !== undefined && duration > maxDuration) return false;
      return !search || demoDestinationMatches(item, search);
    });
    items = sortPackages(items, sort);
    const total = items.length;
    return sendCatalogResults(
      res,
      pagination,
      items.slice(pagination.skip, pagination.skip + pagination.limit),
      total,
    );
  }

  if (!includeInactive) {
    const activeDestinationIds = await Destination.find({ isActive: { $ne: false } }).distinct('_id');
    clauses.push({ destination: { $in: activeDestinationIds } });
  }
  const filter = clauses.length ? { $and: clauses } : {};
  const sortOption = {
    price: { price: 1, name: 1 },
    duration: { duration: 1, name: 1 },
    name: { name: 1 },
    newest: { createdAt: -1 },
  }[sort];
  const total = await TravelPackage.countDocuments(filter);
  const items = await TravelPackage.find(filter)
    .sort(sortOption)
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
  return sendCatalogResults(res, pagination, await addDestinationDetails(items, includeInactive), total);
});

router.get('/:id', async (req, res) => {
  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid package ID.' });
    const item = await TravelPackage.findOne({
      _id: req.params.id,
      isActive: { $ne: false },
      isAvailable: { $ne: false },
    }).lean();
    if (!item) return res.status(404).json({ message: 'Package not found' });
    const [withDestination] = await addDestinationDetails([item]);
    if (!withDestination.destinationInfo) return res.status(404).json({ message: 'Package destination is unavailable.' });
    return res.json(withDestination);
  }
  const item = demoStore.travelPackages.find((pkg) => (
    pkg._id === req.params.id && pkg.isActive !== false && pkg.isAvailable !== false
  ));
  if (!item) return res.status(404).json({ message: 'Package not found' });
  const destination = demoStore.destinations.find((candidate) => String(candidate._id) === String(item.destination));
  return res.json({ ...item, destinationInfo: destination || null, destinationName: destination?.name || item.destinationName });
});

router.post('/', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  const data = pick(req.body);
  if (isMongoConnected()) {
    if (!await validateDestination(data, res)) return;
    return res.status(201).json(await TravelPackage.create(data));
  }
  const destination = demoStore.destinations.find((item) => item._id === data.destination && item.isActive !== false);
  if (!destination) return res.status(404).json({ message: 'An active destination is required for this package.' });
  const item = {
    isActive: true,
    isAvailable: true,
    ...data,
    destinationName: destination.name,
    _id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  demoStore.travelPackages.push(item);
  return res.status(201).json(item);
});

router.put('/:id', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  const data = pick(req.body);
  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid package ID.' });
    if (Object.prototype.hasOwnProperty.call(data, 'destination') && !await validateDestination(data, res)) return;
    const item = await TravelPackage.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!item) return res.status(404).json({ message: 'Package not found' });
    return res.json(item);
  }
  const index = demoStore.travelPackages.findIndex((item) => item._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Package not found' });
  if (data.destination) {
    const destination = demoStore.destinations.find((item) => item._id === data.destination && item.isActive !== false);
    if (!destination) return res.status(404).json({ message: 'An active destination is required for this package.' });
    data.destinationName = destination.name;
  }
  demoStore.travelPackages[index] = { ...demoStore.travelPackages[index], ...data };
  return res.json(demoStore.travelPackages[index]);
});

router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid package ID.' });
    const item = await TravelPackage.findByIdAndUpdate(
      req.params.id,
      { isActive: false, isAvailable: false },
      { returnDocument: 'after', runValidators: true },
    );
    if (!item) return res.status(404).json({ message: 'Package not found' });
    return res.json({ message: 'Package archived; historical bookings were preserved.', item });
  }
  const item = demoStore.travelPackages.find((pkg) => pkg._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Package not found' });
  item.isActive = false;
  item.isAvailable = false;
  return res.json({ message: 'Package archived; historical bookings were preserved.', item });
});

module.exports = router;
