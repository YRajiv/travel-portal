import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ServicesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/services')
      .then((res) => {
        if (active) setItems(res.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load services.');
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
      <div className="section-header"><h2>Service listings</h2></div>
      {error && <div className="alert error">{error}</div>}
      <div className="table-card">
        <table>
          <thead><tr><th>Service</th><th>Type</th><th>Location</th><th>Availability</th><th>Price</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="5">Loading services...</td></tr>}
            {items.map((service) => (
              <tr key={service._id}><td>{service.name}</td><td>{service.type}</td><td>{service.location}</td><td>{service.availability}</td><td>₹{service.price}</td></tr>
            ))}
            {!loading && !error && !items.length && <tr><td colSpan="5">No services available.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
