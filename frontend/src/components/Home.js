import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaStar, FaClock, FaMotorcycle, FaFire, FaArrowRight,
  FaMapMarkerAlt, FaWallet, FaCrosshairs
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './Home.css';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom hotel marker
const createHotelIcon = (color, emoji) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background: ${color};
    width: 42px; height: 42px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px ${color}80;
    border: 3px solid white;
  "><span style="transform: rotate(45deg); font-size: 1.2rem;">${emoji}</span></div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -42]
});

const customerIcon = L.divIcon({
  className: 'customer-marker',
  html: `<div style="
    width: 20px; height: 20px;
    background: #C6FF00;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 0 20px #C6FF00, 0 0 40px #C6FF0080;
    animation: pulse-glow 2s infinite;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function Home() {
  const [hotels, setHotels] = useState([]);
  const [offerItem, setOfferItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('nearby');
  const [budget, setBudget] = useState('all');
  const [userLocation, setUserLocation] = useState({ lat: -1.286389, lng: 36.817223 });
  const navigate = useNavigate();

  const budgetOptions = [
    { id: 'all', label: 'All Prices', icon: '💰' },
    { id: 'budget', label: 'Under KSh 700', icon: '🪙' },
    { id: 'mid', label: 'KSh 700-1500', icon: '💵' },
    { id: 'premium', label: 'KSh 1500-3000', icon: '💎' },
    { id: 'luxury', label: 'KSh 3000+', icon: '👑' },
  ];

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location denied, using default Nairobi')
      );
    }
  }, []);

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
    distance: calculateDistance(userLocation.lat, userLocation.lng, h.latitude, h.longitude)
  })).sort((a, b) => a.distance - b.distance);

  const filteredHotels = budget === 'all' ? hotelsWithDistance : hotelsWithDistance.filter(h => {
    const ranges = {
      budget: [0, 700], mid: [700, 1500], premium: [1500, 3000], luxury: [3000, 100000]
    };
    const [min, max] = ranges[budget] || [0, 100000];
    return h.min_price ? h.min_price >= min && h.min_price <= max : true;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Warming up the kitchen...</p>
      </div>
    );
  }

  return (
    <div className="home-v2">
      {/* HERO */}
      <section className="hero-v2">
        <div className="hero-bg">
          <div className="hero-blob blob-1"></div>
          <div className="hero-blob blob-2"></div>
          <div className="hero-blob blob-3"></div>
        </div>

        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-tag">
              <span className="dot"></span>
              <span>Delivery in 20 min · Nairobi</span>
            </div>
            <h1 className="hero-title">
              Your next meal<br />
              is <span className="gradient-text">20 minutes</span> away.
            </h1>
            <p className="hero-subtitle">
              Order from 50+ local restaurants. Track your rider live. Pay with M-Pesa.
            </p>
            <div className="hero-actions">
              <Link to="/hotels" className="btn-hero-primary">
                <FaFire /> Order Now
              </Link>
              <button 
                className="btn-hero-ghost"
                onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <FaMapMarkerAlt /> See Nearby Hotels
              </button>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars">
                <div className="t-avatar" style={{background: '#FF3D68'}}>J</div>
                <div className="t-avatar" style={{background: '#00D4FF'}}>M</div>
                <div className="t-avatar" style={{background: '#C6FF00', color: '#000'}}>A</div>
                <div className="t-avatar" style={{background: '#9D4EDD'}}>K</div>
              </div>
              <div className="trust-text">
                <strong>10,000+</strong> hungry Kenyans served
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-card-stack">
              <div className="food-bubble bubble-1">🍕</div>
              <div className="food-bubble bubble-2">🍔</div>
              <div className="food-bubble bubble-3">🍗</div>
              <div className="food-bubble bubble-4">🍣</div>
              <div className="food-bubble bubble-5">🍝</div>

              {offerItem && (
                <div className="hot-deal-card">
                  <div className="hot-badge">
                    <FaFire /> HOT DEAL
                  </div>
                  <img 
                    src={offerItem.image_url} 
                    alt={offerItem.name}
                    onError={(e) => e.target.src = `https://via.placeholder.com/300x200/FF3D68/ffffff?text=${offerItem.name}`}
                  />
                  <div className="hot-info">
                    <div className="hot-hotel">{offerItem.hotel_name}</div>
                    <h4>{offerItem.name}</h4>
                    <div className="hot-price">
                      <span className="k-price">KSh {Math.round(offerItem.discounted_price)}</span>
                      <span className="k-original">KSh {Math.round(offerItem.price)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BUDGET SELECTOR */}
      <section className="budget-section">
        <div className="section-head">
          <div>
            <h2>What's your budget today?</h2>
            <p>We'll show you hotels that match your wallet</p>
          </div>
        </div>
        <div className="budget-pills">
          {budgetOptions.map(opt => (
            <button
              key={opt.id}
              className={`budget-pill ${budget === opt.id ? 'active' : ''}`}
              onClick={() => setBudget(opt.id)}
            >
              <span className="pill-icon">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* MAP SECTION */}
      <section className="map-section" id="map-section">
        <div className="section-head">
          <div>
            <h2><FaCrosshairs /> Hotels Near You</h2>
            <p>Live map · Pinned by proximity · {hotels.length} hotels around {userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}</p>
          </div>
        </div>

        <div className="map-container">
          <MapContainer 
            center={[userLocation.lat, userLocation.lng]} 
            zoom={13} 
            style={{ height: '500px', width: '100%', borderRadius: '24px' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Customer marker */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={customerIcon}>
              <Popup>
                <div style={{color: '#333'}}>
                  <strong>📍 You are here</strong>
                </div>
              </Popup>
            </Marker>

            {/* Delivery radius circle */}
            <Circle 
              center={[userLocation.lat, userLocation.lng]}
              radius={5000}
              pathOptions={{ color: '#C6FF00', fillColor: '#C6FF00', fillOpacity: 0.05 }}
            />

            {/* Hotel markers */}
            {hotelsWithDistance.map(hotel => (
              <React.Fragment key={hotel.id}>
                <Marker 
                  position={[hotel.latitude, hotel.longitude]} 
                  icon={createHotelIcon(hotel.brand_color || '#FF6B35', hotel.emoji || '🍽️')}
                >
                  <Popup>
                    <div style={{color: '#333', minWidth: '180px'}}>
                      <strong style={{fontSize: '1rem'}}>{hotel.emoji} {hotel.name}</strong>
                      <p style={{margin: '0.3rem 0', fontSize: '0.85rem'}}>{hotel.cuisine_type}</p>
                      <p style={{color: hotel.brand_color, fontWeight: '700', margin: '0.3rem 0'}}>
                        {hotel.distance.toFixed(2)} km away
                      </p>
                      <button 
                        onClick={() => navigate(`/hotel/${hotel.id}`)}
                        style={{
                          background: hotel.brand_color,
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '50px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          width: '100%',
                          marginTop: '0.5rem'
                        }}
                      >
                        Order Now
                      </button>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* HOTELS NEARBY LIST */}
      <section className="hotels-section-v2">
        <div className="section-head">
          <div>
            <h2>🍽️ Restaurants Near You</h2>
            <p>Sorted by distance · Budget filter applied</p>
          </div>
          <Link to="/hotels" className="link-all">
            View All <FaArrowRight />
          </Link>
        </div>

        <div className="hotel-grid-v2">
          {filteredHotels.map((hotel, idx) => (
            <Link 
              to={`/hotel/${hotel.id}`} 
              key={hotel.id} 
              className="hotel-card-v2"
              style={{ 
                '--hotel-color': hotel.brand_color,
                animationDelay: `${idx * 0.08}s`
              }}
            >
              <div className="hc-image">
                <img 
                  src={`https://picsum.photos/seed/hotel${hotel.id}/500/350`} 
                  alt={hotel.name}
                  onError={(e) => e.target.src = `https://via.placeholder.com/500x350/${hotel.brand_color?.replace('#','')}/ffffff?text=${hotel.name}`}
                />
                <div className="hc-overlay"></div>
                <div className="hc-emoji">{hotel.emoji}</div>
                <div className="hc-distance">
                  <FaMapMarkerAlt /> {hotel.distance.toFixed(1)} km
                </div>
              </div>
              <div className="hc-body">
                <div className="hc-vibe" style={{background: `${hotel.brand_color}20`, color: hotel.brand_color}}>
                  {hotel.vibe}
                </div>
                <h3>{hotel.name}</h3>
                <p className="hc-cuisine">{hotel.cuisine_type}</p>
                <p className="hc-desc">{hotel.description}</p>
                <div className="hc-footer">
                  <span className="hc-rating">
                    <FaStar /> {hotel.rating}
                  </span>
                  <span className="hc-time">
                    <FaClock /> 20-30 min
                  </span>
                  <span className="hc-delivery">
                    <FaMotorcycle /> Free
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section">
        <div className="section-head center">
          <h2>How FoodExpress Works</h2>
          <p>Three steps. That's it.</p>
        </div>
        <div className="how-grid">
          <div className="how-card">
            <div className="how-num">01</div>
            <div className="how-icon">📍</div>
            <h3>Pick Nearby</h3>
            <p>See hotels pinned on the map around you. Choose by distance, budget, or vibe.</p>
          </div>
          <div className="how-card">
            <div className="how-num">02</div>
            <div className="how-icon">🛒</div>
            <h3>Order & Pay</h3>
            <p>Add to cart, checkout with M-Pesa. Payment held safely by FoodExpress.</p>
          </div>
          <div className="how-card">
            <div className="how-num">03</div>
            <div className="how-icon">🛵</div>
            <h3>Track Live</h3>
            <p>Watch your rider on the map in real-time. Confirm delivery when it arrives.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;