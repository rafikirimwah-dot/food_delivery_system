// frontend/src/components/Home.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaStar, FaClock, FaMotorcycle, FaArrowRight, FaMapMarkerAlt,
  FaFire, FaSearch, FaTimes
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import LazyImage from './LazyImage';
import './Home.css';

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

const BUDGET_OPTIONS = [
  { id: 'all',     label: 'All Prices',         icon: '🍽️' },
  { id: 'budget',  label: 'Under KSh 700',      icon: '🪙' },
  { id: 'mid',     label: 'KSh 700 – 1,500',    icon: '💵' },
  { id: 'premium', label: 'KSh 1,500 – 3,000',  icon: '💎' },
  { id: 'luxury',  label: 'KSh 3,000+',         icon: '👑' }
];

const CATEGORY_ICONS = {
  pizza: '🍕', burgers: '🍔', burger: '🍔',
  chicken: '🍗', pasta: '🍝', sushi: '🍣',
  sides: '🍟', fries: '🍟', salads: '🥗', salad: '🥗',
  soups: '🍲', soup: '🍲', desserts: '🍰', dessert: '🍰',
  beverages: '🥤', drinks: '🥤', wraps: '🌯', wrap: '🌯',
  sandwiches: '🥪', appetizers: '🥟', main: '🍽️'
};

const getCategoryIcon = (c) => CATEGORY_ICONS[(c || '').toLowerCase().trim()] || '🍽️';

