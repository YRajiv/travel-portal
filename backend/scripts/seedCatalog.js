require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Destination = require('../models/Destination');
const TravelPackage = require('../models/TravelPackage');

const catalog = [
  {
    destination: {
      name: 'Hyderabad',
      country: 'India',
      city: 'Hyderabad',
      location: 'Telangana, India',
      category: 'City & heritage',
      tag: 'City & heritage',
      description: 'Explore the Charminar, historic bazaars, and the food culture of the City of Pearls.',
      image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Charminar', 'Golconda Fort', 'Hussain Sagar'],
      bestTimeToVisit: 'October to February',
      estimatedCost: 18000,
      rating: 4.5,
      popularity: 82,
    },
    travelPackage: {
      name: 'Hyderabad Heritage & Food Trail',
      duration: 3,
      nights: 2,
      price: 12900,
      description: 'A guided introduction to Hyderabad’s landmarks, local cuisine, and old-city neighborhoods.',
      images: ['https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Two nights accommodation', 'Daily breakfast', 'Local heritage guide'],
      excludedServices: ['Flights', 'Personal expenses'],
      accommodation: 'Central 3-star hotel',
      transportation: 'Airport transfer and guided local transport',
      activities: ['Old city walking tour', 'Golconda Fort visit', 'Hyderabadi food tasting'],
      itinerary: [
        { day: 1, title: 'Arrival and old-city walk', description: 'Check in and explore the historic center.' },
        { day: 2, title: 'Fort and food trail', description: 'Visit Golconda Fort and sample regional cuisine.' },
        { day: 3, title: 'Lakefront and departure', description: 'Enjoy a relaxed morning before departure.' },
      ],
    },
  },
  {
    destination: {
      name: 'Goa',
      country: 'India',
      city: 'Panaji',
      location: 'Goa, India',
      category: 'Beach',
      tag: 'Beach',
      description: 'Find palm-lined beaches, Portuguese-era architecture, and laid-back coastal dining.',
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Old Goa churches', 'Fontainhas', 'Palolem Beach'],
      bestTimeToVisit: 'November to February',
      estimatedCost: 28000,
      rating: 4.7,
      popularity: 96,
    },
    travelPackage: {
      name: 'Goa Coast & Culture Escape',
      duration: 5,
      nights: 4,
      price: 23900,
      description: 'Balance a relaxed beach stay with a guided look at Goa’s heritage and coastal villages.',
      images: ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Four nights accommodation', 'Daily breakfast', 'North Goa heritage tour'],
      excludedServices: ['Flights', 'Water-sport activities'],
      accommodation: 'Beachside boutique hotel',
      transportation: 'Airport transfer and one guided day tour',
      activities: ['Old Goa churches', 'Panaji walking tour', 'Beach day'],
      itinerary: [
        { day: 1, title: 'Arrival and beach evening', description: 'Check in and settle in by the coast.' },
        { day: 2, title: 'Old Goa and Panaji', description: 'Explore heritage architecture and local markets.' },
        { day: 3, title: 'Coastal day', description: 'Enjoy a free day at the beach.' },
        { day: 4, title: 'Village and food experience', description: 'Discover local coastal life and cuisine.' },
        { day: 5, title: 'Departure', description: 'Check out after breakfast.' },
      ],
    },
  },
  {
    destination: {
      name: 'Manali',
      country: 'India',
      city: 'Manali',
      location: 'Himachal Pradesh, India',
      category: 'Mountains',
      tag: 'Mountains',
      description: 'A Himalayan retreat known for mountain scenery, cedar forests, and riverside villages.',
      image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Old Manali', 'Hadimba Temple', 'Solang Valley'],
      bestTimeToVisit: 'March to June and October to February',
      estimatedCost: 32000,
      rating: 4.6,
      popularity: 91,
    },
    travelPackage: {
      name: 'Manali Mountain Retreat',
      duration: 5,
      nights: 4,
      price: 26900,
      description: 'A mountain stay with local transfers, heritage stops, and time to explore the valley.',
      images: ['https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Four nights accommodation', 'Breakfast and dinner', 'Local sightseeing transfers'],
      excludedServices: ['Airfare', 'Adventure activity fees'],
      accommodation: 'Mountain-view guesthouse',
      transportation: 'Private local transfers',
      activities: ['Old Manali walk', 'Hadimba Temple visit', 'Solang Valley excursion'],
      itinerary: [
        { day: 1, title: 'Arrival in Manali', description: 'Check in and acclimatize.' },
        { day: 2, title: 'Manali heritage', description: 'Visit the old town and Hadimba Temple.' },
        { day: 3, title: 'Solang Valley', description: 'Explore the valley at your own pace.' },
        { day: 4, title: 'Leisure day', description: 'Enjoy a flexible day in the mountains.' },
        { day: 5, title: 'Departure', description: 'Check out after breakfast.' },
      ],
    },
  },
  {
    destination: {
      name: 'Kerala',
      country: 'India',
      city: 'Kochi',
      location: 'Kerala, India',
      category: 'Nature',
      tag: 'Nature',
      description: 'Discover backwaters, spice gardens, and the lush landscapes of southern India.',
      image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Fort Kochi', 'Alleppey backwaters', 'Munnar tea gardens'],
      bestTimeToVisit: 'September to March',
      estimatedCost: 36000,
      rating: 4.8,
      popularity: 94,
    },
    travelPackage: {
      name: 'Kerala Backwaters & Hills',
      duration: 6,
      nights: 5,
      price: 31900,
      description: 'Pair the culture of Kochi with the backwaters and hill country of Kerala.',
      images: ['https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Five nights accommodation', 'Daily breakfast', 'Backwater cruise'],
      excludedServices: ['Flights', 'Lunch and dinner'],
      accommodation: 'Heritage hotel and hill resort',
      transportation: 'Private intercity transfers',
      activities: ['Fort Kochi walk', 'Backwater cruise', 'Munnar tea garden visit'],
      itinerary: [
        { day: 1, title: 'Kochi arrival', description: 'Check in and explore Fort Kochi.' },
        { day: 2, title: 'Kochi heritage', description: 'Discover the waterfront and historic quarter.' },
        { day: 3, title: 'Backwaters', description: 'Travel to the backwaters for a cruise.' },
        { day: 4, title: 'Journey to Munnar', description: 'Enjoy the changing landscape on the way to the hills.' },
        { day: 5, title: 'Tea country', description: 'Visit tea gardens and scenic viewpoints.' },
        { day: 6, title: 'Departure', description: 'Check out and transfer for departure.' },
      ],
    },
  },
  {
    destination: {
      name: 'Jaipur',
      country: 'India',
      city: 'Jaipur',
      location: 'Rajasthan, India',
      category: 'Heritage',
      tag: 'Heritage',
      description: 'Explore the Pink City’s forts, palaces, artisan lanes, and royal-era architecture.',
      image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Amber Fort', 'Hawa Mahal', 'City Palace'],
      bestTimeToVisit: 'October to March',
      estimatedCost: 22000,
      rating: 4.7,
      popularity: 89,
    },
    travelPackage: {
      name: 'Jaipur Royal Heritage Weekend',
      duration: 3,
      nights: 2,
      price: 15900,
      description: 'A guided city break through Jaipur’s royal landmarks and traditional craft markets.',
      images: ['https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Two nights accommodation', 'Breakfast', 'Licensed city guide'],
      excludedServices: ['Flights', 'Monument entry tickets'],
      accommodation: 'Heritage-style city hotel',
      transportation: 'Private sightseeing transfer',
      activities: ['Amber Fort visit', 'Old city walk', 'Local craft market'],
      itinerary: [
        { day: 1, title: 'Arrival and Pink City', description: 'Check in and walk through the old city.' },
        { day: 2, title: 'Forts and palaces', description: 'Visit Amber Fort and the City Palace area.' },
        { day: 3, title: 'Departure', description: 'Enjoy breakfast before departure.' },
      ],
    },
  },
  {
    destination: {
      name: 'Ooty',
      country: 'India',
      city: 'Ooty',
      location: 'Tamil Nadu, India',
      category: 'Nature',
      tag: 'Nature',
      description: 'A cool-climate hill station surrounded by tea estates, gardens, and Nilgiri views.',
      image: 'https://images.unsplash.com/photo-1567157577867-2849f3a5f2e7?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1567157577867-2849f3a5f2e7?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Nilgiri Mountain Railway', 'Botanical Garden', 'Doddabetta Peak'],
      bestTimeToVisit: 'October to June',
      estimatedCost: 24000,
      rating: 4.5,
      popularity: 78,
    },
    travelPackage: {
      name: 'Ooty Tea Gardens & Nilgiri Rail',
      duration: 4,
      nights: 3,
      price: 18900,
      description: 'A relaxed hill-country break with tea gardens, viewpoints, and a heritage rail experience.',
      images: ['https://images.unsplash.com/photo-1567157577867-2849f3a5f2e7?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Three nights accommodation', 'Breakfast', 'Local sightseeing transfer'],
      excludedServices: ['Train tickets', 'Lunch and dinner'],
      accommodation: 'Hill-view hotel',
      transportation: 'Private local transfers',
      activities: ['Tea estate visit', 'Botanical Garden', 'Doddabetta viewpoint'],
      itinerary: [
        { day: 1, title: 'Arrival in Ooty', description: 'Check in and enjoy a quiet evening.' },
        { day: 2, title: 'Gardens and heritage rail', description: 'Explore the gardens and railway options.' },
        { day: 3, title: 'Tea country', description: 'Visit a tea estate and mountain viewpoint.' },
        { day: 4, title: 'Departure', description: 'Check out after breakfast.' },
      ],
    },
  },
  {
    destination: {
      name: 'Bali',
      country: 'Indonesia',
      city: 'Denpasar',
      location: 'Bali, Indonesia',
      category: 'Beach & culture',
      tag: 'Beach & culture',
      description: 'Experience island temples, rice terraces, and a vibrant coastal food scene.',
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Ubud', 'Tanah Lot', 'Tegallalang Rice Terraces'],
      bestTimeToVisit: 'April to October',
      estimatedCost: 65000,
      rating: 4.8,
      popularity: 99,
    },
    travelPackage: {
      name: 'Bali Island & Ubud Discovery',
      duration: 6,
      nights: 5,
      price: 58900,
      description: 'Combine Ubud’s cultural center with Bali’s coastal scenery and temple visits.',
      images: ['https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Five nights accommodation', 'Daily breakfast', 'Selected private transfers'],
      excludedServices: ['International airfare', 'Travel insurance'],
      accommodation: 'Ubud boutique stay and coastal hotel',
      transportation: 'Airport pickup and selected private transfers',
      activities: ['Ubud market visit', 'Rice terrace viewpoint', 'Temple visit'],
      itinerary: [
        { day: 1, title: 'Arrival in Bali', description: 'Transfer to Ubud and settle in.' },
        { day: 2, title: 'Ubud discovery', description: 'Explore local markets and cultural sites.' },
        { day: 3, title: 'Rice terraces', description: 'Visit the highland terraces and nearby villages.' },
        { day: 4, title: 'Coastal transfer', description: 'Move to the coast and enjoy free time.' },
        { day: 5, title: 'Temple and sunset', description: 'Visit a coastal temple and enjoy the evening.' },
        { day: 6, title: 'Departure', description: 'Transfer to the airport.' },
      ],
    },
  },
  {
    destination: {
      name: 'Dubai',
      country: 'United Arab Emirates',
      city: 'Dubai',
      location: 'Dubai, United Arab Emirates',
      category: 'City',
      tag: 'City',
      description: 'A modern city break of architecture, waterfront districts, and desert landscapes.',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Burj Khalifa', 'Al Fahidi Historic District', 'Dubai Creek'],
      bestTimeToVisit: 'November to March',
      estimatedCost: 78000,
      rating: 4.6,
      popularity: 93,
    },
    travelPackage: {
      name: 'Dubai City & Desert Highlights',
      duration: 5,
      nights: 4,
      price: 72900,
      description: 'See the city’s modern landmarks, historic creek district, and desert surroundings.',
      images: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Four nights accommodation', 'Breakfast', 'Airport transfers'],
      excludedServices: ['International airfare', 'Optional attraction tickets'],
      accommodation: 'Downtown 4-star hotel',
      transportation: 'Airport transfers and scheduled city transport',
      activities: ['Creek district walk', 'Modern Dubai tour', 'Optional desert excursion'],
      itinerary: [
        { day: 1, title: 'Arrival', description: 'Transfer to the hotel and settle in.' },
        { day: 2, title: 'Historic Dubai', description: 'Explore the creek and historic quarter.' },
        { day: 3, title: 'Modern landmarks', description: 'Discover the city’s contemporary districts.' },
        { day: 4, title: 'Flexible day', description: 'Choose a museum, beach, or optional excursion.' },
        { day: 5, title: 'Departure', description: 'Check out and transfer to the airport.' },
      ],
    },
  },
  {
    destination: {
      name: 'Singapore',
      country: 'Singapore',
      city: 'Singapore',
      location: 'Singapore',
      category: 'City',
      tag: 'City',
      description: 'Discover a compact city of waterfront gardens, diverse neighborhoods, and celebrated food.',
      image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Gardens by the Bay', 'Chinatown', 'Marina Bay'],
      bestTimeToVisit: 'February to April',
      estimatedCost: 85000,
      rating: 4.7,
      popularity: 90,
    },
    travelPackage: {
      name: 'Singapore Gardens & Neighbourhoods',
      duration: 4,
      nights: 3,
      price: 78900,
      description: 'A city stay focused on gardens, neighborhood walks, and Singapore’s food culture.',
      images: ['https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Three nights accommodation', 'Breakfast', 'Airport transfers'],
      excludedServices: ['Flights', 'Attraction entry tickets'],
      accommodation: 'Central 4-star hotel',
      transportation: 'Airport transfers; city transit at own expense',
      activities: ['Marina Bay walk', 'Gardens by the Bay', 'Chinatown food trail'],
      itinerary: [
        { day: 1, title: 'Arrival and Marina Bay', description: 'Check in and take an evening waterfront walk.' },
        { day: 2, title: 'Gardens and city', description: 'Explore the gardens and surrounding district.' },
        { day: 3, title: 'Neighborhood discovery', description: 'Visit Chinatown and local food markets.' },
        { day: 4, title: 'Departure', description: 'Check out and transfer to the airport.' },
      ],
    },
  },
  {
    destination: {
      name: 'Paris',
      country: 'France',
      city: 'Paris',
      location: 'Île-de-France, France',
      category: 'Culture & city',
      tag: 'Culture & city',
      description: 'Spend time among celebrated museums, riverside walks, and distinctive city neighborhoods.',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85',
      images: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85'],
      attractions: ['Eiffel Tower', 'Louvre Museum', 'Montmartre'],
      bestTimeToVisit: 'April to June and September to October',
      estimatedCost: 145000,
      rating: 4.8,
      popularity: 97,
    },
    travelPackage: {
      name: 'Paris Neighbourhoods & Museums',
      duration: 5,
      nights: 4,
      price: 132000,
      description: 'A flexible Paris stay with guided neighborhood discovery and time for museums.',
      images: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85'],
      includedServices: ['Four nights accommodation', 'Breakfast', 'Half-day guided city walk'],
      excludedServices: ['International airfare', 'Museum tickets'],
      accommodation: 'Central 3-star hotel',
      transportation: 'Airport transfer; public transit pass not included',
      activities: ['Historic center walk', 'Montmartre visit', 'Seine riverside'],
      itinerary: [
        { day: 1, title: 'Arrival', description: 'Check in and enjoy a neighborhood walk.' },
        { day: 2, title: 'Historic Paris', description: 'Explore the city center with a local guide.' },
        { day: 3, title: 'Museums and gardens', description: 'Choose a museum and nearby garden.' },
        { day: 4, title: 'Montmartre', description: 'Discover the hilltop neighborhood and cafés.' },
        { day: 5, title: 'Departure', description: 'Check out and travel to the airport.' },
      ],
    },
  },
];

