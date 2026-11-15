require('dotenv').config();

const mongoose = require('mongoose');
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

const { connectDB } = require('../config/db');
const { isProduction } = require('../config/runtime');
const Destination = require('../models/Destination');
const TravelPackage = require('../models/TravelPackage');
const { requestedCatalog } = require('./seedCatalog');

class SeedError extends Error {}

function readOptions(args) {
  const options = { apply: false, expectedDatabase: undefined };

  for (const arg of args) {
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--database=')) {
      options.expectedDatabase = arg.slice('--database='.length).trim();
      if (!options.expectedDatabase) throw new SeedError('--database must include a database name.');
    } else {
      throw new SeedError(`Unknown option: ${arg}`);
    }
  }

  if (options.apply && options.dryRun) {
    throw new SeedError('Choose either --apply or --dry-run, not both.');
  }
  if (options.apply && !options.expectedDatabase) {
    throw new SeedError('--apply requires --database=<expected database name>.');
  }
  return options;
}

function validateSourceData() {
  if (!requestedCatalog.length) throw new SeedError('The requested catalog contains no entries.');

  const destinationKeys = new Set();
  const packageKeys = new Set();
  for (const entry of requestedCatalog) {
    if (!entry?.destination?.name || !entry?.destination?.country || !entry?.travelPackage?.name) {
      throw new SeedError('The requested catalog contains an entry without a stable identity.');
    }

    const destinationKey = `${entry.destination.name.toLowerCase()}|${entry.destination.country.toLowerCase()}`;
    const packageKey = `${destinationKey}|${entry.travelPackage.name.toLowerCase()}`;
    if (destinationKeys.has(destinationKey) || packageKeys.has(packageKey)) {
      throw new SeedError('The requested catalog contains duplicate destination or package identities.');
    }
    destinationKeys.add(destinationKey);
    packageKeys.add(packageKey);
  }
}

async function buildPlan() {
  const plan = [];
  const summary = {
    destinationsToInsert: 0,
    packagesToInsert: 0,
    destinationsAlreadyPresent: 0,
    packagesAlreadyPresent: 0,
    inactiveDestinations: 0,
    inactivePackages: 0,
    packagesSkippedForInactiveDestination: 0,
  };

  for (const entry of requestedCatalog) {
    const existingDestination = await Destination.findOne({
      name: entry.destination.name,
      country: entry.destination.country,
    });
    const destination = existingDestination || new Destination({
      ...entry.destination,
      isActive: true,
    });
    if (!existingDestination) await destination.validate();

    const destinationInactive = destination.isActive === false;
    const packageData = {
      ...entry.travelPackage,
      destination: destination._id,
      destinationName: destination.name,
      isActive: true,
      isAvailable: true,
    };

    let existingPackage = null;
    if (!destinationInactive) {
      existingPackage = await TravelPackage.findOne({
        name: entry.travelPackage.name,
        destination: destination._id,
      });
    }

    if (existingDestination) {
      summary.destinationsAlreadyPresent += 1;
    } else {
      summary.destinationsToInsert += 1;
    }

    if (destinationInactive) {
      summary.inactiveDestinations += 1;
      summary.packagesSkippedForInactiveDestination += 1;
    } else if (existingPackage) {
      summary.packagesAlreadyPresent += 1;
      if (existingPackage.isActive === false || existingPackage.isAvailable === false) {
        summary.inactivePackages += 1;
      }
    } else {
      const packageDocument = new TravelPackage(packageData);
      await packageDocument.validate();
      summary.packagesToInsert += 1;
    }

    plan.push({
      destination,
      insertDestination: !existingDestination,
      insertPackage: !destinationInactive && !existingPackage,
      packageData,
    });
  }

  return { plan, summary };
}

async function applyPlan(plan) {
  let destinationsInserted = 0;
  let packagesInserted = 0;

  for (const item of plan) {
    let destination = item.destination;
    if (item.insertDestination) {
      destination = await destination.save();
      destinationsInserted += 1;
    }
    if (item.insertPackage) {
      await new TravelPackage({
        ...item.packageData,
        destination: destination._id,
        destinationName: destination.name,
      }).save();
      packagesInserted += 1;
    }
  }

  return { destinationsInserted, packagesInserted };
}

function printSummary(mode, databaseName, summary, applied) {
  console.log(`Mode: ${mode}`);
  console.log(`Target database: ${databaseName}`);
  console.log(`Model collections: ${Destination.collection.name}, ${TravelPackage.collection.name}`);
  if (applied) {
    console.log(`Inserted: ${applied.destinationsInserted} destinations, ${applied.packagesInserted} packages.`);
  } else {
    console.log(`Would insert: ${summary.destinationsToInsert} destinations, ${summary.packagesToInsert} packages.`);
  }
  console.log(`Already present: ${summary.destinationsAlreadyPresent} destinations, ${summary.packagesAlreadyPresent} packages.`);
  if (summary.inactiveDestinations || summary.inactivePackages) {
    console.log(`Left unchanged because inactive: ${summary.inactiveDestinations} destinations, ${summary.inactivePackages} packages.`);
  }
  if (summary.packagesSkippedForInactiveDestination) {
    console.log(`Packages skipped because their destination is inactive: ${summary.packagesSkippedForInactiveDestination}.`);
  }
}

function printSafeError(error) {
  if (error instanceof SeedError) {
    console.error(`Catalog seed failed: ${error.message}`);
    return;
  }
  if (error?.name === 'ValidationError') {
    const paths = Object.keys(error.errors || {});
    console.error(`Catalog seed failed validation${paths.length ? ` for: ${paths.join(', ')}` : ''}.`);
    return;
  }
  console.error(`Catalog seed failed (${error?.name || 'Error'}). No connection details were printed.`);
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const apply = options.apply === true;

  if (!process.env.MONGO_URI?.trim()) {
    throw new SeedError('MONGO_URI is required; refusing to use a fallback database.');
  }
  if (apply && isProduction() && process.env.SEED_PRODUCTION !== 'true') {
    throw new SeedError('Production writes require SEED_PRODUCTION=true.');
  }

  validateSourceData();
  const connected = await connectDB();
  if (!connected || mongoose.connection.readyState !== 1) {
    throw new SeedError('MongoDB is unavailable.');
  }

  const databaseName = mongoose.connection.name;
  if (options.expectedDatabase && databaseName !== options.expectedDatabase) {
    throw new SeedError('Connected database does not match --database; no catalog records were written.');
  }

  const { plan, summary } = await buildPlan();
  const applied = apply ? await applyPlan(plan) : null;
  printSummary(apply ? 'APPLY' : 'DRY RUN', databaseName, summary, applied);
}

async function run() {
  let failed = false;
  try {
    await main();
  } catch (error) {
    printSafeError(error);
    failed = true;
  }

  try {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  } catch (error) {
    printSafeError(error);
    failed = true;
  }

  if (failed) process.exitCode = 1;
}

if (require.main === module) run();

module.exports = { readOptions, validateSourceData, buildPlan };
