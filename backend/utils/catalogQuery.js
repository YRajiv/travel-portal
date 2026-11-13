const MAX_PAGE_SIZE = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readPagination(req, res) {
  const requested = Object.prototype.hasOwnProperty.call(req.query, 'page')
    || Object.prototype.hasOwnProperty.call(req.query, 'limit');
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 12 : Number(req.query.limit);

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    res.status(400).json({ message: `Page must be a positive integer and limit must be between 1 and ${MAX_PAGE_SIZE}.` });
    return null;
  }

  return { requested, page, limit, skip: (page - 1) * limit };
}

function readNonNegativeNumber(req, res, key) {
  if (req.query[key] === undefined || req.query[key] === '') return undefined;
  const value = Number(req.query[key]);
  if (!Number.isFinite(value) || value < 0) {
    res.status(400).json({ message: `${key} must be a non-negative number.` });
    return null;
  }
  return value;
}

function sendCatalogResults(res, pagination, items, total, metadata = {}) {
  if (!pagination.requested) return res.json(items);
  return res.json({
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
    ...metadata,
  });
}

function searchRegex(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? new RegExp(escapeRegex(trimmed), 'i') : null;
}

module.exports = {
  readPagination,
  readNonNegativeNumber,
  searchRegex,
  sendCatalogResults,
};
