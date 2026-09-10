// frontend/src/components/Cart.js
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaTrash, FaPlus, FaMinus, FaArrowLeft, FaShoppingBag, 
  FaMotorcycle, FaShieldAlt, FaArrowRight 
} from 'react-icons/fa';
import { CartContext } from '../context/CartContext';
import { useToast } from './ToastContext';
import './Cart.css';

function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getTotal, clearCart } = useContext(CartContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return 'KSh 0';
    return `KSh ${Math.round(num).toLocaleString()}`;
  };

  const handleCheckout = () => {
    if (!user || user.role !== 'user') {
      showToast('Please login as a customer to checkout', 'error');
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      clearCart();
      showToast('Cart cleared', 'info');
    }
  };

  // ============ EMPTY STATE ============
  if (cartItems.length === 0) {
    return (
      <div className="cart-empty-v2">
        <div className="empty-orb">
          <FaShoppingBag />
        </div>
        <h1>Your cart is empty</h1>
        <p>Hungry? Let's fix that. Browse our hotels and add something delicious.</p>
        <Link to="/hotels" className="btn-hero-primary">
          <FaArrowRight /> Browse Restaurants
        </Link>
      </div>
    );
  }

  const subtotal = getTotal();
  const deliveryFee = 0;
  const serviceFee = 0;
  const total = subtotal + deliveryFee + serviceFee;

  return (
    <div className="cart-page-v2">
      <div className="cart-header-v2">
        <Link to="/hotels" className="back-link-v2">
          <FaArrowLeft /> Continue Shopping
        </Link>
        <div className="cart-title-block">
          <h1>Your Cart</h1>
          <p>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} ready to order</p>
        </div>
        <button className="clear-cart-btn-v2" onClick={handleClearCart}>
          <FaTrash /> Clear All
        </button>
      </div>

      <div className="cart-layout">
        {/* ITEMS */}
        <div className="cart-items-v2">
          {cartItems.map(item => {
            const hotelColor = item.hotel_color || '#FF6B35';
            return (
              <div 
                className="cart-item-v2" 
                key={item.id}
                style={{ '--item-color': hotelColor }}
              >
                <div className="ci-image">
                  <img
                    src={item.image_url || `https://picsum.photos/seed/${item.id}/200/200`}
                    alt={item.name}
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/200x200/1C2230/C6FF00?text=${encodeURIComponent(item.name)}`;
                    }}
                  />
                  {item.is_on_offer && (
                    <span className="ci-offer-tag">
                      -{item.discount_percent}%
                    </span>
                  )}
                </div>

                <div className="ci-info">
                  <div 
                    className="ci-hotel-tag"
                    style={{
                      background: `${hotelColor}22`,
                      color: hotelColor,
                      borderColor: hotelColor
                    }}
                  >
                    {item.hotel_emoji} {item.hotel_name}
                  </div>
                  <h3>{item.name}</h3>
                  <p className="ci-desc">{item.description || 'Delicious dish'}</p>
                  <div className="ci-price">
                    <span className="ci-price-current">{formatPrice(item.price)}</span>
                    {item.original_price && item.original_price !== item.price && (
                      <span className="ci-price-original">
                        {formatPrice(item.original_price)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ci-controls">
                  <div className="ci-qty">
                    <button 
                      className="ci-qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <FaMinus />
                    </button>
                    <span className="ci-qty-value">{item.quantity}</span>
                    <button 
                      className="ci-qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className="ci-subtotal">
                    <span className="ci-subtotal-label">Subtotal</span>
                    <span className="ci-subtotal-value">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>

                  <button 
                    className="ci-remove"
                    onClick={() => {
                      removeFromCart(item.id);
                      showToast(`${item.name} removed`, 'info');
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY */}
        <div className="cart-summary-v2">
          <div className="cs-header">
            <h2>Order Summary</h2>
            <span className="cs-items-count">
              {cartItems.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>

          <div className="cs-rows">
            <div className="cs-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="cs-row">
              <span><FaMotorcycle /> Delivery Fee</span>
              <span className="cs-free">FREE</span>
            </div>
            <div className="cs-row">
              <span>Service Fee</span>
              <span className="cs-free">FREE</span>
            </div>
          </div>

          <div className="cs-divider"></div>

          <div className="cs-total-row">
            <span>Total</span>
            <span className="cs-total-value">{formatPrice(total)}</span>
          </div>

          <button 
            className="checkout-btn-v2"
            onClick={handleCheckout}
          >
            Proceed to Checkout <FaArrowRight />
          </button>

          <div className="cs-perks">
            <div className="perk">
              <FaShieldAlt /> Secure payment
            </div>
            <div className="perk">
              <FaMotorcycle /> 20-30 min delivery
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;