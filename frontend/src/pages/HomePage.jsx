import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, ArrowRight, Plane } from 'lucide-react';
import api from '../services/api';

export default function HomePage() {
  const [destinations, setDestinations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      const [destRes, packageRes] = await Promise.all([
        api.get('/destinations'),
        api.get('/packages'),
      ]);
      if (active) {
        setDestinations(destRes.data.slice(0, 3));
        setPackages(packageRes.data.slice(0, 3));
      }
    };
    loadData()
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load travel highlights.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Curated holiday experiences</span>
          <h1>Book unforgettable journeys with confidence.</h1>
          <p>From island escapes to city getaways, manage bookings, itineraries, and trips from one portal.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/packages">Explore packages</Link>
            <Link className="btn btn-light" to="/register">Create account</Link>
          </div>
        </div>
        <div className="hero-card">
          <div className="mini-card">
            <Plane size={18} />
            <span>4500+ trips</span>
          </div>
          <img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80" alt="Travel destination" />
        </div>
      </section>

      <section className="section-block">
        {error && <div className="alert error">{error}</div>}
        <div className="section-header">
          <h2>Popular destinations</h2>
          <Link to="/destinations">See all <ArrowRight size={16}/></Link>
        </div>
        <div className="card-grid three-col">
          {loading && <p className="empty-state">Loading destinations...</p>}
          {destinations.map((destination) => (
            <div className="info-card" key={destination._id}>
              <img src={destination.image} alt={destination.name} />
              <div className="info-body">
                <div className="meta-row"><MapPin size={14} /> {destination.country}</div>
                <h3>{destination.name}</h3>
                <p>{destination.description}</p>
                <div className="meta-row"><Star size={14} /> {destination.rating}</div>
              </div>
            </div>
          ))}
          {!loading && !error && !destinations.length && <p className="empty-state">No destinations are available yet.</p>}
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <h2>Featured packages</h2>
          <Link to="/packages">View all <ArrowRight size={16}/></Link>
        </div>
        <div className="card-grid three-col">
          {loading && <p className="empty-state">Loading packages...</p>}
          {packages.map((item) => (
            <div className="info-card" key={item._id}>
              <img src={item.images?.[0]} alt={item.name} />
              <div className="info-body">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="price-row"><strong>₹{item.price}</strong><span>{item.duration} days</span></div>
                <Link to={`/packages/${item._id}`} className="text-link">View details</Link>
              </div>
            </div>
          ))}
          {!loading && !error && !packages.length && <p className="empty-state">No packages are available yet.</p>}
        </div>
      </section>
    </div>
  );
}
