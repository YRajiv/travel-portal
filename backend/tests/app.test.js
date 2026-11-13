const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { buildReportSummary, buildCustomerReportSummary } = require('../routes/reportRoutes');
const { demoStore, seedDemoData } = require('../utils/demoStore');
const User = require('../models/User');
const TravelPackage = require('../models/TravelPackage');
const Destination = require('../models/Destination');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Cancellation = require('../models/Cancellation');
const Itinerary = require('../models/Itinerary');
const Service = require('../models/Service');

beforeAll(async () => {
  await seedDemoData();
});

afterEach(() => {
  jest.restoreAllMocks();
  mongoose.connection.readyState = 0;
});

describe('Travel Portal API', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('registers a customer account', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Rhea Test',
        email: 'rhea@test.com',
        password: 'testpass123',
        role: 'ADMIN',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('rhea@test.com');
    expect(response.body.user.role).toBe('CUSTOMER');
  });

  it('logs in with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'customer@travelportal.com',
        password: 'customer123',
      });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('CUSTOMER');
  });

  it('keeps new bookings assigned to the authenticated customer', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@travelportal.com', password: 'customer123' });

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ _id: 'forged-id', bookingId: 'FORGED', customer: 'another-user', package: 'demo' });

    expect(response.status).toBe(201);
    expect(response.body.customer).toBe(login.body.user._id);
    expect(response.body._id).not.toBe('forged-id');
    expect(response.body.bookingId).not.toBe('FORGED');
  });

  it('creates catalog records through admin APIs and exposes searchable paginated records', async () => {
    mongoose.connection.readyState = 0;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@travelportal.com', password: 'admin123' });
    const token = login.body.token;
    const suffix = Date.now();
    const destinationResponse = await request(app)
      .post('/api/destinations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Catalog Test ${suffix}`,
        country: 'India',
        category: 'Test',
        description: 'Destination used by an isolated API test.',
      });

    expect(destinationResponse.status).toBe(201);
    const packageResponse = await request(app)
      .post('/api/packages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Catalog Package ${suffix}`,
        destination: destinationResponse.body._id,
        duration: 3,
        price: 25000,
        description: 'Package used by an isolated API test.',
      });

    expect(packageResponse.status).toBe(201);
    const destinations = await request(app)
      .get(`/api/destinations?search=${encodeURIComponent(`Catalog Test ${suffix}`)}&page=1&limit=5`);
    const packages = await request(app)
      .get(`/api/packages?destination=${destinationResponse.body._id}&minPrice=20000&maxDuration=4&page=1&limit=5`);

    expect(destinations.status).toBe(200);
    expect(destinations.body.items.map((item) => item.name)).toContain(`Catalog Test ${suffix}`);
    expect(destinations.body.totalPages).toBe(1);
    expect(packages.status).toBe(200);
    expect(packages.body.items.map((item) => item.name)).toContain(`Catalog Package ${suffix}`);

    const archive = await request(app)
      .delete(`/api/destinations/${destinationResponse.body._id}`)
      .set('Authorization', `Bearer ${token}`);
    const hiddenDestination = await request(app).get(`/api/destinations/${destinationResponse.body._id}`);
    const hiddenPackage = await request(app).get(`/api/packages?destination=${destinationResponse.body._id}`);

    expect(archive.status).toBe(200);
    expect(hiddenDestination.status).toBe(404);
    expect(hiddenPackage.body).toEqual([]);
  });

  it('requires admin authorization to view archived catalog records', async () => {
    const response = await request(app).get('/api/destinations?includeInactive=true');
    expect(response.status).toBe(401);
  });

  it('keeps cancellation requests assigned to the authenticated customer', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@travelportal.com', password: 'customer123' });
    const booking = require('../utils/demoStore').demoStore.bookings
      .find((item) => item.customer === login.body.user._id);

    const response = await request(app)
      .post('/api/cancellations')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ _id: 'forged-id', customer: 'another-user', booking: booking._id, reason: 'Change of plans' });

    expect(response.status).toBe(201);
    expect(response.body.customer).toBe(login.body.user._id);
    expect(response.body._id).not.toBe('forged-id');
  });
});

