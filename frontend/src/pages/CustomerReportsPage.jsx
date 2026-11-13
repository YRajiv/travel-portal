import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  Ticket,
  UsersRound,
} from 'lucide-react';
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

const updatedFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
});

function formatDate(value) {
  if (!value) return 'Date to be confirmed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date to be confirmed' : dateFormatter.format(date);
}

function statusClass(status) {
  return String(status || 'Pending').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function CustomerReportsPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    let requestPending = false;

    const loadReport = async () => {
      if (requestPending) return;
      requestPending = true;
      try {
        const response = await api.get('/reports/customer-summary');
        if (active) {
          setReport(response.data);
          setError('');
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load your travel reports.');
        }
      } finally {
        requestPending = false;
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadReport();
    const intervalId = window.setInterval(loadReport, 30_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  const refreshReport = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  if (loading && !report) {
    return <div className="page-section"><p className="empty-state" role="status">Loading your travel reports...</p></div>;
  }

  if (error && !report) {
    return (
      <div className="page-section">
        <div className="section-header"><h1>Your travel reports</h1></div>
        <div className="alert error" role="alert">{error}</div>
        <button className="btn btn-light" onClick={refreshReport} type="button">
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }

  const { overview, payments, bookingsByDestination, recentBookings, generatedAt } = report;
  const metrics = [
    { label: 'All bookings', value: overview.totalBookings, icon: Ticket, accent: 'blue' },
    { label: 'Upcoming trips', value: overview.upcomingTrips, icon: CalendarDays, accent: 'green' },
    { label: 'Travelers booked', value: overview.totalTravelers, icon: UsersRound, accent: 'gold' },
    { label: 'Paid to date', value: currencyFormatter.format(payments.paidAmount), icon: CircleDollarSign, accent: 'violet' },
  ];

  return (
    <div className="customer-reports-page">
      <section className="customer-reports-header">
        <div>
          <p className="dashboard-panel-kicker"><BarChart3 size={15} /> YOUR TRAVEL ACTIVITY</p>
          <h1>Your travel reports</h1>
          <p>Booking and payment summaries from your account, refreshed automatically every 30 seconds.</p>
        </div>
        <div className="customer-reports-refresh">
          <span><Clock3 size={14} /> Updated {generatedAt ? updatedFormatter.format(new Date(generatedAt)) : 'just now'}</span>
          <button className="btn btn-light" onClick={refreshReport} type="button" disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'is-spinning' : ''} />
            {refreshing ? 'Updating...' : 'Refresh now'}
          </button>
        </div>
      </section>

      {error && <div className="alert error" role="status">Could not refresh the latest report. Showing the last loaded data. {error}</div>}

      <section className="dashboard-metrics customer-report-metrics" aria-label="Your travel report summary">
        {metrics.map(({ label, value, icon: Icon, accent }) => (
          <article className="dashboard-metric" key={label}>
            <div className={`dashboard-metric-icon ${accent}`}><Icon size={19} /></div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Based on your saved account records</small>
          </article>
        ))}
      </section>

      <div className="customer-report-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-panel-kicker">BOOKING BREAKDOWN</p>
              <h2>Trips by destination</h2>
            </div>
            <BarChart3 size={20} />
          </div>
          {bookingsByDestination.length ? (
            <div className="customer-report-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bookingsByDestination} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="destination" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="totalBookings" name="Bookings" fill="#14785d" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="customer-report-empty">
              <Ticket size={21} />
              <p>No booking records yet. Your destination report will appear after your first booking.</p>
            </div>
          )}
        </section>

        <section className="dashboard-panel customer-payment-summary">
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-panel-kicker">PAYMENT ACTIVITY</p>
              <h2>Your payment summary</h2>
            </div>
            <CircleDollarSign size={20} />
          </div>
          <div className="customer-payment-row"><span>Paid payments</span><strong>{payments.paid}</strong></div>
          <div className="customer-payment-row"><span>Pending payments</span><strong>{payments.pending}</strong></div>
          <div className="customer-payment-row"><span>Refunded payments</span><strong>{payments.refunded}</strong></div>
          <div className="customer-payment-total">
            <span>Total paid</span><strong>{currencyFormatter.format(payments.paidAmount)}</strong>
          </div>
          <p className="customer-report-note">This report reflects recorded payment status; no payment is processed here.</p>
        </section>
      </div>

      <section className="dashboard-section customer-report-recent">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-panel-kicker">LATEST ACCOUNT ACTIVITY</p>
            <h2>Recent bookings</h2>
          </div>
        </div>
        {recentBookings.length ? (
          <div className="dashboard-activity-list">
            {recentBookings.map((booking) => (
              <article className="dashboard-activity-row" key={booking.bookingId}>
                <div className="dashboard-activity-icon"><Ticket size={17} /></div>
                <div className="dashboard-activity-name">
                  <strong>{booking.destinationName}</strong>
                  <span>{booking.packageName} · Travel date {formatDate(booking.travelDate)}</span>
                </div>
                <span className={`dashboard-status ${statusClass(booking.status)}`}>{booking.status}</span>
                <strong className="dashboard-activity-price">{currencyFormatter.format(booking.totalPrice)}</strong>
              </article>
            ))}
          </div>
        ) : (
          <div className="customer-report-empty">
            <Ticket size={21} />
            <p>Your recent bookings will appear here once they are saved to your account.</p>
          </div>
        )}
      </section>
    </div>
  );
}