function Home() {
  const [hotels, setHotels] = useState([]);
  const [offerItem, setOfferItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState('all');
  const [budgetItems, setBudgetItems] = useState([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSearch, setBudgetSearch] = useState('');
  const [userLocation] = useState({ lat: -1.286389, lng: 36.817223 });
  const navigate = useNavigate();

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

  useEffect(() => {
    if (budget === 'all') {
      setBudgetItems([]);
      return;
    }
    const fetchFiltered = async () => {
      setBudgetLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/food-items/by-budget?range=${budget}`
        );
        setBudgetItems(res.data.items || []);
      } catch (err) {
        console.error(err);
        setBudgetItems([]);
      } finally {
        setBudgetLoading(false);
      }
    };
    fetchFiltered();
  }, [budget]);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const hotelsWithDistance = useMemo(() => {
    return hotels.map(h => ({
      ...h,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        h.latitude || -1.286389,
        h.longitude || 36.817223
      )
    })).sort((a, b) => a.distance - b.distance);
  }, [hotels, userLocation]);

  const filteredBudgetItems = useMemo(() => {
    if (!budgetSearch.trim()) return budgetItems;
    const q = budgetSearch.toLowerCase();
    return budgetItems.filter(it =>
      it.name.toLowerCase().includes(q) ||
      it.hotel_name.toLowerCase().includes(q) ||
      (it.category || '').toLowerCase().includes(q)
    );
  }, [budgetItems, budgetSearch]);

  const budgetByHotel = useMemo(() => {
    const map = new Map();
    filteredBudgetItems.forEach(item => {
      if (!map.has(item.hotel_id)) {
        map.set(item.hotel_id, {
          hotel_id: item.hotel_id,
          hotel_name: item.hotel_name,
          hotel_emoji: item.hotel_emoji,
          hotel_color: item.hotel_color,
          hotel_vibe: item.hotel_vibe,
          cuisine_type: item.cuisine_type,
          hotel_rating: item.hotel_rating,
          delivery_time_min: item.delivery_time_min,
          delivery_time_max: item.delivery_time_max,
          items: []
        });
      }
      map.get(item.hotel_id).items.push(item);
    });
    return Array.from(map.values());
  }, [filteredBudgetItems]);

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n || 0)).toLocaleString()}`;
  const getBudgetMeta = () => BUDGET_OPTIONS.find(b => b.id === budget);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Preparing something lovely…</p>
      </div>
    );
  }

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
              <a href="#budget" className="btn-ghost-warm">
                <FaSearch /> Filter by Budget
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
                  <LazyImage
                    src={offerItem.image_url}
                    alt={offerItem.name}
                    aspectRatio="16/9"
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
      <section className="budget-warm" id="budget">
        <div className="sec-head">
          <h2>What's your budget today?</h2>
          <p>Tap a range to see every dish in that price bracket — and where it's from.</p>
        </div>
        <div className="budget-pills">
          {BUDGET_OPTIONS.map(opt => (
            <button
              key={opt.id}
              className={`budget-pill ${budget === opt.id ? 'active' : ''}`}
              onClick={() => {
                setBudget(opt.id);
                setBudgetSearch('');
                if (opt.id !== 'all') {
                  setTimeout(() => {
                    document.getElementById('budget-results')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }, 120);
                }
              }}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* BUDGET RESULTS */}
      {budget !== 'all' && (
        <section className="budget-results-warm" id="budget-results">
          <div className="br-header">
            <div>
              <h2>
                {getBudgetMeta()?.icon} Dishes in {getBudgetMeta()?.label}
              </h2>
              <p>
                {budgetLoading
                  ? 'Loading…'
                  : `${filteredBudgetItems.length} dish${filteredBudgetItems.length !== 1 ? 'es' : ''} across ${budgetByHotel.length} restaurant${budgetByHotel.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              className="br-clear"
              onClick={() => {
                setBudget('all');
                setBudgetSearch('');
              }}
            >
              <FaTimes /> Clear filter
            </button>
          </div>

          {!budgetLoading && budgetItems.length > 0 && (
            <div className="br-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search within results (dish or restaurant)…"
                value={budgetSearch}
                onChange={(e) => setBudgetSearch(e.target.value)}
              />
              {budgetSearch && (
                <button className="br-search-clear" onClick={() => setBudgetSearch('')}>
                  <FaTimes />
                </button>
              )}
            </div>
          )}

          {budgetLoading ? (
            <div className="budget-loading">
              <div className="spinner"></div>
              <p>Finding dishes…</p>
            </div>
          ) : budgetByHotel.length === 0 ? (
            <div className="budget-empty">
              <div className="be-icon">🍽️</div>
              <h3>No dishes in this range</h3>
              <p>Try a different price bracket above.</p>
            </div>
          ) : (
            <div className="budget-hotel-groups">
              {budgetByHotel.map(group => (
                <div
                  className="budget-hotel-block"
                  key={group.hotel_id}
                  style={{ '--hotel-color': group.hotel_color || '#C97B5F' }}
                >
                  <Link to={`/hotel/${group.hotel_id}`} className="bhb-head">
                    <div className="bhb-emoji">{group.hotel_emoji || '🍽️'}</div>
                    <div className="bhb-info">
                      <div className="bhb-vibe">{group.hotel_vibe || group.cuisine_type}</div>
                      <h3>{group.hotel_name}</h3>
                      <div className="bhb-meta">
                        <span>
                          <FaStar style={{ color: '#FFC107' }} />
                          {group.hotel_rating || 'New'}
                        </span>
                        <span>
                          <FaClock /> {group.delivery_time_min || 20}–{group.delivery_time_max || 40} min
                        </span>
                        <span><FaMotorcycle /> Free</span>
                      </div>
                    </div>
                    <div className="bhb-arrow">
                      View Menu <FaArrowRight />
                    </div>
                  </Link>

                  <div className="bhb-items">
                    {group.items.map(item => {
                      const hasDiscount = item.is_on_offer && item.discount_percent > 0;
                      const finalPrice = hasDiscount
                        ? item.price * (1 - item.discount_percent / 100)
                        : item.price;

                      return (
                        <Link
                          to={`/hotel/${item.hotel_id}`}
                          key={item.id}
                          className="budget-dish-card"
                        >
                          <div className="bdc-img">
                            <LazyImage
                              src={item.image_url}
                              alt={item.name}
                              aspectRatio="1/1"
                            />
                            {hasDiscount && (
                              <span className="bdc-offer">
                                <FaFire /> -{item.discount_percent}%
                              </span>
                            )}
                          </div>
                          <div className="bdc-info">
                            <div className="bdc-cat">
                              {getCategoryIcon(item.category)} {item.category}
                            </div>
                            <h4>{item.name}</h4>
                            <p className="bdc-desc">
                              {item.description || 'Delicious dish, freshly prepared.'}
                            </p>
                            <div className="bdc-price-row">
                              <span className="bdc-price">{formatKSh(finalPrice)}</span>
                              {hasDiscount && (
                                <span className="bdc-original">{formatKSh(item.price)}</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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
                <LazyImage
                  src={hotel.hero_image_url || `https://picsum.photos/seed/hotel${hotel.id}/500/360`}
                  alt={hotel.name}
                  aspectRatio="5/3.6"
                />
                <span className="hc-emoji">{hotel.emoji || '🍽️'}</span>
                <span className="hc-distance">
                  <FaMapMarkerAlt /> {hotel.distance.toFixed(1)} km
                </span>
                <div
                  className="hc-overlay-grad"
                  style={{
                    background: `linear-gradient(to top, ${hotel.brand_color}99 0%, transparent 60%)`
                  }}
                ></div>
              </div>
              <div className="hc-body-warm">
                <span className="hc-vibe" style={{ background: hotel.brand_color }}>
                  {hotel.vibe || 'Signature'}
                </span>
                <h3>{hotel.name}</h3>
                <p className="hc-tagline">{hotel.tagline || hotel.cuisine_type}</p>
                <div className="hc-meta-warm">
                  <span>
                    <FaStar style={{ color: '#FFD700' }} />
                    {hotel.rating || 'New'}
                    <em>({hotel.rating_count || 0})</em>
                  </span>
                  <span>
                    <FaClock /> {hotel.delivery_time_min || 20}–{hotel.delivery_time_max || 40} min
                  </span>
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