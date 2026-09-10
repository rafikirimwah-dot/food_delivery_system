// frontend/src/components/HotelMenu.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaStar, FaPlus, FaMinus, FaShoppingCart, FaArrowLeft, 
  FaClock, FaMotorcycle, FaFire, FaMapMarkerAlt, FaSearch
} from 'react-icons/fa';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useToast } from './ToastContext';
import './HotelMenu.css';

function HotelMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [menu, setMenu] = useState([]);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const { addToCart } = useContext(CartContext);
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // ============ FETCH HOTEL + MENU ============
  useEffect(() => {
    const fetchHotelMenu = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/hotels/${id}`);
        setHotel(response.data.hotel);

        // Parse prices to numbers and normalize fields
        const menuWithParsedPrices = response.data.menu.map(item => ({
          ...item,
          price: parseFloat(item.price) || 0,
          is_on_offer: Boolean(item.is_on_offer),
          discount_percent: parseInt(item.discount_percent) || 0,
          image_url: item.image_url || `https://picsum.photos/seed/${item.id}/500/350`
        }));

        setMenu(menuWithParsedPrices);
        setFilteredMenu(menuWithParsedPrices);

        // Init quantities
        const initialQuantities = {};
        menuWithParsedPrices.forEach(item => {
          initialQuantities[item.id] = 0;
        });
        setQuantities(initialQuantities);
      } catch (error) {
        console.error('Error fetching hotel menu:', error);
        showToast('Failed to load menu. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelMenu();
  }, [id, showToast]);

  // ============ FILTER LOGIC ============
  useEffect(() => {
    let result = menu;

    if (selectedCategory !== 'All') {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term))
      );
    }

    setFilteredMenu(result);
  }, [selectedCategory, searchTerm, menu]);

  const categories = ['All', ...new Set(menu.map(item => item.category))];

  // ============ HELPERS ============
  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return 'KSh 0';
    return `KSh ${Math.round(num).toLocaleString()}`;
  };

  const getFinalPrice = (item) => {
    if (item.is_on_offer && item.discount_percent > 0) {
      return item.price * (1 - item.discount_percent / 100);
    }
    return item.price;
  };

  const handleQuantityChange = (itemId, change) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change)
    }));
  };

  const handleAddToCart = (item) => {
    const quantity = quantities[item.id] || 0;
    if (quantity === 0) {
      showToast('Please select a quantity first', 'warning');
      return;
    }

    if (!user || user.role !== 'user') {
      showToast('Only customers can place orders', 'error');
      return;
    }

    const finalPrice = getFinalPrice(item);

    addToCart({
      ...item,
      price: finalPrice,
      original_price: item.price,
      quantity,
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      hotel_color: hotel.brand_color,
      hotel_emoji: hotel.emoji
    });

    setQuantities(prev => ({
      ...prev,
      [item.id]: 0
    }));

    showToast(`Added ${quantity}x ${item.name} to cart!`, 'success');
  };

  const handleImageError = (itemId) => {
    setImageErrors(prev => ({ ...prev, [itemId]: true }));
  };

  const getImageUrl = (item) => {
    if (imageErrors[item.id]) {
      return `https://via.placeholder.com/500x350/1C2230/C6FF00?text=${encodeURIComponent(item.name)}`;
    }
    return item.image_url;
  };

  // ============ LOADING / ERROR STATES ============
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading {hotel?.name || 'menu'}...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="error-container">
        <h2>Hotel not found</h2>
        <Link to="/hotels" className="btn-primary">Back to Hotels</Link>
      </div>
    );
  }

  // ============ HOTEL THEME VARIABLES ============
  const hotelColor = hotel.brand_color || '#FF6B35';
  const hotelEmoji = hotel.emoji || '🍽️';

  // ============ RENDER ============
  return (
    <div 
      className="hotel-menu-page" 
      style={{ 
        '--hotel-color': hotelColor,
        '--hotel-color-soft': `${hotelColor}22`,
        '--hotel-color-glow': `${hotelColor}66`
      }}
    >
      {/* ============ HOTEL HEADER ============ */}
      <div 
        className="hotel-header-v2"
        style={{
          background: `linear-gradient(135deg, ${hotelColor} 0%, ${hotelColor}cc 60%, ${hotelColor}99 100%)`
        }}
      >
        <div 
          className="hotel-header-bg-emoji"
          aria-hidden="true"
        >
          {hotelEmoji}
        </div>

        <div className="hotel-header-inner">
          <Link to="/hotels" className="back-btn-v2">
            <FaArrowLeft /> Back to Hotels
          </Link>

          <div className="hotel-header-content">
            <div className="hotel-header-left">
              <div 
                className="hotel-emoji-badge"
                style={{ 
                  boxShadow: `0 0 40px ${hotelColor}`,
                  borderColor: 'rgba(255,255,255,0.9)'
                }}
              >
                {hotelEmoji}
              </div>

              <div className="hotel-title-block">
                <div 
                  className="hotel-vibe-pill"
                  style={{ 
                    background: 'rgba(0,0,0,0.35)',
                    color: '#FFFFFF'
                  }}
                >
                  {hotel.vibe || 'Signature'}
                </div>
                <h1 className="hotel-name-v2">{hotel.name}</h1>
                <p className="hotel-description-v2">
                  {hotel.description || 'Delicious food, prepared with care.'}
                </p>

                <div className="hotel-meta-v2">
                  <span className="meta-chip">
                    <FaStar className="meta-icon-star" />
                    {hotel.rating || 'New'}
                  </span>
                  <span className="meta-chip">
                    <FaMapMarkerAlt className="meta-icon" />
                    {hotel.cuisine_type}
                  </span>
                  <span className="meta-chip">
                    <FaClock className="meta-icon" />
                    20-30 min
                  </span>
                  <span className="meta-chip">
                    <FaMotorcycle className="meta-icon" />
                    Free Delivery
                  </span>
                </div>
              </div>
            </div>

            <div className="hotel-header-right">
              <div className="hotel-stat">
                <div className="hotel-stat-value">{menu.length}</div>
                <div className="hotel-stat-label">Items</div>
              </div>
              <div className="hotel-stat">
                <div className="hotel-stat-value">
                  {menu.filter(i => i.is_on_offer).length}
                </div>
                <div className="hotel-stat-label">On Offer</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MENU SECTION ============ */}
      <div className="menu-section-v2">
        {/* Controls */}
        <div className="menu-controls-v2">
          <div className="category-tabs-v2">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab-v2 ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
                style={
                  selectedCategory === category
                    ? {
                        background: hotelColor,
                        borderColor: hotelColor,
                        boxShadow: `0 8px 24px ${hotelColor}66`
                      }
                    : {}
                }
              >
                {category}
              </button>
            ))}
          </div>

          <div className="menu-search-v2">
            <FaSearch />
            <input
              type="text"
              placeholder="Search in menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="menu-count-v2">
          Showing <strong>{filteredMenu.length}</strong> item{filteredMenu.length !== 1 ? 's' : ''}
          {selectedCategory !== 'All' && ` in "${selectedCategory}"`}
        </div>

        {/* Grid */}
        <div className="menu-grid-v2">
          {filteredMenu.map(item => {
            const finalPrice = getFinalPrice(item);
            const hasDiscount = item.is_on_offer && item.discount_percent > 0;

            return (
              <div 
                className="menu-item-v2" 
                key={item.id}
                style={{ '--item-hotel-color': hotelColor }}
              >
                {/* Image */}
                <div className="mi-image-wrap">
                  <img
                    src={getImageUrl(item)}
                    alt={item.name}
                    onError={() => handleImageError(item.id)}
                    loading="lazy"
                  />
                  <div className="mi-gradient"></div>

                  {/* Offer Badge */}
                  {hasDiscount && (
                    <div 
                      className="mi-offer-badge"
                      style={{
                        background: 'linear-gradient(135deg, #FF3D68, #FFB800)',
                      }}
                    >
                      <FaFire /> -{item.discount_percent}%
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="mi-category-badge">
                    {item.category}
                  </div>
                </div>

                {/* Info */}
                <div className="mi-info">
                  <div className="mi-title-row">
                    <h3>{item.name}</h3>
                  </div>

                  <p className="mi-description">
                    {item.description || 'A delicious dish prepared with care.'}
                  </p>

                  <div className="mi-prep-time">
                    <FaClock /> {item.preparation_time || 15} min prep
                  </div>

                  {/* Price + Actions */}
                  <div className="mi-footer">
                    <div className="mi-price-block">
                      <span className="mi-price-current">
                        {formatPrice(finalPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="mi-price-original">
                          {formatPrice(item.price)}
                        </span>
                      )}
                    </div>

                    {user && user.role === 'user' ? (
                      <div className="mi-actions">
                        <div className="mi-qty-control">
                          <button
                            className={`mi-qty-btn ${quantities[item.id] === 0 ? 'disabled' : ''}`}
                            onClick={() => handleQuantityChange(item.id, -1)}
                            disabled={quantities[item.id] === 0}
                            aria-label="Decrease quantity"
                          >
                            <FaMinus />
                          </button>
                          <span className="mi-qty-value">
                            {quantities[item.id] || 0}
                          </span>
                          <button
                            className="mi-qty-btn"
                            onClick={() => handleQuantityChange(item.id, 1)}
                            aria-label="Increase quantity"
                          >
                            <FaPlus />
                          </button>
                        </div>

                        <button
                          className={`mi-add-btn ${quantities[item.id] > 0 ? 'active' : ''}`}
                          onClick={() => handleAddToCart(item)}
                          disabled={quantities[item.id] === 0}
                          style={
                            quantities[item.id] > 0
                              ? {
                                  background: `linear-gradient(135deg, ${hotelColor}, ${hotelColor}cc)`,
                                  boxShadow: `0 8px 24px ${hotelColor}66`
                                }
                              : {}
                          }
                        >
                          <FaShoppingCart /> Add
                        </button>
                      </div>
                    ) : (
                      <div className="mi-role-restriction">
                        {!user ? (
                          <Link to="/login" className="mi-login-btn">
                            Login to Order
                          </Link>
                        ) : (
                          <span className="mi-restricted-msg">
                            🚫 {user.role}s can't order
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredMenu.length === 0 && (
          <div className="no-items-v2">
            <div className="no-items-icon-v2">🍽️</div>
            <h3>No items found</h3>
            <p>
              {searchTerm 
                ? `Nothing matches "${searchTerm}"` 
                : 'Try selecting a different category'}
            </p>
            {searchTerm && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HotelMenu;