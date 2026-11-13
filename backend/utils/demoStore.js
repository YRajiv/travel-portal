const bcrypt = require('bcryptjs');

const demoStore = {
  users: [],
  destinations: [],
  travelPackages: [],
  bookings: [],
  services: [],
  itineraries: [],
  cancellations: [],
  payments: [],
};

const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const seedDemoData = async () => {
  if (demoStore.users.length) return demoStore;

  const passwordHash = await bcrypt.hash('admin123', 10);
  const agentHash = await bcrypt.hash('agent123', 10);
  const customerHash = await bcrypt.hash('customer123', 10);
  const providerHash = await bcrypt.hash('provider123', 10);

  demoStore.users = [
    { _id: makeId('user'), name: 'System Admin', email: 'admin@travelportal.com', password: passwordHash, role: 'ADMIN', createdAt: new Date().toISOString() },
    { _id: makeId('user'), name: 'Riya Agent', email: 'agent@travelportal.com', password: agentHash, role: 'TRAVEL_AGENT', createdAt: new Date().toISOString() },
    { _id: makeId('user'), name: 'Aarav Customer', email: 'customer@travelportal.com', password: customerHash, role: 'CUSTOMER', createdAt: new Date().toISOString() },
    { _id: makeId('user'), name: 'Harsh Provider', email: 'provider@travelportal.com', password: providerHash, role: 'SERVICE_PROVIDER', createdAt: new Date().toISOString() },
  ];

  demoStore.destinations = [
    { _id: makeId('destination'), name: 'Bali', country: 'Indonesia', tag: 'Beach escape', description: 'Tropical island with serene beaches, lush rice terraces, and vibrant culture.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', rating: 4.8 },
    { _id: makeId('destination'), name: 'Paris', country: 'France', tag: 'City romance', description: 'Historic landmarks, boutique cafés, and elegant culture across iconic boulevards.', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', rating: 4.9 },
    { _id: makeId('destination'), name: 'Kyoto', country: 'Japan', tag: 'Cultural retreat', description: 'Sacred temples, scenic trails, and unforgettable seasonal beauty.', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80', rating: 4.7 },
  ];

  demoStore.travelPackages = [
    { _id: makeId('package'), name: 'Bali Bliss Escape', destination: demoStore.destinations[0]._id, destinationName: 'Bali', duration: 5, price: 599, description: 'Beach resort, island tour, and spa retreat package.', images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'] },
    { _id: makeId('package'), name: 'Paris Romance Week', destination: demoStore.destinations[1]._id, destinationName: 'Paris', duration: 4, price: 749, description: 'A romantic city break with museum passes and Seine cruise.', images: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80'] },
    { _id: makeId('package'), name: 'Kyoto Heritage Trail', destination: demoStore.destinations[2]._id, destinationName: 'Kyoto', duration: 6, price: 699, description: 'Temple visits, tea ceremonies, and scenic hikes in Japan.', images: ['https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80'] },
  ];

  demoStore.services = [
    { _id: makeId('service'), provider: demoStore.users[3]._id, name: 'Horizon Hotel', type: 'Hotel', location: 'Bali', availability: 'Available', price: 120 },
    { _id: makeId('service'), provider: demoStore.users[3]._id, name: 'Skyline Transfers', type: 'Transport', location: 'Paris', availability: 'Available', price: 80 },
    { _id: makeId('service'), provider: demoStore.users[3]._id, name: 'Kyoto Adventure Trails', type: 'Activity', location: 'Kyoto', availability: 'Limited', price: 65 },
  ];

  demoStore.bookings = [
    { _id: makeId('booking'), bookingId: 'BK-1001', customer: demoStore.users[2]._id, package: demoStore.travelPackages[0]._id, destination: demoStore.destinations[0]._id, travelDate: '2026-02-10', travelers: 2, totalPrice: 1198, status: 'Paid', paymentStatus: 'Paid' },
    { _id: makeId('booking'), bookingId: 'BK-1002', customer: demoStore.users[2]._id, package: demoStore.travelPackages[1]._id, destination: demoStore.destinations[1]._id, travelDate: '2026-04-15', travelers: 2, totalPrice: 1498, status: 'Pending', paymentStatus: 'Pending' },
  ];

  demoStore.itineraries = [
    { _id: makeId('itinerary'), booking: demoStore.bookings[0]._id, title: 'Bali Escape Itinerary', days: [{ day: 1, plan: 'Arrival, beach resort check-in and sunset dinner.' }, { day: 2, plan: 'Ubud rice terraces and temple visit.' }, { day: 3, plan: 'Snorkeling and island hopping adventure.' }] },
  ];

  demoStore.payments = [
    { _id: makeId('payment'), booking: demoStore.bookings[0]._id, amount: 1198, status: 'Paid', method: 'Card' },
    { _id: makeId('payment'), booking: demoStore.bookings[1]._id, amount: 1498, status: 'Pending', method: 'Card' },
  ];

  demoStore.cancellations = [
    { _id: makeId('cancellation'), booking: demoStore.bookings[1]._id, customer: demoStore.users[2]._id, status: 'Pending', reason: 'Unexpected schedule change' },
  ];

  return demoStore;
};

module.exports = { demoStore, seedDemoData, makeId };
