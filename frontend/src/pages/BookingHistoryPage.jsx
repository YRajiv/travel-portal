import { useEffect, useState } from 'react';
import api from '../services/api';

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [cancellations, setCancellations] = useState({});
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/bookings'), api.get('/cancellations')])
      .then(([bookingResponse, cancellationResponse]) => {
        setBookings(bookingResponse.data);
        setCancellations(Object.fromEntries(cancellationResponse.data.map((item) => [item.booking, item])));
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load booking history.'))
      .finally(() => setLoading(false));
  }, []);

  const requestCancellation = async (booking) => {
    setError('');
    setCancellingId(booking._id);
    try {
      const response = await api.post('/cancellations', {
        booking: booking._id,
        reason: 'Customer requested cancellation',
      });
      setCancellations((previous) => ({ ...previous, [booking._id]: response.data }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to request cancellation.');
    } finally {
      setCancellingId('');
    }
  };

  return (
    <div className="page-section">
      <div className="section-header"><h2>Booking history and cancellation</h2></div>
      {error && <div className="alert error">{error}</div>}
      <div className="table-card">
        <table>
          <thead><tr><th>Booking ID</th><th>Package</th><th>Status</th><th>Payment</th><th>Cancellation</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading bookings...</td></tr>
            ) : bookings.length ? bookings.map((booking) => (
              <tr key={booking._id}>
                <td>{booking.bookingId}</td>
                <td>{booking.packageName || (typeof booking.package === 'object' ? booking.package.name : booking.package)}</td>
                <td>{booking.status}</td>
                <td>{booking.paymentStatus || 'Pending'}</td>
                <td>
                  {booking.status === 'Cancelled' ? (
                    'Cancelled'
                  ) : cancellations[booking._id] && cancellations[booking._id].status !== 'Rejected' ? (
                    `Requested (${cancellations[booking._id].status})`
                  ) : (
                    <button
                      className="btn btn-light"
                      disabled={cancellingId === booking._id}
                      onClick={() => requestCancellation(booking)}
                      type="button"
                    >
                      {cancellingId === booking._id ? 'Requesting...' : 'Request cancellation'}
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
