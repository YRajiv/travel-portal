import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import AdminCatalogManager from '../components/AdminCatalogManager';
import api from '../services/api';

export default function AdminDashboard() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api.get('/reports/summary')
      .then((response) => {
        if (active) setReport(response.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load the dashboard summary.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <h3>Admin Panel</h3>
        <ul>
          <li><a href="#admin-overview">Reports overview</a></li>
          <li><a href="#catalog-management">Destinations &amp; packages</a></li>
        </ul>
      </aside>
      <section className="dashboard-content">
        {loading && <p className="empty-state">Loading dashboard summary...</p>}
        {error && <div className="alert error">{error}</div>}
        {report && !error && (
          <>
            <div className="card-grid three-col" id="admin-overview">
              <div className="stat-box"><span>Total revenue</span><strong>₹{report.revenue.totalRevenue}</strong></div>
              <div className="stat-box"><span>Paid payments</span><strong>{report.revenue.paid}</strong></div>
              <div className="stat-box"><span>Pending payments</span><strong>{report.revenue.pending}</strong></div>
            </div>
            <div className="chart-box">
              <h3>Bookings by destination</h3>
              {report.bookingsByDestination.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={report.bookingsByDestination}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="destination" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalBookings" fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="empty-state">No booking records yet.</p>}
            </div>
          </>
        )}
        <AdminCatalogManager />
      </section>
    </div>
  );
}
