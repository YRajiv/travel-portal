import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const COLORS = ['#0f766e', '#0ea5e9', '#f59e0b'];

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    api.get('/reports/summary')
      .then((response) => {
        if (active) setReport(response.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load reports. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const refreshReports = () => {
    setError('');
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  if (loading) {
    return <div className="page-section"><p className="empty-state">Loading reports...</p></div>;
  }

  if (error) {
    return (
      <div className="page-section">
        <div className="section-header"><h2>Reports and analytics</h2></div>
        <div className="alert error">{error}</div>
        <button className="btn btn-light" onClick={refreshReports}>Try again</button>
      </div>
    );
  }

  const pieData = [
    { name: 'Paid', value: report.revenue.paid },
    { name: 'Pending', value: report.revenue.pending },
    { name: 'Refunded', value: report.revenue.refunded },
  ];

  return (
    <div className="page-section">
      <div className="section-header">
        <h2>Reports and analytics</h2>
        <button className="btn btn-light" onClick={refreshReports} type="button">Refresh reports</button>
      </div>
      <div className="card-grid three-col">
        <div className="stat-box"><span>Total bookings</span><strong>{report.bookings.total}</strong></div>
        <div className="stat-box"><span>Confirmed bookings</span><strong>{report.bookings.confirmed}</strong></div>
        <div className="stat-box"><span>Cancelled bookings</span><strong>{report.bookings.cancelled}</strong></div>
        <div className="stat-box"><span>Pending bookings</span><strong>{report.bookings.pending}</strong></div>
        <div className="stat-box"><span>Total paid revenue</span><strong>₹{report.revenue.totalRevenue}</strong></div>
        <div className="stat-box"><span>Total cancellations</span><strong>{report.cancellations.total}</strong></div>
        <div className="stat-box"><span>Approved cancellations</span><strong>{report.cancellations.approved}</strong></div>
      </div>
      <div className="chart-row">
        <div className="chart-box">
          <h3>Bookings by Destination</h3>
          {report.bookingsByDestination.length ? (
            <ResponsiveContainer width="100%" height={250}>
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
        <div className="chart-box">
          <h3>Payment summary</h3>
          {pieData.some((entry) => entry.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={35} fill="#0f766e" label>
                  {pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No payment records yet.</p>}
        </div>
      </div>
    </div>
  );
}
