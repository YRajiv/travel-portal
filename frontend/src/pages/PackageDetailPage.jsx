import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import CatalogImage from '../components/CatalogImage';
import api from '../services/api';

export default function PackageDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ id: null, item: null, error: '', loading: true });

  useEffect(() => {
    let active = true;
    api.get(`/packages/${id}`)
      .then((response) => {
        if (active) setResult({ id, item: response.data, error: '', loading: false });
      })
      .catch((requestError) => {
        if (active) {
          setResult({
            id,
            item: null,
            error: requestError.response?.data?.message || 'Unable to load this package.',
            loading: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const item = result.id === id ? result.item : null;
  const error = result.id === id ? result.error : '';
  const loading = result.id !== id || result.loading;

  if (loading) return <div className="catalog-detail-loading" role="status">Loading package details...</div>;
  if (error || !item) {
    return (
      <div className="catalog-empty-state">
        <h2>Package unavailable</h2>
        <p>{error || 'This package could not be found or is no longer available.'}</p>
        <Link className="btn btn-primary" to="/packages"><ArrowLeft size={16} /> Back to packages</Link>
      </div>
    );
  }

  const destination = item.destinationInfo;
  return (
    <div className="package-detail-page">
      <Link className="catalog-back-link" to="/packages"><ArrowLeft size={15} /> All packages</Link>
      <section className="package-detail-hero">
        <CatalogImage
          alt={item.name}
          className="package-detail-image"
          src={item.images?.[0] || destination?.image}
        />
        <div className="package-detail-overlay">
          <div>
            <p className="catalog-eyebrow"><MapPin size={15} /> {destination?.name || item.destinationName || 'TRAVEL PACKAGE'}</p>
            <h1>{item.name}</h1>
            <p>{item.description || 'Review package information and booking details below.'}</p>
            <div className="package-detail-summary">
              <span><CalendarDays size={16} /> {item.duration} days{item.nights !== undefined ? ` · ${item.nights} nights` : ''}</span>
              <strong>₹{Number(item.price).toLocaleString('en-IN')} <small>/ traveler</small></strong>
            </div>
            <Link className="btn btn-primary" to={`/booking?package=${item._id}`}>Book this package <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <div className="package-detail-content">
        <div className="package-detail-main">
          <section className="catalog-detail-panel">
            <p className="dashboard-panel-kicker">PACKAGE OVERVIEW</p>
            <h2>What to expect</h2>
            <p>{item.description || 'Detailed package information will be added soon.'}</p>
            <div className="package-detail-facts">
              <span><Clock3 size={16} /> {item.duration} days{item.nights !== undefined ? ` / ${item.nights} nights` : ''}</span>
              <span><Check size={16} /> {item.isAvailable === false ? 'Currently unavailable' : 'Available to book'}</span>
              {destination && <Link to={`/destinations/${destination._id}`}><MapPin size={16} /> {destination.name}, {destination.country}</Link>}
            </div>
          </section>

          {item.itinerary?.length > 0 && (
            <section className="catalog-detail-panel">
              <p className="dashboard-panel-kicker">YOUR JOURNEY</p>
              <h2>Day-by-day itinerary</h2>
              <div className="package-itinerary">
                {item.itinerary.map((day) => (
                  <article key={day.day}>
                    <span>DAY {day.day}</span>
                    <div><h3>{day.title || `Day ${day.day}`}</h3>{day.description && <p>{day.description}</p>}</div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {item.activities?.length > 0 && (
            <section className="catalog-detail-panel">
              <p className="dashboard-panel-kicker">EXPERIENCES</p>
              <h2>Activities</h2>
              <div className="catalog-chip-list">{item.activities.map((activity) => <span key={activity}>{activity}</span>)}</div>
            </section>
          )}
        </div>

        <aside className="package-detail-sidebar">
          <section className="catalog-detail-panel package-price-panel">
            <p className="dashboard-panel-kicker">BOOKING SUMMARY</p>
            <h2>₹{Number(item.price).toLocaleString('en-IN')} <small>/ traveler</small></h2>
            <p>Final total is calculated from the selected traveler count when you book.</p>
            <Link className="btn btn-primary" to={`/booking?package=${item._id}`}>Select dates <ArrowRight size={15} /></Link>
          </section>

          {destination && (
            <section className="catalog-detail-panel">
              <p className="dashboard-panel-kicker">DESTINATION</p>
              <h3>{destination.name}</h3>
              <p>{[destination.city, destination.country].filter(Boolean).join(', ')}</p>
              {destination.bestTimeToVisit && <p><CalendarDays size={15} /> Best time: {destination.bestTimeToVisit}</p>}
              <Link className="catalog-text-action" to={`/destinations/${destination._id}`}>Destination details <ArrowRight size={14} /></Link>
            </section>
          )}
        </aside>
      </div>

      <section className="package-inclusions">
        <div className="catalog-detail-panel">
          <p className="dashboard-panel-kicker">INCLUDED</p>
          <h2>What’s included</h2>
          {item.includedServices?.length ? (
            <ul>{item.includedServices.map((service) => <li key={service}><Check size={15} /> {service}</li>)}</ul>
          ) : <p>Check with the travel team for the latest inclusions.</p>}
          {item.accommodation && <p><strong>Accommodation:</strong> {item.accommodation}</p>}
          {item.transportation && <p><strong>Transportation:</strong> {item.transportation}</p>}
        </div>
        <div className="catalog-detail-panel">
          <p className="dashboard-panel-kicker">NOT INCLUDED</p>
          <h2>Before you book</h2>
          {item.excludedServices?.length ? (
            <ul>{item.excludedServices.map((service) => <li key={service}><X size={15} /> {service}</li>)}</ul>
          ) : <p>Review final package terms before confirming your booking.</p>}
          <p className="catalog-payment-note">Online payment processing is not currently available. Booking a trip does not charge your payment method.</p>
        </div>
      </section>
    </div>
  );
}
