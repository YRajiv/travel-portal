import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import CatalogImage from '../components/CatalogImage';
import api from '../services/api';

function collectionFrom(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

export default function DestinationDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ id: null, destination: null, packages: [], error: '', packagesError: '', loading: true });

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get(`/destinations/${id}`),
      api.get('/packages', { params: { destination: id, page: 1, limit: 6, sort: 'price' } }),
    ]).then(([destinationResult, packageResult]) => {
      if (!active) return;
      if (destinationResult.status === 'rejected') {
        setResult({
          id,
          destination: null,
          packages: [],
          error: destinationResult.reason?.response?.data?.message || 'Unable to load this destination.',
          packagesError: '',
          loading: false,
        });
        return;
      }

      const packages = packageResult.status === 'fulfilled'
        ? collectionFrom(packageResult.value.data)
        : [];
      setResult({
        id,
        destination: destinationResult.value.data,
        packages,
        error: '',
        packagesError: packageResult.status === 'rejected'
          ? packageResult.reason?.response?.data?.message || 'Packages for this destination could not be loaded.'
          : '',
        loading: false,
      });
    });
    return () => {
      active = false;
    };
  }, [id]);

  const destination = result.id === id ? result.destination : null;
  const error = result.id === id ? result.error : '';
  const loading = result.id !== id || result.loading;

  if (loading) return <div className="catalog-detail-loading" role="status">Loading destination details...</div>;
  if (error || !destination) {
    return (
      <div className="catalog-empty-state">
        <h2>Destination unavailable</h2>
        <p>{error || 'This destination could not be found or is no longer published.'}</p>
        <Link className="btn btn-primary" to="/destinations"><ArrowLeft size={16} /> Back to destinations</Link>
      </div>
    );
  }

  return (
    <div className="destination-detail-page">
      <Link className="catalog-back-link" to="/destinations"><ArrowLeft size={15} /> All destinations</Link>
      <section className="destination-detail-hero">
        <CatalogImage
          alt={destination.name}
          className="destination-detail-image"
          src={destination.image || destination.images?.[0]}
        />
        <div className="destination-detail-overlay">
          <div>
            <p className="catalog-eyebrow"><MapPin size={15} /> {destination.category || destination.tag || 'DESTINATION'}</p>
            <h1>{destination.name}</h1>
            <p>{[destination.city, destination.country].filter(Boolean).join(', ') || destination.location}</p>
            <Link className="btn btn-primary" to={`/packages?destination=${destination._id}`}>
              Explore packages <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="destination-detail-grid">
        <section className="catalog-detail-panel">
          <p className="dashboard-panel-kicker">ABOUT THIS PLACE</p>
          <h2>Make it your next stop</h2>
          <p>{destination.description || 'More destination information will be added soon.'}</p>
          {destination.attractions?.length > 0 && (
            <div className="catalog-detail-subsection">
              <h3>Popular attractions</h3>
              <div className="catalog-chip-list">
                {destination.attractions.map((attraction) => <span key={attraction}>{attraction}</span>)}
              </div>
            </div>
          )}
        </section>

        <aside className="catalog-detail-facts">
          <div><MapPin size={17} /><span>Location</span><strong>{destination.location || [destination.city, destination.country].filter(Boolean).join(', ') || 'Not specified'}</strong></div>
          <div><CalendarDays size={17} /><span>Best time to visit</span><strong>{destination.bestTimeToVisit || 'Check seasonal conditions'}</strong></div>
          <div><Star size={17} /><span>Traveler rating</span><strong>{destination.rating ? `${Number(destination.rating).toFixed(1)} / 5` : 'Not rated yet'}</strong></div>
          <div><span className="catalog-currency-icon">₹</span><span>Estimated trip cost</span><strong>{Number.isFinite(Number(destination.estimatedCost)) && destination.estimatedCost !== undefined ? `₹${Number(destination.estimatedCost).toLocaleString('en-IN')}` : 'See package prices'}</strong></div>
        </aside>
      </div>

      <section className="catalog-detail-packages">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-panel-kicker">PLAN AROUND THIS DESTINATION</p>
            <h2>Available packages</h2>
          </div>
          <Link to={`/packages?destination=${destination._id}`}>See all packages <ArrowRight size={15} /></Link>
        </div>
        {result.packagesError && <div className="alert error">{result.packagesError}</div>}
        {!result.packagesError && result.packages.length ? (
          <div className="catalog-related-grid">
            {result.packages.map((item) => (
              <article className="catalog-related-card" key={item._id}>
                <CatalogImage alt={item.name} className="catalog-related-image" src={item.images?.[0]} />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.duration} days{item.nights !== undefined ? ` · ${item.nights} nights` : ''}</p>
                  <strong>₹{Number(item.price).toLocaleString('en-IN')} <small>/ traveler</small></strong>
                  <div className="catalog-related-actions">
                    <Link className="btn btn-light" to={`/packages/${item._id}`}>View details</Link>
                    <Link className="catalog-text-action" to={`/booking?package=${item._id}`}>Book <ArrowRight size={14} /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : !result.packagesError ? (
          <div className="catalog-empty-state compact">
            <h3>No packages are currently available here</h3>
            <p>Check back later or browse all destinations and packages.</p>
            <Link className="catalog-text-action" to="/packages">Browse packages <ArrowRight size={14} /></Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
