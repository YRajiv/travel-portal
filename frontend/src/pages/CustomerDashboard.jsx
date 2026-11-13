import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  CreditCard,
  MapPin,
  PlaneTakeoff,
  RefreshCw,
  Ticket,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function getCollection(result, label) {
  if (result.status === 'rejected') {
    return {
      items: [],
      error: result.reason?.response?.data?.message || `Unable to load ${label}.`,
    };
  }

  if (!Array.isArray(result.value.data)) {
    return { items: [], error: `The ${label} response was invalid. Please try again.` };
  }

  return { items: result.value.data, error: '' };
}

function getDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = getDate(value);
  return date ? dateFormatter.format(date) : 'Date to be confirmed';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getStatusClass(status) {
  return String(status || 'Pending').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [today] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [greeting] = useState(getGreeting);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [errors, setErrors] = useState({ bookings: '', payments: '', destinations: '' });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      api.get('/bookings'),
      api.get('/payments'),
      api.get('/destinations'),
    ]).then(([bookingResult, paymentResult, destinationResult]) => {
      if (!active) return;

      const bookingCollection = getCollection(bookingResult, 'your trips');
      const paymentCollection = getCollection(paymentResult, 'payment activity');
      const destinationCollection = getCollection(destinationResult, 'destinations');

      setBookings(bookingCollection.items);
      setPayments(paymentCollection.items);
      setDestinations(destinationCollection.items);
      setErrors({
        bookings: bookingCollection.error,
        payments: paymentCollection.error,
        destinations: destinationCollection.error,
      });
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const upcomingBookings = bookings
    .filter((booking) => {
      const travelDate = getDate(booking.travelDate);
      return !['cancelled', 'completed'].includes(String(booking.status).toLowerCase())
        && travelDate
        && travelDate >= today;
    })
    .sort((a, b) => getDate(a.travelDate) - getDate(b.travelDate));
  const recentBookings = [...bookings]
    .sort((a, b) => (
      (getDate(b.createdAt || b.travelDate)?.getTime() || 0)
      - (getDate(a.createdAt || a.travelDate)?.getTime() || 0)
    ))
    .slice(0, 4);
  const totalSpent = payments
    .filter((payment) => payment.status === 'Paid')
    .reduce((total, payment) => {
      const amount = Number(payment.amount);
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  const pendingPayments = payments.filter((payment) => payment.status === 'Pending').length;
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'traveler';
  const initials = (user?.name || 'Traveler')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const firstUpcoming = upcomingBookings[0];
  const dashboardHasErrors = errors.bookings || errors.payments;

  const retryLoading = () => {
    setLoading(true);
    setErrors({ bookings: '', payments: '', destinations: '' });
    setRefreshKey((key) => key + 1);
  };

  const metrics = [
    {
      label: 'Upcoming trips',
      value: errors.bookings ? '—' : upcomingBookings.length,
      note: 'Ready for your next adventure',
      icon: CalendarDays,
      accent: 'green',
    },
    {
      label: 'All bookings',
      value: errors.bookings ? '—' : bookings.length,
      note: 'Your complete travel history',
      icon: Ticket,
      accent: 'blue',
    },
    {
      label: 'Paid to date',
      value: errors.payments ? '—' : currencyFormatter.format(totalSpent),
      note: 'Based on recorded payments',
      icon: Wallet,
      accent: 'gold',
    },
    {
      label: 'Payments pending',
      value: errors.payments ? '—' : pendingPayments,
      note: 'No charges are processed here',
      icon: CreditCard,
      accent: 'violet',
    },
  ];

  return (
    <div className="customer-dashboard">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <p className="dashboard-eyebrow"><Compass size={15} /> YOUR PERSONAL TRAVEL HUB</p>
          <h1>{greeting}, {firstName}.</h1>
          <p className="dashboard-welcome-text">
            Keep your plans together, follow your bookings, and find inspiration for your next trip.
          </p>
          <div className="dashboard-welcome-actions">
            <Link className="btn dashboard-welcome-primary" to="/destinations">
              Explore destinations <ArrowRight size={16} />
            </Link>
            <Link className="dashboard-welcome-secondary" to="/booking-history">
              View my trips
            </Link>
          </div>
        </div>
        <div className="dashboard-profile-card">
          <div className="dashboard-avatar" aria-hidden="true">{initials}</div>
          <div>
            <span>YOUR TRAVEL STATUS</span>
            <strong>
              {errors.bookings ? 'Trips unavailable' : `${upcomingBookings.length} upcoming ${upcomingBookings.length === 1 ? 'trip' : 'trips'}`}
            </strong>
            <small>
              {errors.bookings ? 'Refresh to check your latest plans' : 'Your plans update with your bookings'}
            </small>
          </div>
          <PlaneTakeoff className="dashboard-profile-plane" size={27} aria-hidden="true" />
        </div>
      </section>

      <nav className="customer-dashboard-links" aria-label="Travel account">
        <Link to="/booking-history"><Ticket size={17} /> My trips <ChevronRight size={16} /></Link>
        <Link to="/itineraries"><MapPin size={17} /> Itineraries <ChevronRight size={16} /></Link>
        <Link to="/payments"><CreditCard size={17} /> Payments <ChevronRight size={16} /></Link>
        <Link to="/booking-history"><Clock3 size={17} /> Cancellations <ChevronRight size={16} /></Link>
        <Link to="/services"><BriefcaseBusiness size={17} /> Services <ChevronRight size={16} /></Link>
        <Link to="/customer-reports"><BarChart3 size={17} /> Reports <ChevronRight size={16} /></Link>
      </nav>

      {dashboardHasErrors && (
        <div className="alert error dashboard-alert" role="alert">
          <div>
            <strong>Some dashboard information could not be loaded.</strong>
            <span>{[errors.bookings, errors.payments].filter(Boolean).join(' ')}</span>
          </div>
          <button className="btn btn-light" onClick={retryLoading} type="button">
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading" role="status" aria-label="Loading dashboard">
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : (
        <>
          <section className="dashboard-metrics" aria-label="Travel summary">
            {metrics.map(({ label, value, note, icon: Icon, accent }) => (
              <article className="dashboard-metric" key={label}>
                <div className={`dashboard-metric-icon ${accent}`}><Icon size={19} /></div>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </article>
            ))}
          </section>

          <div className="dashboard-feature-grid">
            <section className="dashboard-panel dashboard-next-trip">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="dashboard-panel-kicker">TRIP PLANNER</p>
                  <h2>{firstUpcoming ? 'Your next trip' : 'Your next trip starts here'}</h2>
                </div>
                <Link to="/booking-history">All trips <ArrowRight size={15} /></Link>
              </div>

              {firstUpcoming ? (
                <article className="dashboard-trip-card">
                  {firstUpcoming.destinationImage ? (
                    <img
                      className="dashboard-trip-image"
                      src={firstUpcoming.destinationImage}
                      alt={firstUpcoming.destinationName || 'Your destination'}
                    />
                  ) : (
                    <div className="dashboard-trip-image dashboard-trip-placeholder">
                      <PlaneTakeoff size={32} />
                    </div>
                  )}
                  <div className="dashboard-trip-details">
                    <div className="dashboard-trip-tags">
                      <span className={`dashboard-status ${getStatusClass(firstUpcoming.status)}`}>
                        {firstUpcoming.status || 'Pending'}
                      </span>
                      <span>{firstUpcoming.bookingId || 'Booking reference pending'}</span>
                    </div>
                    <h3>{firstUpcoming.destinationName || firstUpcoming.packageName || 'Your booked trip'}</h3>
                    <p className="dashboard-trip-package">{firstUpcoming.packageName || 'Travel package'}</p>
                    <div className="dashboard-trip-meta">
                      <span><CalendarDays size={15} /> {formatDate(firstUpcoming.travelDate)}</span>
                      <span><Ticket size={15} /> {firstUpcoming.travelers || 1} {Number(firstUpcoming.travelers) === 1 ? 'traveler' : 'travelers'}</span>
                    </div>
                    <div className="dashboard-trip-footer">
                      <strong>{currencyFormatter.format(Number(firstUpcoming.totalPrice) || 0)}</strong>
                      <Link to="/booking-history">Manage booking <ArrowRight size={15} /></Link>
                    </div>
                  </div>
                </article>
              ) : (
                <div className="dashboard-next-empty">
                  <div className="dashboard-empty-icon"><PlaneTakeoff size={25} /></div>
                  <div>
                    <h3>{errors.bookings ? 'Your trip details are temporarily unavailable' : 'No upcoming trips booked'}</h3>
                    <p>
                      {errors.bookings
                        ? 'We could not retrieve your bookings. Try refreshing the dashboard.'
                        : 'When you book a trip, its destination, dates, and status will appear here.'}
                    </p>
                    {!errors.bookings && (
                      <Link className="dashboard-inline-link" to="/destinations">
                        Find your next destination <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </section>

            <aside className="dashboard-panel dashboard-planner">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="dashboard-panel-kicker">A SIMPLE WAY TO START</p>
                  <h2>Plan your getaway</h2>
                </div>
                <Compass size={21} />
              </div>
              <Link className="dashboard-plan-step" to="/destinations">
                <span>01</span>
                <div><strong>Choose a destination</strong><small>Explore places worth discovering</small></div>
                <ChevronRight size={17} />
              </Link>
              <Link className="dashboard-plan-step" to="/packages">
                <span>02</span>
                <div><strong>Find your package</strong><small>Compare available travel options</small></div>
                <ChevronRight size={17} />
              </Link>
              <Link className="dashboard-plan-step" to={bookings.length ? '/itineraries' : '/packages'}>
                <span>03</span>
                <div>
                  <strong>{bookings.length ? 'Build your itinerary' : 'Book your next trip'}</strong>
                  <small>{bookings.length ? 'Keep trip details in one place' : 'Choose a package to get started'}</small>
                </div>
                <ChevronRight size={17} />
              </Link>
              <p className="dashboard-planner-note"><CheckCircle2 size={15} /> Your booking details stay linked to your account.</p>
            </aside>
          </div>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-panel-kicker">FIND SOME INSPIRATION</p>
                <h2>Places to explore</h2>
              </div>
              <Link to="/destinations">Browse destinations <ArrowRight size={15} /></Link>
            </div>
            {errors.destinations ? (
              <div className="dashboard-discovery-empty">
                <Compass size={22} />
                <div><h3>Destination picks are unavailable</h3><p>{errors.destinations}</p></div>
                <button className="dashboard-inline-link" onClick={retryLoading} type="button">Refresh <RefreshCw size={14} /></button>
              </div>
            ) : destinations.length ? (
              <div className="dashboard-destination-grid">
                {destinations.slice(0, 3).map((destination) => (
                  <Link className="dashboard-destination-card" key={destination._id} to={`/destinations/${destination._id}`}>
                    {destination.image ? (
                      <img src={destination.image} alt={destination.name} loading="lazy" />
                    ) : (
                      <div className="dashboard-destination-placeholder"><MapPin size={25} /></div>
                    )}
                    <div>
                      <span>{destination.country || destination.tag || 'Explore destination'}</span>
                      <h3>{destination.name}</h3>
                      <span className="dashboard-destination-link">Discover more <ArrowRight size={14} /></span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard-discovery-empty">
                <Compass size={22} />
                <div>
                  <h3>New places are on the way</h3>
                  <p>Browse the destination catalog to see the latest places available for booking.</p>
                </div>
                <Link className="dashboard-inline-link" to="/destinations">Explore destinations <ArrowRight size={15} /></Link>
              </div>
            )}
          </section>

          <section className="dashboard-section dashboard-recent-section">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-panel-kicker">YOUR ACCOUNT</p>
                <h2>Recent booking activity</h2>
              </div>
              <Link to="/booking-history">Booking history <ArrowRight size={15} /></Link>
            </div>
            {errors.bookings ? (
              <div className="dashboard-activity-empty">Booking activity is unavailable until your trip data can be loaded.</div>
            ) : recentBookings.length ? (
              <div className="dashboard-activity-list">
                {recentBookings.map((booking) => (
                  <article className="dashboard-activity-row" key={booking._id}>
                    <div className="dashboard-activity-icon"><Ticket size={17} /></div>
                    <div className="dashboard-activity-name">
                      <strong>{booking.destinationName || booking.packageName || 'Travel booking'}</strong>
                      <span>{booking.bookingId || 'Booking reference pending'} · Travel date {formatDate(booking.travelDate)}</span>
                    </div>
                    <span className={`dashboard-status ${getStatusClass(booking.status)}`}>{booking.status || 'Pending'}</span>
                    <strong className="dashboard-activity-price">
                      {currencyFormatter.format(Number(booking.totalPrice) || 0)}
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-activity-empty">
                <div className="dashboard-empty-icon"><Ticket size={22} /></div>
                <div>
                  <h3>Your booking activity will appear here</h3>
                  <p>Once you make a booking, you can review its status and travel details from this dashboard.</p>
                </div>
                <Link className="dashboard-inline-link" to="/packages">View packages <ArrowRight size={15} /></Link>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
