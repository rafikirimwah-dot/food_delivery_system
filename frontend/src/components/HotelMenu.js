// frontend/src/components/HotelMenu.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaStar, FaPlus, FaMinus, FaShoppingCart, FaArrowLeft,
  FaClock, FaMotorcycle, FaSearch, FaFire
} from 'react-icons/fa';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useToast } from './ToastContext';
import LazyImage from './LazyImage';
import ReviewsList from './ReviewsList';
import './HotelMenu.css';

const CATEGORY_ICONS = {
  pizza: '🍕', burgers: '🍔', burger: '🍔',
  chicken: '🍗', pasta: '🍝', sushi: '🍣',
  sides: '🍟', fries: '🍟', salads: '🥗', salad: '🥗',
  soups: '🍲', soup: '🍲', desserts: '🍰', dessert: '🍰',
  beverages: '🥤', drinks: '🥤', wraps: '🌯', wrap: '🌯',
  sandwiches: '🥪', appetizers: '🥟', main: '🍽️'
};

const DIET_TAGS = [
  { id: 'vegetarian', label: '🥗 Vegetarian', color: '#8FA68E' },
  { id: 'vegan', label: '🌱 Vegan', color: '#00B248' },
  { id: 'halal', label: '☪️ Halal', color: '#4CAF50' },
  { id: 'spicy', label: '🌶️ Spicy', color: '#E53935' },
  { id: 'gluten-free', label: '🌾 Gluten-free', color: '#FFB800' },
  { id: 'contains-nuts', label: '🥜 Nuts', color: '#8D6E63' },
  { id: 'contains-dairy', label: '🥛 Dairy', color: '#64B5F6' },
  { id: 'contains-eggs', label: '🥚 Eggs', color: '#FFD54F' },
  { id: 'contains-seafood', label: '🦐 Seafood', color: '#26A69A' },
  { id: 'new', label: '✨ New', color: '#9D4EDD' },
  { id: 'popular', label: '🔥 Popular', color: '#FF3D68' },
  { id: 'chef', label: "👨‍🍳 Chef's pick", color: '#C9A961' }
];

const getCategoryIcon = (c) => CATEGORY_ICONS[(c || '').toLowerCase().trim()] || '🍽️';

