import { useEffect, useState } from 'react';
import { Archive, CheckCircle2, Edit3, Plus, RefreshCw, X } from 'lucide-react';
import api from '../services/api';

const emptyDestination = {
  name: '', country: '', city: '', location: '', category: '', description: '',
  image: '', imagesText: '', attractionsText: '', bestTimeToVisit: '',
  estimatedCost: '', rating: '', popularity: '0', isActive: true,
};

const emptyPackage = {
  name: '', destination: '', duration: '', nights: '', price: '', description: '',
  imagesText: '', includedText: '', excludedText: '', accommodation: '',
  transportation: '', activitiesText: '', itineraryText: '', isActive: true, isAvailable: true,
};

const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);

function listText(items) {
  return Array.isArray(items) ? items.join('\n') : '';
}

export default function AdminCatalogManager() {
  const [tab, setTab] = useState('destinations');
  const [destinations, setDestinations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [destinationForm, setDestinationForm] = useState(emptyDestination);
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [editing, setEditing] = useState({ type: '', id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/destinations?includeInactive=true'),
      api.get('/packages?includeInactive=true'),
    ]).then(([destinationResponse, packageResponse]) => {
      if (!active) return;
      setDestinations(destinationResponse.data);
      setPackages(packageResponse.data);
      setError('');
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load catalog records.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const clearForms = () => {
    setDestinationForm(emptyDestination);
    setPackageForm(emptyPackage);
    setEditing({ type: '', id: '' });
  };
  const refreshCatalog = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const editDestination = (item) => {
    setTab('destinations');
    setEditing({ type: 'destination', id: item._id });
    setDestinationForm({
      ...emptyDestination,
      ...item,
      imagesText: listText(item.images),
      attractionsText: listText(item.attractions),
      estimatedCost: item.estimatedCost ?? '',
      rating: item.rating ?? '',
      popularity: item.popularity ?? '0',
    });
    setError('');
    setNotice('');
  };

  const editPackage = (item) => {
    setTab('packages');
    setEditing({ type: 'package', id: item._id });
    setPackageForm({
      ...emptyPackage,
      ...item,
      destination: item.destinationInfo?._id || item.destination,
      imagesText: listText(item.images),
      includedText: listText(item.includedServices),
      excludedText: listText(item.excludedServices),
      activitiesText: listText(item.activities),
      itineraryText: listText(item.itinerary?.map((day) => day.title || day.description)),
    });
    setError('');
    setNotice('');
  };

  const saveDestination = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const images = splitLines(destinationForm.imagesText);
    const payload = {
      name: destinationForm.name.trim(),
      country: destinationForm.country.trim(),
      city: destinationForm.city.trim(),
      location: destinationForm.location.trim(),
      category: destinationForm.category.trim(),
      description: destinationForm.description.trim(),
      image: destinationForm.image.trim() || images[0] || '',
      images,
      attractions: splitLines(destinationForm.attractionsText),
      bestTimeToVisit: destinationForm.bestTimeToVisit.trim(),
      estimatedCost: destinationForm.estimatedCost === '' ? undefined : Number(destinationForm.estimatedCost),
      rating: destinationForm.rating === '' ? undefined : Number(destinationForm.rating),
      popularity: Number(destinationForm.popularity) || 0,
      isActive: destinationForm.isActive,
    };
    try {
      if (editing.type === 'destination') {
        await api.put(`/destinations/${editing.id}`, payload);
        setNotice('Destination updated.');
      } else {
        await api.post('/destinations', payload);
        setNotice('Destination created and published to the catalog.');
      }
      clearForms();
      refreshCatalog();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save destination.');
    } finally {
      setSaving(false);
    }
  };

  const savePackage = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name: packageForm.name.trim(),
      destination: packageForm.destination,
      duration: Number(packageForm.duration),
      nights: packageForm.nights === '' ? undefined : Number(packageForm.nights),
      price: Number(packageForm.price),
      description: packageForm.description.trim(),
      images: splitLines(packageForm.imagesText),
      includedServices: splitLines(packageForm.includedText),
      excludedServices: splitLines(packageForm.excludedText),
      accommodation: packageForm.accommodation.trim(),
      transportation: packageForm.transportation.trim(),
      activities: splitLines(packageForm.activitiesText),
      itinerary: splitLines(packageForm.itineraryText)
        .map((title, index) => ({ day: index + 1, title, description: '' })),
      isActive: packageForm.isActive,
      isAvailable: packageForm.isAvailable,
    };
    try {
      if (editing.type === 'package') {
        await api.put(`/packages/${editing.id}`, payload);
        setNotice('Travel package updated.');
      } else {
        await api.post('/packages', payload);
        setNotice('Travel package created and published to the catalog.');
      }
      clearForms();
      refreshCatalog();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save travel package.');
    } finally {
      setSaving(false);
    }
  };

  const archiveItem = async (type, item) => {
    if (!window.confirm(`Archive "${item.name}"? Historical booking records will be preserved.`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`/${type}/${item._id}`);
      setNotice(`${type === 'destinations' ? 'Destination' : 'Package'} archived. Historical records were preserved.`);
      refreshCatalog();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive this record.');
    }
  };

  const toggleItem = async (type, item, field) => {
    setError('');
    setNotice('');
    try {
      await api.put(`/${type}/${item._id}`, { [field]: !item[field] });
      setNotice(`${field === 'isActive' ? 'Publication' : 'Availability'} updated.`);
      refreshCatalog();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update this record.');
    }
  };

  const activeDestinations = destinations.filter((item) => item.isActive !== false);
  const updateDestinationField = (event) => {
    const { name, value, type, checked } = event.target;
    setDestinationForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };
  const updatePackageField = (event) => {
    const { name, value, type, checked } = event.target;
    setPackageForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <section className="catalog-admin" id="catalog-management">
      <div className="catalog-admin-heading">
        <div>
          <p className="dashboard-panel-kicker">CATALOG OPERATIONS</p>
          <h2>Destinations &amp; packages</h2>
          <p>Create and maintain the live catalog customers can discover and book.</p>
        </div>
        <button className="btn btn-light" onClick={refreshCatalog} type="button" disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="catalog-admin-tabs" role="tablist" aria-label="Catalog management">
        <button
          aria-selected={tab === 'destinations'}
          className={tab === 'destinations' ? 'active' : ''}
          onClick={() => { setTab('destinations'); clearForms(); }}
          role="tab"
          type="button"
        >
          Destinations <span>{destinations.length}</span>
        </button>
        <button
          aria-selected={tab === 'packages'}
          className={tab === 'packages' ? 'active' : ''}
          onClick={() => { setTab('packages'); clearForms(); }}
          role="tab"
          type="button"
        >
          Packages <span>{packages.length}</span>
        </button>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}

      {tab === 'destinations' ? (
        <div className="catalog-admin-layout">
          <form className="catalog-admin-form" onSubmit={saveDestination}>
            <div className="catalog-admin-form-heading">
              <h3>{editing.type === 'destination' ? 'Edit destination' : 'Add destination'}</h3>
              {editing.type && <button className="catalog-icon-button" onClick={clearForms} type="button" aria-label="Cancel editing"><X size={17} /></button>}
            </div>
            <div className="catalog-admin-fields">
              <label>Destination name<input name="name" value={destinationForm.name} onChange={updateDestinationField} required maxLength="120" /></label>
              <label>Country<input name="country" value={destinationForm.country} onChange={updateDestinationField} required maxLength="100" /></label>
              <label>City<input name="city" value={destinationForm.city} onChange={updateDestinationField} maxLength="100" /></label>
              <label>Category<input name="category" value={destinationForm.category} onChange={updateDestinationField} placeholder="Beach, heritage, nature..." maxLength="60" /></label>
              <label className="catalog-field-wide">Location<input name="location" value={destinationForm.location} onChange={updateDestinationField} maxLength="160" /></label>
              <label className="catalog-field-wide">Description<textarea name="description" value={destinationForm.description} onChange={updateDestinationField} rows="3" maxLength="3000" /></label>
              <label className="catalog-field-wide">Cover image URL<input name="image" type="url" value={destinationForm.image} onChange={updateDestinationField} placeholder="https://..." /></label>
              <label className="catalog-field-wide">Additional image URLs <small>One URL per line</small><textarea name="imagesText" value={destinationForm.imagesText} onChange={updateDestinationField} rows="2" /></label>
              <label className="catalog-field-wide">Popular attractions <small>One attraction per line</small><textarea name="attractionsText" value={destinationForm.attractionsText} onChange={updateDestinationField} rows="2" /></label>
              <label>Best time to visit<input name="bestTimeToVisit" value={destinationForm.bestTimeToVisit} onChange={updateDestinationField} maxLength="160" /></label>
              <label>Est. cost (₹)<input name="estimatedCost" type="number" min="0" step="1" value={destinationForm.estimatedCost} onChange={updateDestinationField} /></label>
              <label>Rating (0–5)<input name="rating" type="number" min="0" max="5" step="0.1" value={destinationForm.rating} onChange={updateDestinationField} /></label>
              <label>Popularity score<input name="popularity" type="number" min="0" step="1" value={destinationForm.popularity} onChange={updateDestinationField} /></label>
            </div>
            <label className="catalog-checkbox"><input name="isActive" type="checkbox" checked={destinationForm.isActive} onChange={updateDestinationField} /> Published in customer catalog</label>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : <><Plus size={16} /> {editing.type === 'destination' ? 'Save changes' : 'Create destination'}</>}
            </button>
          </form>

          <div className="catalog-admin-list">
            <div className="catalog-admin-list-heading"><h3>Catalog destinations</h3><span>{destinations.length} total</span></div>
            {loading ? <p className="empty-state">Loading destinations...</p> : destinations.length ? destinations.map((item) => (
              <article className="catalog-admin-row" key={item._id}>
                <div className="catalog-admin-row-main">
                  <strong>{item.name}</strong>
                  <span>{[item.city, item.country, item.category || item.tag].filter(Boolean).join(' · ') || 'No location details'}</span>
                </div>
                <span className={`catalog-admin-badge ${item.isActive === false ? 'inactive' : ''}`}>{item.isActive === false ? 'Archived' : 'Published'}</span>
                <div className="catalog-admin-actions">
                  <button className="catalog-icon-button" onClick={() => editDestination(item)} type="button" aria-label={`Edit ${item.name}`}><Edit3 size={15} /></button>
                  <button className="catalog-icon-button" onClick={() => toggleItem('destinations', item, 'isActive')} type="button" aria-label={`${item.isActive === false ? 'Publish' : 'Unpublish'} ${item.name}`}><CheckCircle2 size={15} /></button>
                  {item.isActive !== false && <button className="catalog-icon-button danger" onClick={() => archiveItem('destinations', item)} type="button" aria-label={`Archive ${item.name}`}><Archive size={15} /></button>}
                </div>
              </article>
            )) : <p className="empty-state">No destinations yet. Add one to publish it to customers.</p>}
          </div>
        </div>
      ) : (
        <div className="catalog-admin-layout">
          <form className="catalog-admin-form" onSubmit={savePackage}>
            <div className="catalog-admin-form-heading">
              <h3>{editing.type === 'package' ? 'Edit package' : 'Add package'}</h3>
              {editing.type && <button className="catalog-icon-button" onClick={clearForms} type="button" aria-label="Cancel editing"><X size={17} /></button>}
            </div>
            <div className="catalog-admin-fields">
              <label className="catalog-field-wide">Package name<input name="name" value={packageForm.name} onChange={updatePackageField} required maxLength="140" /></label>
              <label className="catalog-field-wide">Destination
                <select name="destination" value={packageForm.destination} onChange={updatePackageField} required>
                  <option value="">Choose an active destination</option>
                  {activeDestinations.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.country}</option>)}
                </select>
              </label>
              <label>Duration (days)<input name="duration" type="number" min="1" step="1" value={packageForm.duration} onChange={updatePackageField} required /></label>
              <label>Nights<input name="nights" type="number" min="0" step="1" value={packageForm.nights} onChange={updatePackageField} /></label>
              <label>Price per traveler (₹)<input name="price" type="number" min="0" step="1" value={packageForm.price} onChange={updatePackageField} required /></label>
              <label className="catalog-field-wide">Description<textarea name="description" value={packageForm.description} onChange={updatePackageField} rows="3" maxLength="3000" /></label>
              <label className="catalog-field-wide">Image URLs <small>One URL per line</small><textarea name="imagesText" value={packageForm.imagesText} onChange={updatePackageField} rows="2" /></label>
              <label>Accommodation<input name="accommodation" value={packageForm.accommodation} onChange={updatePackageField} maxLength="500" /></label>
              <label>Transportation<input name="transportation" value={packageForm.transportation} onChange={updatePackageField} maxLength="500" /></label>
              <label>Included services <small>One per line</small><textarea name="includedText" value={packageForm.includedText} onChange={updatePackageField} rows="3" /></label>
              <label>Excluded services <small>One per line</small><textarea name="excludedText" value={packageForm.excludedText} onChange={updatePackageField} rows="3" /></label>
              <label className="catalog-field-wide">Activities <small>One per line</small><textarea name="activitiesText" value={packageForm.activitiesText} onChange={updatePackageField} rows="2" /></label>
              <label className="catalog-field-wide">Daily itinerary <small>One activity per day, in order</small><textarea name="itineraryText" value={packageForm.itineraryText} onChange={updatePackageField} rows="3" /></label>
            </div>
            <div className="catalog-checkbox-row">
              <label className="catalog-checkbox"><input name="isActive" type="checkbox" checked={packageForm.isActive} onChange={updatePackageField} /> Published</label>
              <label className="catalog-checkbox"><input name="isAvailable" type="checkbox" checked={packageForm.isAvailable} onChange={updatePackageField} /> Available to book</label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving || !activeDestinations.length}>
              {saving ? 'Saving...' : <><Plus size={16} /> {editing.type === 'package' ? 'Save changes' : 'Create package'}</>}
            </button>
            {!activeDestinations.length && <p className="catalog-admin-help">Publish a destination before creating a package.</p>}
          </form>

          <div className="catalog-admin-list">
            <div className="catalog-admin-list-heading"><h3>Catalog packages</h3><span>{packages.length} total</span></div>
            {loading ? <p className="empty-state">Loading packages...</p> : packages.length ? packages.map((item) => (
              <article className="catalog-admin-row" key={item._id}>
                <div className="catalog-admin-row-main">
                  <strong>{item.name}</strong>
                  <span>{item.destinationName || item.destinationInfo?.name || 'Destination unavailable'} · {item.duration} days · ₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                </div>
                <span className={`catalog-admin-badge ${item.isActive === false || item.isAvailable === false ? 'inactive' : ''}`}>
                  {item.isActive === false ? 'Archived' : item.isAvailable === false ? 'Unavailable' : 'Published'}
                </span>
                <div className="catalog-admin-actions">
                  <button className="catalog-icon-button" onClick={() => editPackage(item)} type="button" aria-label={`Edit ${item.name}`}><Edit3 size={15} /></button>
                  <button className="catalog-icon-button" onClick={() => toggleItem('packages', item, 'isActive')} type="button" aria-label={`${item.isActive === false ? 'Publish' : 'Unpublish'} ${item.name}`}><CheckCircle2 size={15} /></button>
                  <button className="catalog-icon-button" onClick={() => toggleItem('packages', item, 'isAvailable')} type="button" aria-label={`Toggle availability for ${item.name}`}><RefreshCw size={15} /></button>
                  {item.isActive !== false && <button className="catalog-icon-button danger" onClick={() => archiveItem('packages', item)} type="button" aria-label={`Archive ${item.name}`}><Archive size={15} /></button>}
                </div>
              </article>
            )) : <p className="empty-state">No packages yet. Add one and link it to an active destination.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
