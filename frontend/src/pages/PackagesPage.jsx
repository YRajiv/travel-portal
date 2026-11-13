import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import CatalogImage from '../components/CatalogImage';
import api from '../services/api';

function collectionFrom(data) {
  if (Array.isArray(data)) return { items: data, total: data.length, totalPages: 1 };
  if (Array.isArray(data?.items)) return data;
  throw new Error('The packages response was invalid.');
}

export default function PackagesPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [filters, setFilters] = useState(() => ({
    search: '',
    destination: searchParams.get('destination') || '',
    minPrice: '',
    maxPrice: '',
    minDuration: '',
    maxDuration: '',
    sort: 'price',
  }));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [destinationError, setDestinationError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/destinations', { params: { page: 1, limit: 50, sort: 'name' } })
      .then((response) => {
        if (active) setDestinations(collectionFrom(response.data).items);
      })
      .catch((requestError) => {
        if (active) setDestinationError(requestError.response?.data?.message || 'Destination filters are unavailable.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      api.get('/packages', {
        params: {
          page,
          limit: 9,
          sort: filters.sort,
          ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          ...(filters.destination ? { destination: filters.destination } : {}),
          ...(filters.minPrice !== '' ? { minPrice: filters.minPrice } : {}),
          ...(filters.maxPrice !== '' ? { maxPrice: filters.maxPrice } : {}),
          ...(filters.minDuration !== '' ? { minDuration: filters.minDuration } : {}),
          ...(filters.maxDuration !== '' ? { maxDuration: filters.maxDuration } : {}),
        },
      }).then((response) => {
        if (!active) return;
        const result = collectionFrom(response.data);
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages || 1));
      }).catch((requestError) => {
        if (active) {
          setItems([]);
          setTotal(0);
          setError(requestError.response?.data?.message || requestError.message || 'Unable to load travel packages.');
        }
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, filters.search ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, page]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({
      search: '',
      destination: '',
      minPrice: '',
      maxPrice: '',
      minDuration: '',
      maxDuration: '',
      sort: 'price',
    });
    setPage(1);
  };

  return (
    <div className="catalog-page">
      <section className="catalog-hero package-hero">
        <div>
          <p className="catalog-eyebrow"><CalendarDays size={15} /> TRAVEL, THOUGHTFULLY PLANNED</p>
          <h1>Find your next getaway</h1>
          <p>Compare real packages, review what’s included, and choose the pace that works for you.</p>
        </div>
        <div className="catalog-hero-stat">
          <strong>{loading ? '—' : total}</strong>
          <span>{total === 1 ? 'package available' : 'packages available'}</span>
        </div>
      </section>

      <section className="catalog-search-panel package-filter-panel" aria-label="Search travel packages">
        <label className="catalog-search-field">
          <Search size={18} />
          <span className="sr-only">Search packages</span>
          <input name="search" value={filters.search} onChange={updateFilter} placeholder="Search package or destination" />
        </label>
        <label className="catalog-filter-field">
          <span>Destination</span>
          <select name="destination" value={filters.destination} onChange={updateFilter}>
            <option value="">All destinations</option>
            {destinations.map((destination) => <option key={destination._id} value={destination._id}>{destination.name}, {destination.country}</option>)}
          </select>
        </label>
        <label className="catalog-filter-field">
          <span>Min price (₹)</span>
          <input name="minPrice" type="number" min="0" value={filters.minPrice} onChange={updateFilter} placeholder="Any" />
        </label>
        <label className="catalog-filter-field">
          <span>Max price (₹)</span>
          <input name="maxPrice" type="number" min="0" value={filters.maxPrice} onChange={updateFilter} placeholder="Any" />
        </label>
        <label className="catalog-filter-field">
          <span>Min days</span>
          <input name="minDuration" type="number" min="1" value={filters.minDuration} onChange={updateFilter} placeholder="Any" />
        </label>
        <label className="catalog-filter-field">
          <span>Max days</span>
          <input name="maxDuration" type="number" min="1" value={filters.maxDuration} onChange={updateFilter} placeholder="Any" />
        </label>
        <label className="catalog-filter-field">
          <span>Sort by</span>
          <select name="sort" value={filters.sort} onChange={updateFilter}>
            <option value="price">Price: low to high</option>
            <option value="duration">Duration</option>
            <option value="name">Name</option>
            <option value="newest">Recently added</option>
          </select>
        </label>
        <button className="btn btn-ghost catalog-clear-button" onClick={clearFilters} type="button">Clear</button>
      </section>

      {destinationError && <p className="catalog-filter-note">{destinationError}</p>}
      <div className="catalog-results-heading">
        <div>
          <h2>{filters.destination ? 'Packages for this destination' : 'Packages for your next trip'}</h2>
          <p>{loading ? 'Finding available packages...' : `${total} ${total === 1 ? 'option' : 'options'} available`}</p>
        </div>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {loading ? (
        <div className="catalog-card-grid">
          {Array.from({ length: 6 }, (_, index) => <div className="catalog-card-skeleton" key={index} />)}
        </div>
      ) : !error && !items.length ? (
        <div className="catalog-empty-state">
          <div className="catalog-empty-icon"><CalendarDays size={25} /></div>
          <h2>{filters.search || filters.destination || filters.minPrice || filters.maxPrice || filters.minDuration || filters.maxDuration ? 'No matching packages' : 'Packages are being prepared'}</h2>
          <p>
            {filters.search || filters.destination || filters.minPrice || filters.maxPrice || filters.minDuration || filters.maxDuration
              ? 'Try adjusting your search or filters to see available travel options.'
              : 'There are no published packages in the catalog yet. Check back soon or browse destinations.'}
          </p>
          <div className="catalog-empty-actions">
            {(filters.search || filters.destination || filters.minPrice || filters.maxPrice || filters.minDuration || filters.maxDuration) && (
              <button className="btn btn-light" onClick={clearFilters} type="button">Clear filters</button>
            )}
            <Link className="btn btn-primary" to="/destinations">Browse destinations <ArrowRight size={16} /></Link>
          </div>
        </div>
      ) : (
        <div className="catalog-card-grid">
          {items.map((item) => (
            <article className="catalog-card package-card" key={item._id}>
              <div className="catalog-card-media">
                <CatalogImage alt={item.name} className="catalog-card-image" src={item.images?.[0]} />
                <span className="catalog-card-tag">{item.duration} days{item.nights !== undefined ? ` · ${item.nights} nights` : ''}</span>
              </div>
              <div className="catalog-card-body">
                <p className="catalog-location"><MapPin size={14} /> {item.destinationInfo?.name || item.destinationName || 'Destination details available'}</p>
                <h3>{item.name}</h3>
                <p className="catalog-description">{item.description || 'Review package details to learn more about this trip.'}</p>
                {item.includedServices?.length > 0 && (
                  <div className="package-includes">
                    <span>Included</span>
                    <p>{item.includedServices.slice(0, 3).join(' · ')}</p>
                  </div>
                )}
                <div className="catalog-card-price">
                  <span>Per traveler</span>
                  <strong>₹{Number(item.price).toLocaleString('en-IN')}</strong>
                </div>
                <div className="catalog-card-actions">
                  <Link className="btn btn-light" to={`/packages/${item._id}`}>View details</Link>
                  <Link className="btn btn-primary" to={`/booking?package=${item._id}`}>Book now <ArrowRight size={14} /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <nav className="catalog-pagination" aria-label="Package pages">
          <button className="btn btn-light" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-light" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
        </nav>
      )}
    </div>
  );
}
