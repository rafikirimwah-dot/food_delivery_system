import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaStar, FaClock, FaMotorcycle, FaArrowRight, FaMapMarkerAlt } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './Home.css';

// Warm custom marker
const makeHotelIcon = (color, emoji) => L.divIcon({
  className: 'warm-marker',
  html: `<div style="
    background: ${color};
    width: 40px; height: 40px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 20px ${color}66;
    border: 3px solid #FFFFFF;
  "><span style="transform: rotate(45deg); font-size: 1.1rem;">${emoji}</span></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const customerIcon = L.divIcon({
  className: 'customer-marker',
  html: `<div style="
    width: 18px; height: 18px;
    background: #C97B5F;
    border-radius: 50%;
    border: 3px solid #FFFFFF;
    box-shadow: 0 4px 16px rgba(201, 123, 95, 0.5);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function Home() {
  const [hotels, setHotels] = useState([]);
  const [offerItem, setOfferItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState('all');
  const [userLocation] = useState({ lat: -1.286389, lng: 36.817223 });
  const navigate = useNavigate();

  const budgetOptions = [
    { id: 'all', label: 'All Prices', icon: '🍽️' },
    { id: 'budget', label: 'Under KSh 700', icon: '🪙' },
    { id: 'mid', label: 'KSh 700 – 1,500', icon: '💵' },
    { id: 'premium', label: 'KSh 1,500 – 3,000', icon: '💎' },
    { id: 'luxury', label: 'KSh 3,000+', icon: '👑' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelsRes, offerRes] = await Promise.all([
          axios.get('http://localhost:5000/api/hotels'),
          axios.get('http://localhost:5000/api/offers/random')
        ]);
        setHotels(hotelsRes.data);
        if (offerRes.data) {
          offerRes.data.price = parseFloat(offerRes.data.price);
          offerRes.data.discounted_price = parseFloat(offerRes.data.discounted_price);
          setOfferItem(offerRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const hotelsWithDistance = hotels.map(h => ({
    ...h,
    distance: calculateDistance(userLocation.lat, userLocation.lng, h.latitude || -1.286389, h.longitude || 36.817223)
  })).sort((a, b) => a.distance - b.distance);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Preparing something lovely…</p>
      </div>
    );
  }

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n)).toLocaleString()}`;

  return (
    <div className="home-warm">
      {/* HERO */}
      <section className="hero-warm">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />

        <div className="hero-grid">
          <div className="hero-left">
            <span className="hero-eyebrow">
              <span className="dot" /> Delivering across Nairobi in 20 min
            </span>
            <h1>
              Your next meal is <br />
              <em>twenty minutes</em> away.
            </h1>
            <p className="hero-lede">
              Order from a curated list of local restaurants. Track your rider live.
              Pay with M-Pesa. Arrive warm, every time.
            </p>
            <div className="hero-actions">
              <Link to="/hotels" className="btn-primary-warm">
                Browse Restaurants <FaArrowRight />
              </Link>
              <a href="#nearby" className="btn-ghost-warm">
                <FaMapMarkerAlt /> See Nearby
              </a>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars">
                <span style={{ background: '#C97B5F' }}>B</span>
                <span style={{ background: '#8FA68E' }}>F</span>
                <span style={{ background: '#D4A5A5' }}>K</span>
                <span style={{ background: '#C9A961' }}>M</span>
              </div>
              <p>Trusted by <strong>10,000+</strong> hungry Kenyans</p>
            </div>
          </div>

          <div className="hero-right">
            {offerItem && (
              <div className="hero-offer-card">
                <span className="hero-offer-tag">Today's Special</span>
                <div className="hero-offer-img">
                  <img
                    src={offerItem.image_url}
                    alt={offerItem.name}
                    onError={(e) => e.target.src = `https://via.placeholder.com/400x300/F5EFE6/C97B5F?text=${offerItem.name}`}
                  />
                </div>
                <div className="hero-offer-body">
                  <div className="hero-offer-hotel">{offerItem.hotel_name}</div>
                  <h3>{offerItem.name}</h3>
                  <div className="hero-offer-prices">
                    <span className="price-current">{formatKSh(offerItem.discounted_price)}</span>
                    <span className="price-original">{formatKSh(offerItem.price)}</span>
                  </div>
                  <Link to={`/hotel/${offerItem.hotel_id}`} className="hero-offer-btn">
                    Order Now <FaArrowRight />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BUDGET */}
      <section className="budget-warm">
        <div className="sec-head">
          <h2>What's your budget today?</h2>
          <p>We'll show you places that match your wallet.</p>
        </div>
        <div className="budget-pills">
          {budgetOptions.map(opt => (
            <button
              key={opt.id}
              className={`budget-pill ${budget === opt.id ? 'active' : ''}`}
              onClick={() => setBudget(opt.id)}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* MAP */}
      <section className="map-warm" id="nearby">
        <div className="sec-head">
          <h2><FaMapMarkerAlt style={{ color: 'var(--terracotta)' }} /> Restaurants Near You</h2>
          <p>Pinned by proximity · Centered on Nairobi</p>
        </div>
        <div className="map-card">
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={12}
            style={{ height: '480px', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap, CartoDB'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={customerIcon}>
              <Popup>📍 You are here</Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={5000}
              pathOptions={{ color: '#C97B5F', fillColor: '#C97B5F', fillOpacity: 0.08 }}
            />
            {hotelsWithDistance.map(hotel => (
              <Marker
                key={hotel.id}
                position={[hotel.latitude || -1.286389, hotel.longitude || 36.817223]}
                icon={makeHotelIcon(hotel.brand_color || '#C97B5F', hotel.emoji || '🍽️')}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>{hotel.emoji} {hotel.name}</strong>
                    <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#7A736A' }}>
                      {hotel.cuisine_type} · {hotel.distance.toFixed(1)} km
                    </p>
                    <button
                      onClick={() => navigate(`/hotel/${hotel.id}`)}
                      style={{
                        background: hotel.brand_color || '#C97B5F',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        width: '100%'
                      }}
                    >View Menu</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* HOTELS */}
      <section className="hotels-warm">
        <div className="sec-head">
          <h2>Featured Restaurants</h2>
          <Link to="/hotels" className="link-all">
            View all <FaArrowRight />
          </Link>
        </div>

        <div className="hotels-grid-warm">
          {hotelsWithDistance.map((hotel, idx) => (
            <Link
              to={`/hotel/${hotel.id}`}
              key={hotel.id}
              className="hotel-card-warm"
              style={{
                '--hotel-color': hotel.brand_color || '#C97B5F',
                animationDelay: `${idx * 60}ms`
              }}
            >
              <div className="hc-image-warm">
                <img
                  src={`https://picsum.photos/seed/hotel${hotel.id}/500/360`}
                  alt={hotel.name}
                  onError={(e) => e.target.src = `https://via.placeholder.com/500x360/F5EFE6/C97B5F?text=${hotel.name}`}
                />
                <span className="hc-emoji">{hotel.emoji || '🍽️'}</span>
                <span className="hc-distance">
                  <FaMapMarkerAlt /> {hotel.distance.toFixed(1)} km
                </span>
              </div>
              <div className="hc-body-warm">
                <span className="hc-vibe">{hotel.vibe || 'Signature'}</span>
                <h3>{hotel.name}</h3>
                <p className="hc-cuisine">{hotel.cuisine_type}</p>
                <div className="hc-meta-warm">
                  <span><FaStar style={{ color: '#C9A961' }} /> {hotel.rating || 'New'}</span>
                  <span><FaClock /> 20–30 min</span>
                  <span><FaMotorcycle /> Free</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="how-warm">
        <div className="sec-head center">
          <h2>How FoodExpress works</h2>
          <p>Three steps. That's it.</p>
        </div>
        <div className="how-grid">
          {[
            { n: '01', icon: '📍', t: 'Pick Nearby', d: 'See hotels pinned around you. Choose by distance, budget, or vibe.' },
            { n: '02', icon: '🛒', t: 'Order & Pay', d: 'Add to cart, pay with M-Pesa. Payment held safely by FoodExpress.' },
            { n: '03', icon: '🛵', t: 'Track Live', d: 'Watch your rider on the map. Confirm delivery when it arrives.' },
          ].map((s, i) => (
            <div className="how-card-warm" key={i}>
              <span className="how-num">{s.n}</span>
              <span className="how-ic">{s.icon}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;