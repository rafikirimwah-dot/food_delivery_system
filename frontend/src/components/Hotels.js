import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';

function Hotels() {
  const [hotels, setHotels] = useState([]); const [error, setError] = useState('');
  useEffect(() => { apiRequest('/hotels').then(setHotels).catch((err) => setError(err.message)); }, []);
  return <main className="page"><div className="section-heading"><div><p className="eyebrow">The neighborhood table</p><h1>Find your next favorite.</h1></div><p className="muted heading-note">Curated local kitchens, ready when you are.</p></div>{error && <p className="error">{error}. Start the backend to load live restaurants.</p>}<div className="hotel-grid">{hotels.map((hotel) => <Link className="hotel-card" to={`/hotel/${hotel.id}`} key={hotel.id}><div className="hotel-image" style={{ backgroundImage: `url(${hotel.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80'})` }} /><div className="hotel-info"><div><p className="eyebrow">{hotel.cuisine_type || 'Local kitchen'}</p><h2>{hotel.name}</h2></div><span className="rating">★ {hotel.rating || 'New'}</span><p>{hotel.description || 'A delicious selection prepared fresh for you.'}</p><span className="text-link">View menu →</span></div></Link>)}</div>{!hotels.length && !error && <p className="empty">Loading kitchens...</p>}</main>;
}
export default Hotels;