describe('report summary', () => {
  it('uses paid amounts and reports booking and cancellation statuses', () => {
    const report = buildReportSummary({
      bookingsByDestination: [{ destination: 'Bali', totalBookings: 2, travelers: 3, revenue: 100 }],
      bookingStatuses: [
        { _id: 'Confirmed', count: 1 },
        { _id: 'Pending', count: 1 },
        { _id: 'Cancelled', count: 1 },
      ],
      paymentStatuses: [
        { _id: 'Paid', count: 1, amount: 100 },
        { _id: 'Pending', count: 1, amount: 50 },
      ],
      cancellationStatuses: [
        { _id: 'Approved', count: 1 },
        { _id: 'Pending', count: 1 },
      ],
      customerHistory: [],
    });

    expect(report.bookings).toEqual({ total: 3, confirmed: 1, cancelled: 1, pending: 1 });
    expect(report.revenue).toEqual({ totalRevenue: 100, paid: 1, pending: 1, refunded: 0 });
    expect(report.cancellations).toEqual({ total: 2, approved: 1, rejected: 0, pending: 1 });
  });

  it('returns zero totals for empty MongoDB collections', () => {
    const report = buildReportSummary({
      bookingsByDestination: [],
      bookingStatuses: [],
      paymentStatuses: [],
      cancellationStatuses: [],
      customerHistory: [],
    });

    expect(report.bookings).toEqual({ total: 0, confirmed: 0, cancelled: 0, pending: 0 });
    expect(report.revenue).toEqual({ totalRevenue: 0, paid: 0, pending: 0, refunded: 0 });
    expect(report.cancellations).toEqual({ total: 0, approved: 0, rejected: 0, pending: 0 });
  });

  it('builds a customer-only report with trip and payment totals', () => {
    const report = buildCustomerReportSummary({
      bookings: [{
        _id: 'booking-1',
        bookingId: 'BK-REPORT',
        package: 'package-1',
        destination: 'destination-1',
        travelDate: '2027-01-10',
        travelers: 2,
        totalPrice: 300,
        status: 'Confirmed',
        leadTraveler: { email: 'private@example.test' },
      }],
      payments: [
        { status: 'Paid', amount: 300 },
        { status: 'Pending', amount: 100 },
      ],
      packages: [{ _id: 'package-1', name: 'Island break', destination: 'destination-1' }],
      destinations: [{ _id: 'destination-1', name: 'Maui' }],
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(report.overview).toEqual({
      totalBookings: 1,
      upcomingTrips: 1,
      completedTrips: 0,
      cancelledBookings: 0,
      totalTravelers: 2,
    });
    expect(report.payments).toMatchObject({ total: 2, paid: 1, pending: 1, paidAmount: 300, pendingAmount: 100 });
    expect(report.bookingsByDestination).toEqual([{ destination: 'Maui', totalBookings: 1 }]);
    expect(report.recentBookings[0].leadTraveler).toBeUndefined();
  });

  it('serves customer reports to customers without exposing company-wide reports', async () => {
    mongoose.connection.readyState = 0;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@travelportal.com', password: 'customer123' });
    const customerBookingCount = demoStore.bookings.filter(
      (booking) => booking.customer === login.body.user._id,
    ).length;
    const foreignBooking = { _id: 'foreign-report-booking', customer: 'another-customer' };
    demoStore.bookings.push(foreignBooking);
    demoStore.payments.push({
      _id: 'foreign-report-payment',
      booking: foreignBooking._id,
      amount: 9999,
      status: 'Paid',
    });
    const customerReport = await request(app)
      .get('/api/reports/customer-summary')
      .set('Authorization', `Bearer ${login.body.token}`);
    demoStore.bookings.pop();
    demoStore.payments.pop();
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@travelportal.com', password: 'admin123' });
    const adminReport = await request(app)
      .get('/api/reports/customer-summary')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    const anonymousReport = await request(app).get('/api/reports/customer-summary');

    expect(customerReport.status).toBe(200);
    expect(customerReport.body.overview.totalBookings).toBe(customerBookingCount);
    expect(customerReport.body.payments.paidAmount).toBe(1198);
    expect(customerReport.body.payments.pendingAmount).toBe(1498);
    expect(adminReport.status).toBe(403);
    expect(anonymousReport.status).toBe(401);
  });
});

describe('Mongo-backed customer reports', () => {
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const packageId = new mongoose.Types.ObjectId();
  const destinationId = new mongoose.Types.ObjectId();
  const token = jwt.sign(
    { id: customerId.toString(), email: 'report-customer@test.com', role: 'CUSTOMER' },
    'travel-secret',
  );

  beforeEach(() => {
    mongoose.connection.readyState = 1;
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: customerId,
      email: 'report-customer@test.com',
      role: 'CUSTOMER',
    });
  });

  it('queries only the authenticated customer bookings and related payments', async () => {
    jest.spyOn(Booking, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([{
        _id: bookingId,
        bookingId: 'BK-CUSTOMER-REPORT',
        customer: customerId,
        package: packageId,
        destination: destinationId,
        travelDate: '2027-06-01',
        travelers: 2,
        totalPrice: 500,
        status: 'Confirmed',
        paymentStatus: 'Pending',
        leadTraveler: { email: 'private@example.test' },
      }]),
    });
    jest.spyOn(TravelPackage, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{
          _id: packageId,
          name: 'Coastal escape',
          destination: destinationId,
        }]),
      }),
    });
    jest.spyOn(Destination, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: destinationId, name: 'Maui' }]),
      }),
    });
    jest.spyOn(Payment, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ booking: bookingId, amount: 500, status: 'Pending' }]),
      }),
    });

    const response = await request(app)
      .get('/api/reports/customer-summary')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Booking.find).toHaveBeenCalledWith({ customer: customerId });
    expect(Payment.find).toHaveBeenCalledWith({ booking: { $in: [bookingId] } });
    expect(response.body.overview.totalBookings).toBe(1);
    expect(response.body.payments.pendingAmount).toBe(500);
    expect(response.body.recentBookings[0].destinationName).toBe('Maui');
    expect(response.body.recentBookings[0].leadTraveler).toBeUndefined();
  });
});

