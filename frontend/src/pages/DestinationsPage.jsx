import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Search, Star } from 'lucide-react';
import CatalogImage from '../components/CatalogImage';
import api from '../services/api';

export default function DestinationsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', country: '', category: '', sort: 'popularity' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      api.get('/destinations', {
        params: {
          page,
          limit: 9,
          sort: filters.sort,
          ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          ...(filters.country.trim() ? { country: filters.country.trim() } : {}),
          ...(filters.category ? { category: filters.category } : {}),
        },
      })
        .then((response) => {
          if (!active) return;
          const result = response.data;
          const records = Array.isArray(result) ? result : result.items;
          if (!Array.isArray(records)) throw new Error('The destinations response was invalid.');
          setItems(records);
          setCategories(Array.isArray(result.categories)
            ? result.categories
            : [...new Set(records.map((item) => item.category || item.tag).filter(Boolean))].sort());
          setTotal(Array.isArray(result) ? records.length : result.total);
          setTotalPages(Array.isArray(result) ? 1 : Math.max(1, result.totalPages || 1));
        })
        .catch((requestError) => {
          if (active) {
            setItems([]);
            setCategories([]);
            setError(requestError.response?.data?.message || requestError.message || 'Unable to load destinations.');
          }
        })
        .finally(() => {
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
    setFilters({ search: '', country: '', category: '', sort: 'popularity' });
    setPage(1);
  };

  return (
    <div className="catalog-page">
      <section className="catalog-hero destination-hero">
        <div>
          <p className="catalog-eyebrow"><MapPin size={15} /> FIND YOUR NEXT STORY</p>
          <h1>Discover destinations</h1>
          <p>Explore places, compare travel options, and find a trip that feels like yours.</p>
        </div>
        <div className="catalog-hero-stat">
          <strong>{loading ? '—' : total}</strong>
          <span>{total === 1 ? 'destination to explore' : 'destinations to explore'}</span>
        </div>
      </section>

      <section className="catalog-search-panel" aria-label="Search destinations">
        <label className="catalog-search-field">
          <Search size={18} />
          <span className="sr-only">Search by destination</span>
          <input name="search" value={filters.search} onChange={updateFilter} placeholder="Search by destination, city, or country" />
        </label>
        <label className="catalog-filter-field">
          <span>Country</span>
          <input name="country" value={filters.country} onChange={updateFilter} placeholder="Any country" />
        </label>
        <label className="catalog-filter-field">
          <span>Category</span>
          <select name="category" value={filters.category} onChange={updateFilter}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="catalog-filter-field">
          <span>Sort by</span>
          <select name="sort" value={filters.sort} onChange={updateFilter}>
            <option value="popularity">Popular</option>
            <option value="name">Name</option>
            <option value="price">Starting price</option>
          </select>
        </label>
        <button className="btn btn-ghost catalog-clear-button" onClick={clearFilters} type="button">Clear</button>
      </section>

      <div className="catalog-results-heading">
        <div>
          <h2>{filters.search || filters.country || filters.category ? 'Search results' : 'Popular places'}</h2>
          <p>{loading ? 'Finding destinations...' : `${total} ${total === 1 ? 'place' : 'places'} available`}</p>
        </div>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {loading ? (
        <div className="catalog-card-grid">
          {Array.from({ length: 6 }, (_, index) => <div className="catalog-card-skeleton" key={index} />)}
        </div>
      ) : !error && !items.length ? (
        <div className="catalog-empty-state">
          <div className="catalog-empty-icon"><MapPin size={25} /></div>
          <h2>{filters.search || filters.country || filters.category ? 'No matching destinations' : 'New destinations are on the way'}</h2>
          <p>
            {filters.search || filters.country || filters.category
              ? 'Try another search or clear the filters to see all available places.'
              : 'The travel team is preparing the catalog. Check back soon or explore the available packages.'}
          </p>
          <div className="catalog-empty-actions">
            {(filters.search || filters.country || filters.category) && <button className="btn btn-light" onClick={clearFilters} type="button">Clear filters</button>}
            <Link className="btn btn-primary" to="/packages">Explore packages <ArrowRight size={16} /></Link>
          </div>
        </div>
      ) : (
        <div className="catalog-card-grid">
          {items.map((destination) => (
            <article className="catalog-card" key={destination._id}>
              <div className="catalog-card-media">
                <CatalogImage
                  alt={destination.name}
                  className="catalog-card-image"
                  src={destination.image || destination.images?.[0]}
                />
                {(destination.category || destination.tag) && <span className="catalog-card-tag">{destination.category || destination.tag}</span>}
              </div>
              <div className="catalog-card-body">
                <div className="catalog-card-title-row">
                  <div>
                    <h3>{destination.name}</h3>
                    <p className="catalog-location"><MapPin size={14} /> {[destination.city, destination.country].filter(Boolean).join(', ') || destination.location}</p>
                  </div>
                  {Number.isFinite(Number(destination.rating)) && destination.rating !== undefined && (
                    <span className="catalog-rating"><Star size={14} fill="currentColor" /> {Number(destination.rating).toFixed(1)}</span>
                  )}
                </div>
                <p className="catalog-description">{destination.description || 'Discover local highlights, culture, and experiences.'}</p>
                <div className="catalog-card-price">
                  {Number.isFinite(Number(destination.startingPrice)) && destination.startingPrice !== null
                    ? <><span>Packages from</span><strong>₹{Number(destination.startingPrice).toLocaleString('en-IN')}</strong></>
                    : <span>{destination.packageCount ? `${destination.packageCount} available packages` : 'Explore destination details'}</span>}
                </div>
                <div className="catalog-card-actions">
                  <Link className="btn btn-light" to={`/destinations/${destination._id}`}>View details</Link>
                  <Link className="catalog-text-action" to={`/packages?destination=${destination._id}`}>Explore packages <ArrowRight size={14} /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <nav className="catalog-pagination" aria-label="Destination pages">
          <button className="btn btn-light" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-light" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
        </nav>
      )}
    </div>
  );
}
