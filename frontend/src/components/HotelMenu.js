import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaStar, FaPlus, FaMinus, FaShoppingCart, FaArrowLeft,
  FaClock, FaMotorcycle, FaMapMarkerAlt, FaSearch, FaFire
} from 'react-icons/fa';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useToast } from './ToastContext';
import './HotelMenu.css';

function HotelMenu() {
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [menu, setMenu] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const { addToCart } = useContext(CartContext);
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

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
    let r = menu;
    if (selectedCategory !== 'All') r = r.filter(i => i.category === selectedCategory);
    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(i =>
        i.name.toLowerCase().includes(t) ||
        (i.description || '').toLowerCase().includes(t)
      );
    }
    setFiltered(r);
  }, [selectedCategory, search, menu]);

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

  const imgSrc = (item) => imageErrors[item.id]
    ? `https://via.placeholder.com/500x360/F5EFE6/C97B5F?text=${encodeURIComponent(item.name)}`
    : item.image_url;

  if (loading) return <div className="loading-container"><div className="spinner" /><p>Loading menu…</p></div>;

  if (!hotel) return (
    <div className="loading-container">
      <h2>Restaurant not found</h2>
      <Link to="/hotels" className="btn-primary-warm">Back to Restaurants</Link>
    </div>
  );

  const hotelColor = hotel.brand_color || '#C97B5F';

  return (
    <div className="hotel-page-warm" style={{ '--hotel-color': hotelColor }}>
      {/* HEADER */}
      <div className="hotel-hero-warm">
        <div className="hotel-hero-bg-emoji">{hotel.emoji || '🍽️'}</div>
        <div className="hotel-hero-inner">
          <Link to="/hotels" className="back-btn-warm">
            <FaArrowLeft /> Back to Restaurants
          </Link>

          <div className="hotel-hero-content">
            <div className="hotel-hero-emoji">{hotel.emoji || '🍽️'}</div>
            <div className="hotel-hero-info">
              <span className="hotel-vibe-tag">{hotel.vibe || 'Signature'}</span>
              <h1>{hotel.name}</h1>
              <p className="hotel-hero-desc">{hotel.description}</p>
              <div className="hotel-chips">
                <span><FaStar style={{ color: '#C9A961' }} /> {hotel.rating || 'New'}</span>
                <span><FaMapMarkerAlt /> {hotel.cuisine_type}</span>
                <span><FaClock /> 20–30 min</span>
                <span><FaMotorcycle /> Free delivery</span>
              </div>
            </div>
          </div>
        </div>
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
          <div className="menu-search-warm">
            <FaSearch />
            <input
              type="text"
              placeholder="Search menu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="menu-count-warm">
          <strong>{filtered.length}</strong> item{filtered.length !== 1 && 's'}
          {selectedCategory !== 'All' && ` · ${selectedCategory}`}
        </div>

        <div className="menu-grid-warm">
          {filtered.map(item => {
            const price = finalPrice(item);
            const hasDiscount = item.is_on_offer && item.discount_percent > 0;
            return (
              <div className="menu-card-warm" key={item.id}>
                <div className="mc-img-warm">
                  <img src={imgSrc(item)} alt={item.name} onError={() => imgError(item.id)} loading="lazy" />
                  {hasDiscount && (
                    <span className="mc-offer-badge">
                      <FaFire /> -{item.discount_percent}%
                    </span>
                  )}
                  <span className="mc-cat-badge">{item.category}</span>
                </div>

                <div className="mc-body-warm">
                  <div className="mc-head">
                    <h3>{item.name}</h3>
                  </div>
                  <p className="mc-desc">{item.description || 'A delicious dish, prepared with care.'}</p>
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
    </div>
  );
}

export default HotelMenu;