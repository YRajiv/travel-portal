const express = require('express');
const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const TravelPackage = require('../models/TravelPackage');
const { demoStore } = require('../utils/demoStore');
const { protect, authorize } = require('../middleware/auth');
const {
  readPagination,
  searchRegex,
  sendCatalogResults,
} = require('../utils/catalogQuery');

const router = express.Router();
const isMongoConnected = () => mongoose.connection.readyState === 1;
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ''));
const destinationFields = [
  'name', 'country', 'city', 'location', 'category', 'tag', 'description',
  'image', 'images', 'attractions', 'bestTimeToVisit', 'estimatedCost',
  'rating', 'popularity', 'isActive',
];
const pick = (source) => Object.fromEntries(destinationFields
  .filter((field) => Object.prototype.hasOwnProperty.call(source, field))
  .map((field) => [field, source[field]]));

function requireAdminForInactive(req, res, next) {
  if (req.query.includeInactive !== 'true') return next();
  return protect(req, res, () => authorize('ADMIN')(req, res, next));
}

function destinationFilter(query, includeInactive) {
  const clauses = [];
  if (!includeInactive) clauses.push({ isActive: { $ne: false } });

  const search = searchRegex(query.search || query.q);
  if (search) {
    clauses.push({
      $or: ['name', 'country', 'city', 'location', 'category', 'tag']
        .map((field) => ({ [field]: search })),
    });
  }

  const country = searchRegex(query.country);
  if (country) clauses.push({ country });
  const city = searchRegex(query.city);
  if (city) clauses.push({ $or: [{ city }, { location: city }] });
  const category = searchRegex(query.category);
  if (category) clauses.push({ $or: [{ category }, { tag: category }] });

  return clauses.length ? { $and: clauses } : {};
}

async function addPackageSummary(items) {
  if (!items.length) return items;
  const ids = items.map((item) => item._id);
  const summaries = await TravelPackage.aggregate([
    {
      $match: {
        destination: { $in: ids },
        isActive: { $ne: false },
        isAvailable: { $ne: false },
      },
    },
    {
      $group: {
        _id: '$destination',
        startingPrice: { $min: '$price' },
        packageCount: { $sum: 1 },
      },
    },
  ]);
  const summaryByDestination = new Map(summaries.map((item) => [String(item._id), item]));

  return items.map((item) => {
    const summary = summaryByDestination.get(String(item._id));
    return {
      ...item,
      startingPrice: summary?.startingPrice ?? null,
      packageCount: summary?.packageCount ?? 0,
    };
  });
}

function sortDestinations(items, sort) {
  const sorters = {
    popularity: (a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0),
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
    price: (a, b) => (a.startingPrice ?? Number.MAX_SAFE_INTEGER) - (b.startingPrice ?? Number.MAX_SAFE_INTEGER),
  };
  return [...items].sort((a, b) => sorters[sort](a, b) || String(a.name).localeCompare(String(b.name)));
}

function sortDemoDestinations(items, sort) {
  const withPrices = items.map((destination) => {
    const packages = demoStore.travelPackages.filter((item) => (
      String(item.destination) === String(destination._id)
      && item.isActive !== false
      && item.isAvailable !== false
    ));
    return {
      ...destination,
      startingPrice: packages.length ? Math.min(...packages.map((item) => Number(item.price) || 0)) : null,
      packageCount: packages.length,
    };
  });
  return sortDestinations(withPrices, sort);
}

router.get('/', requireAdminForInactive, async (req, res) => {
  const pagination = readPagination(req, res);
  if (!pagination) return;
  const sort = req.query.sort || 'popularity';
  if (!['popularity', 'name', 'price'].includes(sort)) {
    return res.status(400).json({ message: 'Sort must be popularity, name, or price.' });
  }

  const includeInactive = req.query.includeInactive === 'true';
  const filter = destinationFilter(req.query, includeInactive);
  if (!isMongoConnected()) {
    let items = demoStore.destinations.filter((item) => {
      if (!includeInactive && item.isActive === false) return false;
      const matches = (value, term) => !term || term.test(String(value || ''));
      return matches(item.name, searchRegex(req.query.search || req.query.q))
        && matches(item.country, searchRegex(req.query.country))
        && matches(item.city || item.location, searchRegex(req.query.city))
        && matches(item.category || item.tag, searchRegex(req.query.category));
    });
    items = sortDemoDestinations(items, sort);
    const total = items.length;
    const categories = [...new Set(demoStore.destinations
      .filter((item) => includeInactive || item.isActive !== false)
      .map((item) => item.category || item.tag)
      .filter(Boolean))].sort();
    return sendCatalogResults(
      res,
      pagination,
      items.slice(pagination.skip, pagination.skip + pagination.limit),
      total,
      { categories },
    );
  }

  const activeFilter = includeInactive ? {} : { isActive: { $ne: false } };
  const [categoryValues, tagValues] = await Promise.all([
    Destination.distinct('category', activeFilter),
    Destination.distinct('tag', activeFilter),
  ]);
  const categories = [...new Set([...categoryValues, ...tagValues].filter(Boolean))].sort();
  const total = await Destination.countDocuments(filter);
  if (sort === 'price') {
    const allMatches = await Destination.find(filter).lean();
    const sorted = sortDestinations(await addPackageSummary(allMatches), sort);
    const items = sorted.slice(pagination.skip, pagination.skip + pagination.limit);
    return sendCatalogResults(res, pagination, items, total, { categories });
  }

  const sortOption = sort === 'name' ? { name: 1 } : { popularity: -1, name: 1 };
  const pageItems = await Destination.find(filter)
    .sort(sortOption)
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
  return sendCatalogResults(res, pagination, await addPackageSummary(pageItems), total, { categories });
});

router.get('/:id', async (req, res) => {
  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid destination ID.' });
    const item = await Destination.findOne({ _id: req.params.id, isActive: { $ne: false } }).lean();
    if (!item) return res.status(404).json({ message: 'Destination not found' });
    const [destination] = await addPackageSummary([item]);
    return res.json(destination);
  }
  const item = demoStore.destinations.find((destination) => (
    destination._id === req.params.id && destination.isActive !== false
  ));
  if (!item) return res.status(404).json({ message: 'Destination not found' });
  return res.json(sortDemoDestinations([item], 'popularity')[0]);
});

router.post('/', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  const data = pick(req.body);
  if (isMongoConnected()) return res.status(201).json(await Destination.create(data));
  const destination = { _id: `${Date.now()}`, isActive: true, ...data, createdAt: new Date().toISOString() };
  demoStore.destinations.push(destination);
  return res.status(201).json(destination);
});

router.put('/:id', protect, authorize('ADMIN', 'TRAVEL_AGENT'), async (req, res) => {
  const data = pick(req.body);
  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid destination ID.' });
    const item = await Destination.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!item) return res.status(404).json({ message: 'Destination not found' });
    return res.json(item);
  }
  const index = demoStore.destinations.findIndex((destination) => destination._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Destination not found' });
  demoStore.destinations[index] = { ...demoStore.destinations[index], ...data };
  return res.json(demoStore.destinations[index]);
});

router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  if (isMongoConnected()) {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid destination ID.' });
    const item = await Destination.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after', runValidators: true },
    );
    if (!item) return res.status(404).json({ message: 'Destination not found' });
    return res.json({ message: 'Destination archived; historical packages and bookings were preserved.', item });
  }
  const item = demoStore.destinations.find((destination) => destination._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Destination not found' });
  item.isActive = false;
  return res.json({ message: 'Destination archived; historical packages and bookings were preserved.', item });
});

module.exports = router;
