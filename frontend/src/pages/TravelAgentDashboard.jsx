import { useEffect, useState } from 'react';
import api from '../services/api';

export default function TravelAgentDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/reports/summary')
      .then((response) => {
        if (active) setReport(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load the travel summary.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeTravellers = report?.bookingsByDestination
    .reduce((total, item) => total + item.travelers, 0) || 0;

  return (
    <div className="dashboard-shell">
      <aside className="sidebar"><h3>Travel Agent</h3><ul><li>Reservations</li><li>Bookings</li><li>Itineraries</li><li>Reports</li></ul></aside>
      <section className="dashboard-content">
        {loading && <p className="empty-state">Loading travel summary...</p>}
        {error && <div className="alert error">{error}</div>}
        {report && !error && (
          <div className="card-grid three-col">
            <div className="stat-box"><span>Pending bookings</span><strong>{report.bookings.pending}</strong></div>
            <div className="stat-box"><span>Booked travellers</span><strong>{activeTravellers}</strong></div>
            <div className="stat-box"><span>Cancellation review</span><strong>{report.cancellations.pending}</strong></div>
          </div>
        )}
      </section>
    </div>
  );
}
