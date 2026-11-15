import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const today = new Date();
const minTravelDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export default function BookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submissionLock = useRef(false);
  const requestId = useRef('');
  const [leadTraveler, setLeadTraveler] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });
  const [form, setForm] = useState(() => ({
    packageId: searchParams.get('package') || '',
    travelDate: '',
    travelers: 2,
  }));
  const selectedPackage = packages.find((item) => item._id === form.packageId);

  useEffect(() => {
    let active = true;

    api.get('/packages', { params: { page: 1, limit: 50 } })
      .then((response) => {
        const items = Array.isArray(response.data) ? response.data : response.data?.items;
        if (!Array.isArray(items)) throw new Error('The packages response was invalid.');
        if (active) setPackages(items);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load travel packages.');
        }
      })
      .finally(() => {
        if (active) setLoadingPackages(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setError('');
    setMessage('');
  };

  const handleTravelerChange = (event) => {
    setLeadTraveler((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submissionLock.current) return;
    setError('');
    setMessage('');

    if (!selectedPackage) {
      setError('Choose a valid travel package.');
      return;
    }

    const travelers = Number(form.travelers);
    if (!Number.isInteger(travelers) || travelers < 1) {
      setError('Travelers must be a positive whole number.');
      return;
    }
    if (!leadTraveler.name.trim() || !leadTraveler.email.trim() || !leadTraveler.phone.trim()) {
      setError('Enter the lead traveler’s name, email, and phone number.');
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      if (!requestId.current) {
        requestId.current = globalThis.crypto?.randomUUID
          ? globalThis.crypto.randomUUID()
          : `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
      const response = await api.post('/bookings', {
        package: selectedPackage._id,
        destination: selectedPackage.destination,
        travelDate: form.travelDate,
        travelers,
        leadTraveler,
        clientRequestId: requestId.current,
      });
      setMessage(response.data.paymentNotice || 'Booking created. Payment remains pending; online payment processing is not available, and no charge was made.');
      setTimeout(() => navigate('/customer-dashboard'), 800);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create booking.');
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>Book your trip</h2>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        {loadingPackages ? (
          <p className="empty-state">Loading available packages...</p>
        ) : !packages.length ? (
          <div className="catalog-empty-state compact">
            <h3>No packages are currently available to book</h3>
            <p>Ask an administrator to publish an active destination and package, or browse the catalog later.</p>
          </div>
        ) : (
          <form className="stack-form booking-form" onSubmit={handleSubmit}>
            <label>Travel package
              <select name="packageId" value={form.packageId} onChange={handleChange} required disabled={isSubmitting}>
                <option value="">Choose a travel package</option>
                {packages.map((item) => (
                  <option key={item._id} value={item._id}>{item.name} - ₹{Number(item.price).toLocaleString('en-IN')}</option>
                ))}
              </select>
            </label>
            {selectedPackage && (
              <div className="booking-price-summary">
                <span>{selectedPackage.destinationInfo?.name || selectedPackage.destinationName} · ₹{Number(selectedPackage.price).toLocaleString('en-IN')} per traveler</span>
                <strong>Estimated total: ₹{(Number(selectedPackage.price) * Number(form.travelers)).toLocaleString('en-IN')}</strong>
                <small>The final total is calculated and validated by the server.</small>
              </div>
            )}
            <label>Travel date<input type="date" name="travelDate" value={form.travelDate} onChange={handleChange} min={minTravelDate} required disabled={isSubmitting} /></label>
            <label>Number of travelers<input type="number" name="travelers" value={form.travelers} onChange={handleChange} min="1" max="20" step="1" required disabled={isSubmitting} /></label>
            <fieldset className="booking-traveler-fields">
              <legend>Lead traveler contact</legend>
              <label>Full name<input name="name" autoComplete="name" value={leadTraveler.name} onChange={handleTravelerChange} required maxLength="120" disabled={isSubmitting} /></label>
              <label>Email<input name="email" type="email" autoComplete="email" value={leadTraveler.email} onChange={handleTravelerChange} required maxLength="254" disabled={isSubmitting} /></label>
              <label>Phone<input name="phone" type="tel" autoComplete="tel" value={leadTraveler.phone} onChange={handleTravelerChange} required minLength="8" maxLength="24" disabled={isSubmitting} /></label>
            </fieldset>
            <button className="btn btn-primary" disabled={isSubmitting || !packages.length} type="submit">
              {isSubmitting ? 'Submitting booking...' : 'Review and confirm booking'}
            </button>
            <p className="small-note">No payment is collected at this step. Your booking is saved as pending.</p>
          </form>
        )}
      </div>
    </div>
  );
}