async function findExistingDestination(destination) {
  return Destination.findOne({ name: destination.name, country: destination.country });
}

async function seedCatalog() {
  if (!process.env.MONGO_URI) {
    throw new Error('Set MONGO_URI explicitly before running the catalog seed command.');
  }
  const connected = await connectDB();
  if (!connected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is unavailable; no catalog records were written.');
  }

  let destinationsCreated = 0;
  let packagesCreated = 0;
  for (const entry of catalog) {
    let destination = await findExistingDestination(entry.destination);
    if (!destination) {
      destination = await Destination.create({ ...entry.destination, isActive: true });
      destinationsCreated += 1;
    }

    const existingPackage = await TravelPackage.findOne({
      name: entry.travelPackage.name,
      destination: destination._id,
    });
    if (!existingPackage) {
      await TravelPackage.create({
        ...entry.travelPackage,
        destination: destination._id,
        destinationName: destination.name,
        isActive: true,
        isAvailable: true,
      });
      packagesCreated += 1;
    }
  }

  return { destinationsCreated, packagesCreated, catalogEntries: catalog.length };
}

if (require.main === module) {
  seedCatalog()
    .then((result) => {
      console.log(`Catalog seed complete: ${result.destinationsCreated} destinations and ${result.packagesCreated} packages inserted; existing records were left unchanged.`);
    })
    .catch((error) => {
      console.error(`Catalog seed failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { seedCatalog, catalog };