function HotelMenu() {
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [menu, setMenu] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const { addToCart } = useContext(CartContext);
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const PRICE_RANGES = [
    { id: 'all', label: 'All Prices', min: null, max: null },
    { id: 'budget', label: 'Under KSh 500', min: 0, max: 500 },
    { id: 'mid', label: 'KSh 500 – 1,000', min: 500, max: 1000 },
    { id: 'premium', label: 'KSh 1,000 – 2,000', min: 1000, max: 2000 },
    { id: 'luxury', label: 'KSh 2,000+', min: 2000, max: 999999 }
  ];

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/hotels/${id}`);
        setHotel(response.data.hotel);
        const parsed = response.data.menu.map(item => ({
          ...item,
          price: parseFloat(item.price) || 0,
          is_on_offer: Boolean(item.is_on_offer),
          discount_percent: parseInt(item.discount_percent) || 0,
          image_url: item.image_url || `https://picsum.photos/seed/${item.id}/500/360`
        }));
        setMenu(parsed);
        setFiltered(parsed);
        const init = {};
        parsed.forEach(i => { init[i.id] = 0; });
        setQuantities(init);
      } catch (err) {
        console.error(err);
        showToast('Failed to load menu', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id, showToast]);

  useEffect(() => {
    let r = [...menu]; // Create a copy
    
    // Category filter
    if (selectedCategory !== 'All') {
      r = r.filter(i => (i.category || '').toLowerCase().trim() === selectedCategory.toLowerCase());
    }
    
    // Price filter
    if (priceFilter !== 'all') {
      const range = PRICE_RANGES.find(p => p.id === priceFilter);
      if (range && range.min !== null && range.max !== null) {
        r = r.filter(i => {
          const price = parseFloat(i.price) || 0;
          return price >= range.min && price <= range.max;
        });
      }
    }
    
    // Search filter
    if (search.trim()) {
      const t = search.toLowerCase().trim();
      r = r.filter(i => {
        const name = (i.name || '').toLowerCase();
        const desc = (i.description || '').toLowerCase();
        return name.includes(t) || desc.includes(t);
      });
    }
    
    setFiltered(r);
  }, [selectedCategory, search, menu, priceFilter]);

  const categories = ['All', ...new Set(menu.map(i => i.category))];
  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n)).toLocaleString()}`;
  const finalPrice = (item) => item.is_on_offer && item.discount_percent > 0
    ? item.price * (1 - item.discount_percent / 100)
    : item.price;

  const changeQty = (id, delta) =>
    setQuantities(p => ({ ...p, [id]: Math.max(0, (p[id] || 0) + delta) }));

  const handleAdd = (item) => {
    const q = quantities[item.id] || 0;
    if (q === 0) return showToast('Select a quantity first', 'warning');
    if (!user || user.role !== 'user') return showToast('Only customers can order', 'error');

    addToCart({
      ...item,
      price: finalPrice(item),
      original_price: item.price,
      quantity: q,
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      hotel_color: hotel.brand_color,
      hotel_emoji: hotel.emoji
    });
    setQuantities(p => ({ ...p, [item.id]: 0 }));
    showToast(`Added ${q}× ${item.name} to cart`, 'success');
  };

  const imgError = (id) => setImageErrors(p => ({ ...p, [id]: true }));
  const imgSrc = (item) => imageErrors[item.id] ? null : item.image_url;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading menu…</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="loading-container">
        <h2>Restaurant not found</h2>
        <Link to="/hotels" className="btn-primary-warm">Back to Restaurants</Link>
      </div>
    );
  }

  const hotelColor = hotel.brand_color || '#C97B5F';

  return (
    <div className="hotel-page-warm" style={{ '--hotel-color': hotelColor }}>
      {/* HERO */}
      <div className="hotel-hero-v2">
        <div
          className="hh-bg"
          style={{
            backgroundImage: `url(${hotel.hero_image_url || `https://picsum.photos/seed/hotel${hotel.id}/1600/600`})`
          }}
        >
          <div
            className="hh-overlay"
            style={{
              background: `linear-gradient(135deg, ${hotelColor}DD 0%, ${hotelColor}99 50%, ${hotelColor}CC 100%)`
            }}
          ></div>
        </div>

        <div className="hh-inner">
          <Link to="/hotels" className="back-btn-warm">
            <FaArrowLeft /> Back
          </Link>

          <div className="hh-content">
            <div className="hh-left">
              <div className="hh-emoji-circle">
                <span>{hotel.emoji || '🍽️'}</span>
              </div>

              <div className="hh-info">
                <span className="hh-vibe-pill">{hotel.vibe || 'Signature'}</span>
                <h1>{hotel.name}</h1>
                <p className="hh-tagline">{hotel.tagline || hotel.description}</p>

                <div className="hh-chips">
                  <span>
                    <FaStar style={{ color: '#FFD700' }} /> {hotel.rating || 'New'} · {hotel.rating_count || 0} reviews
                  </span>
                  <span><FaClock /> {hotel.delivery_time_min || 20}–{hotel.delivery_time_max || 40} min</span>
                  <span><FaMotorcycle /> Free delivery</span>
                  <span>🕐 {hotel.opening_hours || 'Open'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STORY */}
      <div className="hotel-story-v2">
        <div className="story-main">
          <h2>About {hotel.name}</h2>
          <p className="story-text">{hotel.story || hotel.description}</p>

          {hotel.specialties && (
            <div className="story-specialties">
              <span className="specialties-label">Known for:</span>
              <div className="specialties-chips">
                {hotel.specialties.split('·').map((s, i) => (
                  <span key={i} className="spec-chip" style={{
                    background: `${hotelColor}15`,
                    color: hotelColor,
                    borderColor: `${hotelColor}40`
                  }}>
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {hotel.signature_dish && (
          <div className="signature-card" style={{
            background: `linear-gradient(135deg, ${hotelColor}10, ${hotelColor}05)`,
            borderColor: `${hotelColor}30`
          }}>
            <div className="sig-label">✨ Signature dish</div>
            <div className="sig-name">{hotel.signature_dish}</div>
            <div className="sig-sub">Chef's recommendation</div>
          </div>
        )}
      </div>

      {/* MENU */}
      <div className="menu-wrap-warm">
        <div className="menu-controls-warm">
          <div className="cat-tabs-warm">
            {categories.map(c => (
              <button
                key={c}
                className={`cat-tab-warm ${selectedCategory === c ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="menu-filters-row">
            <div className="menu-search-warm">
              <FaSearch />
              <input
                type="text"
                placeholder="Search menu…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="menu-price-filter"
              value={priceFilter} 
              onChange={e => setPriceFilter(e.target.value)}
            >
              {PRICE_RANGES.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="menu-count-warm">
          <strong>{filtered.length}</strong> item{filtered.length !== 1 && 's'}
          {selectedCategory !== 'All' && ` · ${selectedCategory}`}
          {priceFilter !== 'all' && ` · ${PRICE_RANGES.find(p => p.id === priceFilter)?.label}`}
        </div>

        <div className="menu-grid-warm">
          {filtered.map(item => {
            const price = finalPrice(item);
            const hasDiscount = item.is_on_offer && item.discount_percent > 0;
            const dietTags = (item.diet_tags || '').split(',').filter(Boolean);

            return (
              <div className="menu-card-warm" key={item.id}>
                <div className="mc-img-warm">
                  {imgSrc(item) ? (
                    <LazyImage
                      src={imgSrc(item)}
                      alt={item.name}
                      aspectRatio="16/9"
                      onError={() => imgError(item.id)}
                    />
                  ) : (
                    <div className="mc-img-placeholder-warm">
                      <span>{getCategoryIcon(item.category)}</span>
                      <p>{item.name}</p>
                    </div>
                  )}
                  {hasDiscount && (
                    <span className="mc-offer-badge">
                      <FaFire /> -{item.discount_percent}%
                    </span>
                  )}
                  <span className="mc-cat-badge">
                    {getCategoryIcon(item.category)} {item.category}
                  </span>
                </div>

                <div className="mc-body-warm">
                  <div className="mc-head">
                    <h3>{item.name}</h3>
                  </div>
                  <p className="mc-desc">{item.description || 'A delicious dish, prepared with care.'}</p>

                  {dietTags.length > 0 && (
                    <div className="mc-diet-tags">
                      {dietTags.map((tagId, i) => {
                        const tag = DIET_TAGS.find(t => t.id === tagId.trim());
                        if (!tag) return null;
                        return (
                          <span key={i} className="mc-diet-tag"
                            style={{ background: `${tag.color}20`, color: tag.color }}>
                            {tag.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <span className="mc-prep"><FaClock /> {item.preparation_time || 15} min</span>

                  <div className="mc-footer-warm">
                    <div className="mc-prices">
                      <span className="mc-price-current">{formatKSh(price)}</span>
                      {hasDiscount && (
                        <span className="mc-price-original">{formatKSh(item.price)}</span>
                      )}
                    </div>

                    {user?.role === 'user' ? (
                      <div className="mc-actions">
                        <div className="qty-warm">
                          <button
                            onClick={() => changeQty(item.id, -1)}
                            disabled={!quantities[item.id]}
                            aria-label="Decrease"
                          >
                            <FaMinus />
                          </button>
                          <span>{quantities[item.id] || 0}</span>
                          <button onClick={() => changeQty(item.id, 1)} aria-label="Increase">
                            <FaPlus />
                          </button>
                        </div>
                        <button
                          className={`add-btn-warm ${quantities[item.id] > 0 ? 'active' : ''}`}
                          onClick={() => handleAdd(item)}
                          disabled={!quantities[item.id]}
                        >
                          <FaShoppingCart /> Add
                        </button>
                      </div>
                    ) : (
                      <div className="mc-restrict">
                        {!user ? (
                          <Link to="/login" className="login-link">Login to Order</Link>
                        ) : (
                          <span className="restrict-note">Only customers can order</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="menu-empty">
            <span>🍽️</span>
            <h3>Nothing matches</h3>
            <p>Try a different category or search term.</p>
            {search && (
              <button className="btn-ghost-warm" onClick={() => setSearch('')}>Clear search</button>
            )}
          </div>
        )}
      </div>

      {/* REVIEWS */}
      <ReviewsList hotelId={hotel.id} />
    </div>
  );
}

export default HotelMenu;