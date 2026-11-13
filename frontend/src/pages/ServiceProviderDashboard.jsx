import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ServiceProviderDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/services/mine')
      .then((response) => {
        if (active) setServices(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load your service listings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const availableServices = services.filter((service) => service.availability === 'Available').length;

  return (
    <div className="dashboard-shell">
      <aside className="sidebar"><h3>Service Provider</h3><ul><li>Hotels</li><li>Transport</li><li>Activities</li><li>Availability</li></ul></aside>
      <section className="dashboard-content">
        {loading && <p className="empty-state">Loading service listings...</p>}
        {error && <div className="alert error">{error}</div>}
        {!loading && !error && (
          <>
            <div className="card-grid three-col">
              <div className="stat-box"><span>Service listings</span><strong>{services.length}</strong></div>
              <div className="stat-box"><span>Available listings</span><strong>{availableServices}</strong></div>
              <div className="stat-box"><span>Assigned bookings</span><strong>Not tracked</strong></div>
            </div>
            {!services.length && <p className="empty-state">No service listings have been added to your account.</p>}
          </>
        )}
      </section>
    </div>
  );
}
