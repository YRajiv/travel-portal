const isProduction = () => process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

module.exports = { isProduction };