describe('Mongo-backed booking and payment persistence', () => {
  const customerId = new mongoose.Types.ObjectId();
  const packageId = new mongoose.Types.ObjectId();
  const destinationId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const token = jwt.sign(
    { id: customerId.toString(), email: 'persisted@test.com', role: 'CUSTOMER' },
    'travel-secret',
  );

  beforeEach(() => {
    mongoose.connection.readyState = 1;
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: customerId,
      email: 'persisted@test.com',
      role: 'CUSTOMER',
    });
  });

  it('persists bookings against existing Mongo catalog records and records payment as pending', async () => {
    jest.spyOn(TravelPackage, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: packageId,
        destination: destinationId,
        price: 125,
      }),
    });
    jest.spyOn(Destination, 'exists').mockResolvedValue({ _id: destinationId });
    const savedBooking = {
      _id: bookingId,
      customer: customerId,
      package: packageId,
      destination: destinationId,
      totalPrice: 250,
      status: 'Pending',
      paymentStatus: 'Pending',
      toObject() {
        return { ...this };
      },
    };
    jest.spyOn(Booking, 'create').mockResolvedValue(savedBooking);
    jest.spyOn(Payment, 'create').mockResolvedValue({});

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        package: packageId.toString(),
        travelDate: '2027-01-10',
        travelers: 2,
        leadTraveler: { name: 'Persisted Customer', email: 'persisted@test.com', phone: '+911234567890' },
        totalPrice: 1,
        customer: new mongoose.Types.ObjectId().toString(),
      });

    expect(response.status).toBe(201);
    expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: customerId,
      package: packageId,
      destination: destinationId,
      totalPrice: 250,
      status: 'Pending',
      paymentStatus: 'Pending',
      leadTraveler: { name: 'Persisted Customer', email: 'persisted@test.com', phone: '+911234567890' },
    }));
    expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
      booking: bookingId,
      amount: 250,
      status: 'Pending',
    }));
    expect(response.body.paymentNotice).toMatch(/no charge was made/i);
  });

  it('rejects malformed lead traveler details before writing a booking', async () => {
    const createBooking = jest.spyOn(Booking, 'create');
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        package: packageId.toString(),
        travelDate: '2027-01-10',
        travelers: 1,
        leadTraveler: { name: '', email: 'invalid', phone: '12' },
      });

    expect(response.status).toBe(400);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('returns the original booking for a repeated customer request ID', async () => {
    const existingBooking = {
      _id: bookingId,
      bookingId: 'BK-IDEMPOTENT',
      customer: customerId,
      clientRequestId: 'request-key-123456',
      toObject() {
        return { ...this };
      },
    };
    jest.spyOn(Booking, 'findOne').mockResolvedValue(existingBooking);
    const findPackage = jest.spyOn(TravelPackage, 'findById');
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        package: packageId.toString(),
        travelDate: '2027-01-10',
        travelers: 1,
        clientRequestId: 'request-key-123456',
      });

    expect(response.status).toBe(200);
    expect(response.body.bookingId).toBe('BK-IDEMPOTENT');
    expect(findPackage).not.toHaveBeenCalled();
  });

  it('rejects a package that is inactive or unavailable', async () => {
    jest.spyOn(TravelPackage, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: packageId,
        destination: destinationId,
        price: 125,
        isAvailable: false,
      }),
    });
    const destinationExists = jest.spyOn(Destination, 'exists');
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ package: packageId.toString(), travelDate: '2027-01-10', travelers: 1 });

    expect(response.status).toBe(409);
    expect(destinationExists).not.toHaveBeenCalled();
  });

  it('rejects demo catalog IDs rather than coercing or persisting them', async () => {
    const findPackage = jest.spyOn(TravelPackage, 'findById');
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ package: 'demo_package_1', travelDate: '2027-01-10', travelers: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/MongoDB catalog/);
    expect(findPackage).not.toHaveBeenCalled();
  });

  it('records only a pending payment using the persisted booking amount', async () => {
    jest.spyOn(Booking, 'findOne').mockResolvedValue({
      _id: bookingId,
      customer: customerId,
      totalPrice: 250,
    });
    jest.spyOn(Payment, 'findOne').mockResolvedValue(null);
    jest.spyOn(Payment, 'create').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      booking: bookingId,
      amount: 250,
      method: 'Not processed',
      status: 'Pending',
      toObject() {
        return { ...this };
      },
    });

    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ booking: bookingId.toString(), amount: 1, status: 'Paid' });

    expect(response.status).toBe(201);
    expect(Payment.create).toHaveBeenCalledWith({
      booking: bookingId,
      amount: 250,
      method: 'Not processed',
      status: 'Pending',
    });
    expect(response.body.status).toBe('Pending');
    expect(response.body.notice).toMatch(/no charge was made/i);
  });

  it('returns the existing payment when concurrent requests hit the unique booking constraint', async () => {
    jest.spyOn(Booking, 'findOne').mockResolvedValue({
      _id: bookingId,
      customer: customerId,
      totalPrice: 250,
      status: 'Pending',
      paymentStatus: 'Pending',
    });
    const existingPayment = {
      _id: new mongoose.Types.ObjectId(),
      booking: bookingId,
      amount: 250,
      method: 'Not processed',
      status: 'Pending',
      toObject() {
        return { ...this };
      },
    };
    jest.spyOn(Payment, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingPayment);
    jest.spyOn(Payment, 'create').mockRejectedValue(Object.assign(new Error('Duplicate payment'), { code: 11000 }));

    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ booking: bookingId.toString() });

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(String(existingPayment._id));
    expect(response.body.status).toBe('Pending');
  });

  it('rolls back a booking if its pending payment record cannot be saved', async () => {
    jest.spyOn(TravelPackage, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: packageId,
        destination: destinationId,
        price: 125,
      }),
    });
    jest.spyOn(Destination, 'exists').mockResolvedValue({ _id: destinationId });
    jest.spyOn(Booking, 'create').mockResolvedValue({
      _id: bookingId,
      totalPrice: 250,
      toObject() {
        return { ...this };
      },
    });
    jest.spyOn(Payment, 'create').mockRejectedValue(new Error('Payment storage unavailable'));
    const rollback = jest.spyOn(Booking, 'deleteOne').mockResolvedValue({ deletedCount: 1 });

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ package: packageId.toString(), travelDate: '2027-01-10', travelers: 2 });

    expect(response.status).toBe(500);
    expect(rollback).toHaveBeenCalledWith({ _id: bookingId });
  });

  it('persists cancellation requests only for the authenticated customer booking', async () => {
    jest.spyOn(Booking, 'findOne').mockResolvedValue({
      _id: bookingId,
      customer: customerId,
      status: 'Pending',
    });
    jest.spyOn(Cancellation, 'findOne').mockResolvedValue(null);
    jest.spyOn(Cancellation, 'create').mockImplementation(async (data) => data);

    const response = await request(app)
      .post('/api/cancellations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        booking: bookingId.toString(),
        customer: new mongoose.Types.ObjectId().toString(),
        reason: 'Change of plans',
        status: 'Approved',
      });

    expect(response.status).toBe(201);
    expect(Cancellation.create).toHaveBeenCalledWith({
      booking: bookingId,
      customer: customerId,
      reason: 'Change of plans',
      status: 'Pending',
    });
  });

  it('marks a Mongo booking cancelled when its cancellation is approved', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const adminToken = jwt.sign(
      { id: adminId.toString(), email: 'admin@test.com', role: 'ADMIN' },
      'travel-secret',
    );
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: adminId, role: 'ADMIN' });
    const cancellation = {
      _id: new mongoose.Types.ObjectId(),
      booking: bookingId,
      status: 'Pending',
      save: jest.fn().mockImplementation(function save() {
        return Promise.resolve(this);
      }),
    };
    jest.spyOn(Cancellation, 'findById').mockResolvedValue(cancellation);
    const updateBooking = jest.spyOn(Booking, 'findByIdAndUpdate').mockResolvedValue({});

    const response = await request(app)
      .put(`/api/cancellations/${cancellation._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved' });

    expect(response.status).toBe(200);
    expect(updateBooking).toHaveBeenCalledWith(
      bookingId,
      { status: 'Cancelled' },
      { runValidators: true },
    );
  });

  it('persists public registrations as customers in Mongo without exposing the password', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    const createdUser = {
      _id: customerId,
      name: 'Persisted Customer',
      email: 'persisted@test.com',
      role: 'CUSTOMER',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const createUser = jest.spyOn(User, 'create').mockResolvedValue(createdUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Persisted Customer',
        email: 'PERSISTED@test.com',
        password: 'secure-password',
        role: 'ADMIN',
      });

    expect(response.status).toBe(201);
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'persisted@test.com',
      role: 'CUSTOMER',
    }));
    expect(response.body.user.role).toBe('CUSTOMER');
    expect(response.body.user.password).toBeUndefined();
  });

  it('rejects invalid email addresses and short passwords before writing users', async () => {
    const findUser = jest.spyOn(User, 'findOne');
    const createUser = jest.spyOn(User, 'create');
    const invalidEmail = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Invalid', email: 'not-an-email', password: 'long-enough-password' });
    const shortPassword = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Invalid', email: 'valid@example.test', password: 'short' });

    expect(invalidEmail.status).toBe(400);
    expect(shortPassword.status).toBe(400);
    expect(findUser).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });
});

describe('Mongo-backed itinerary and service APIs', () => {
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const token = jwt.sign(
    { id: customerId.toString(), email: 'itinerary@test.com', role: 'CUSTOMER' },
    'travel-secret',
  );

  beforeEach(() => {
    mongoose.connection.readyState = 1;
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: customerId,
      email: 'itinerary@test.com',
      role: 'CUSTOMER',
    });
  });

  it('creates an itinerary only for a booking owned by the authenticated customer', async () => {
    jest.spyOn(Booking, 'findById').mockResolvedValue({ _id: bookingId, customer: customerId });
    const createItinerary = jest.spyOn(Itinerary, 'create').mockImplementation(async (data) => data);

    const response = await request(app)
      .post('/api/itineraries')
      .set('Authorization', `Bearer ${token}`)
      .send({ booking: bookingId.toString(), title: 'Weekend plan', days: [{ day: 1, plan: 'Arrive and explore' }] });

    expect(response.status).toBe(201);
    expect(createItinerary).toHaveBeenCalledWith({
      booking: bookingId,
      title: 'Weekend plan',
      days: [{ day: 1, plan: 'Arrive and explore' }],
    });
  });

  it('rejects malformed itinerary days', async () => {
    const createItinerary = jest.spyOn(Itinerary, 'create');
    const response = await request(app)
      .post('/api/itineraries')
      .set('Authorization', `Bearer ${token}`)
      .send({ booking: bookingId.toString(), title: 'Weekend plan', days: [null] });

    expect(response.status).toBe(400);
    expect(createItinerary).not.toHaveBeenCalled();
  });

  it('creates Mongo service records with the authenticated provider instead of a supplied owner', async () => {
    const providerId = new mongoose.Types.ObjectId();
    const providerToken = jwt.sign(
      { id: providerId.toString(), email: 'provider@test.com', role: 'SERVICE_PROVIDER' },
      'travel-secret',
    );
    User.findById.mockResolvedValue({ _id: providerId, email: 'provider@test.com', role: 'SERVICE_PROVIDER' });
    const createService = jest.spyOn(Service, 'create').mockImplementation(async (data) => data);

    const response = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ name: 'Hotel', type: 'Hotel', provider: customerId.toString() });

    expect(response.status).toBe(201);
    expect(createService).toHaveBeenCalledWith(expect.objectContaining({
      provider: providerId,
      name: 'Hotel',
      type: 'Hotel',
    }));
    expect(createService.mock.calls[0][0].provider).not.toBe(customerId.toString());
  });
});
