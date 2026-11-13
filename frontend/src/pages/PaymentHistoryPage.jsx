import { useEffect, useState } from 'react';
import api from '../services/api';

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/payments')
      .then((response) => {
        if (active) setPayments(response.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load payment records.');
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
    <div className="page-section">
      <div className="section-header"><h2>Payments</h2></div>
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <p className="empty-state">Loading payments...</p>
      ) : payments.length ? (
        <div className="table-card">
          <table>
            <thead><tr><th>Payment</th><th>Booking</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{payment._id}</td>
                  <td>{payment.booking?.bookingId || payment.booking}</td>
                  <td>₹{payment.amount ?? 0}</td>
                  <td>{payment.method || 'Not specified'}</td>
                  <td>{payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.some((payment) => payment.status === 'Pending') && (
            <p className="small-note">Pending payments are records only; no charge is made by this application.</p>
          )}
        </div>
      ) : (
        <p className="empty-state">No payment records yet.</p>
      )}
    </div>
  );
}
