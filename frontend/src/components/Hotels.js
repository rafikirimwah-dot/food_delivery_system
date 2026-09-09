import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

function Hotels() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const selectedLocation = new URLSearchParams(search).get('location') || '';
  const [hotels, setHotels] = useState([]); const [error, setError] = useState('');
  useEffect(() => { apiRequest('/hotels').then(setHotels).catch((err) => setError(err.message)); }, []);
  const normalizedLocation = selectedLocation.toLowerCase();
  const visibleHotels = hotels.filter((hotel) => !normalizedLocation || `${hotel.address || ''} ${hotel.name || ''}`.toLowerCase().includes(normalizedLocation));
  return <main className="page"><div className="section-heading"><div><p className="eyebrow">The neighborhood table</p><h1>Find your next favorite.</h1></div><form className="listing-location" onSubmit={(event) => { event.preventDefault(); const value = event.currentTarget.elements.location.value.trim(); navigate(`/hotels${value ? `?location=${encodeURIComponent(value)}` : ''}`); }}><label htmlFor="listing-location">Delivering to</label><div><span>⌖</span><input id="listing-location" name="location" defaultValue={selectedLocation} placeholder="Area or city" /><button className="button secondary" type="submit">Update</button></div></form></div>{selectedLocation && <p className="filter-summary">Showing kitchens near <strong>{selectedLocation}</strong> <Link to="/hotels">Clear filter</Link></p>}{error && <p className="error">{error}. Start the backend to load live restaurants.</p>}<div className="hotel-grid">{visibleHotels.map((hotel) => <Link className="hotel-card" to={`/hotel/${hotel.id}`} key={hotel.id}><div className="hotel-image" style={{ backgroundImage: `url(${hotel.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80'})` }} /><div className="hotel-info"><div><p className="eyebrow">{hotel.cuisine_type || 'Local kitchen'}</p><h2>{hotel.name}</h2></div><span className="rating">★ {hotel.rating || 'New'}</span><p className="hotel-address">{hotel.address || 'Local delivery area'}</p><p>{hotel.description || 'A delicious selection prepared fresh for you.'}</p><span className="text-link">View menu →</span></div></Link>)}</div>{!hotels.length && !error && <p className="empty">Loading kitchens...</p>}{hotels.length > 0 && !visibleHotels.length && <section className="empty-state"><h2>No kitchens found here yet.</h2><p className="muted">Try a nearby neighborhood or clear the location filter.</p><Link className="button secondary" to="/hotels">Show all restaurants</Link></section>}</main>;
}
export default Hotels;
