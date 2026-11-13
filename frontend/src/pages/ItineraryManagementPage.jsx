import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ItineraryManagementPage() {
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ booking: '', title: '', plan: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/itineraries'), api.get('/bookings')])
      .then(([itineraryResponse, bookingResponse]) => {
        if (!active) return;
        setItems(itineraryResponse.data);
        setBookings(bookingResponse.data);
        if (bookingResponse.data.length) {
          setForm((previous) => ({ ...previous, booking: bookingResponse.data[0]._id }));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load itineraries.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const response = await api.post('/itineraries', {
        booking: form.booking,
        title: form.title,
        days: [{ day: 1, plan: form.plan }],
      });
      setItems((previous) => [response.data, ...previous]);
      setForm((previous) => ({ ...previous, title: '', plan: '' }));
      setMessage('Itinerary saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save itinerary.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-section">
      <div className="section-header"><h2>Itinerary management</h2></div>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      {bookings.length > 0 && (
        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Booking
            <select name="booking" value={form.booking} onChange={(event) => setForm((previous) => ({ ...previous, booking: event.target.value }))} required>
              {bookings.map((booking) => (
                <option key={booking._id} value={booking._id}>
                  {booking.bookingId} - {booking.packageName || 'Travel package'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Itinerary title
            <input name="title" value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} required />
          </label>
          <label>
            Day 1 plan
            <textarea name="plan" value={form.plan} onChange={(event) => setForm((previous) => ({ ...previous, plan: event.target.value }))} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save itinerary'}
          </button>
        </form>
      )}
      {loading && <p className="empty-state">Loading itineraries...</p>}
      {!loading && !bookings.length && <p className="empty-state">Create a booking before adding an itinerary.</p>}
      {!loading && !items.length && <p className="empty-state">No itineraries yet.</p>}
      <div className="card-grid two-col">
        {items.map((item) => (
          <div className="info-card" key={item._id}>
            <div className="info-body">
              <h3>{item.title}</h3>
              <ul>
                {item.days?.map((day, index) => <li key={index}>Day {day.day}: {day.plan}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
