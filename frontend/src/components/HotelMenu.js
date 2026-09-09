// frontend/src/components/HotelMenu.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaStar, FaPlus, FaMinus, FaShoppingCart, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useToast } from './ToastContext';
import './HotelMenu.css';

function HotelMenu() {
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [menu, setMenu] = useState([]);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const { addToCart } = useContext(CartContext);
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    const fetchHotelMenu = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/hotels/${id}`);
        setHotel(response.data.hotel);
        setMenu(response.data.menu);
        setFilteredMenu(response.data.menu);
        
        // Initialize quantities
        const initialQuantities = {};
        response.data.menu.forEach(item => {
          initialQuantities[item.id] = 0;
        });
        setQuantities(initialQuantities);
      } catch (error) {
        console.error('Error fetching hotel menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotelMenu();
  }, [id]);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredMenu(menu);
    } else {
      setFilteredMenu(menu.filter(item => item.category === selectedCategory));
    }
  }, [selectedCategory, menu]);

  const categories = ['All', ...new Set(menu.map(item => item.category))];

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

    // Check if user is allowed to order
    if (!user || user.role !== 'user') {
      showToast('Only customers can place orders', 'error');
      return;
    }

    addToCart({
      ...item,
      quantity,
      hotel_id: hotel.id,
      hotel_name: hotel.name
    });

    // Reset quantity for this item
    setQuantities(prev => ({
      ...prev,
      [item.id]: 0
    }));

    showToast(`Added ${item.quantity}x ${item.name} to cart!`, 'success');
  };

  const handleImageError = (itemId) => {
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  const getImageUrl = (item) => {
    if (imageErrors[item.id]) {
      return `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(item.name)}`;
    }
    return item.image_url || `https://picsum.photos/seed/${item.id}/400/300`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading menu...</p>
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

  return (
    <div className="hotel-menu-page">
      <div className="hotel-header">
        <div className="hotel-header-content">
          <Link to="/hotels" className="back-btn">
            <FaArrowLeft /> Back to Hotels
          </Link>
          <div className="hotel-info">
            <h1>{hotel.name}</h1>
            <div className="hotel-meta">
              <span className="cuisine-type">{hotel.cuisine_type}</span>
              <span className="rating">
                <FaStar className="star-icon" /> {hotel.rating || 'New'}
              </span>
              <span className="delivery-info">🚚 Free Delivery</span>
              <span className="prep-time">⏱️ 30-45 min</span>
            </div>
            <p className="hotel-description">{hotel.description}</p>
          </div>
        </div>
      </div>

      <div className="menu-section">
        <div className="menu-controls">
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="menu-count">
            {filteredMenu.length} items
          </div>
        </div>

        <div className="menu-grid">
          {filteredMenu.map(item => {
            const numericPrice = Number(item.price ?? 0);
            return (
              <div className="menu-item-card" key={item.id}>
                <div className="menu-item-image">
                  <img 
                    src={getImageUrl(item)} 
                    alt={item.name}
                    onError={() => handleImageError(item.id)}
                    loading="lazy"
                  />
                  {numericPrice >= 20 && (
                    <span className="premium-badge">⭐ Premium</span>
                  )}
                  {numericPrice < 10 && (
                    <span className="value-badge">💲 Great Value</span>
                  )}
                </div>
                <div className="menu-item-info">
                  <div className="item-header">
                    <h3>{item.name}</h3>
                    <span className="item-category">{item.category}</span>
                  </div>
                  <p className="item-description">{item.description}</p>
                  <div className="item-footer">
                    <div className="price-section">
                      <span className="item-price">${numericPrice.toFixed(2)}</span>
                      <span className="prep-time-small">⏱️ {item.preparation_time || 15} min</span>
                    </div>
                  {user && user.role === 'user' ? (
                    <div className="quantity-control">
                      <button 
                        className={`qty-btn ${quantities[item.id] === 0 ? 'disabled' : ''}`}
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={quantities[item.id] === 0}
                      >
                        <FaMinus />
                      </button>
                      <span className="qty-display">{quantities[item.id] || 0}</span>
                      <button 
                        className="qty-btn"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <FaPlus />
                      </button>
                      <button 
                        className={`add-to-cart-btn ${quantities[item.id] > 0 ? 'active' : ''}`}
                        onClick={() => handleAddToCart(item)}
                      >
                        <FaShoppingCart /> Add
                      </button>
                    </div>
                  ) : (
                    <div className="role-restriction">
                      {!user ? (
                        <Link to="/login" className="login-to-order">Login to Order</Link>
                      ) : (
                        <span className="restricted-msg">🚫 {user.role}s can't order</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {filteredMenu.length === 0 && (
          <div className="no-items">
            <div className="no-items-icon">🍽️</div>
            <h3>No items available</h3>
            <p>Try selecting a different category</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HotelMenu;