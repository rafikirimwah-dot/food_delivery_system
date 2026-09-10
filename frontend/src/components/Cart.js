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

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n)).toLocaleString()}`;

  const handleCheckout = () => {
    if (!user || user.role !== 'user') {
      showToast('Please login as a customer to checkout', 'error');
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  const handleClear = () => {
    if (window.confirm('Clear all items?')) {
      clearCart();
      showToast('Cart cleared', 'info');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-empty-warm">
        <div className="empty-orb-warm"><FaShoppingBag /></div>
        <h1>Your cart is empty</h1>
        <p>Let's find something delicious to fill it with.</p>
        <Link to="/hotels" className="btn-primary-warm">
          Browse Restaurants <FaArrowRight />
        </Link>
      </div>
    );
  }

  const subtotal = getTotal();

  return (
    <div className="cart-page-warm">
      <div className="cart-head-warm">
        <Link to="/hotels" className="back-btn-warm">
          <FaArrowLeft /> Continue Shopping
        </Link>
        <div className="cart-title-warm">
          <h1>Your Cart</h1>
          <p>{cartItems.length} item{cartItems.length !== 1 && 's'}</p>
        </div>
        <button className="clear-btn-warm" onClick={handleClear}>
          <FaTrash /> Clear
        </button>
      </div>

      <div className="cart-layout-warm">
        <div className="cart-items-warm">
          {cartItems.map(item => (
            <div className="cart-item-warm" key={item.id}>
              <div className="ci-img-warm">
                <img
                  src={item.image_url || `https://picsum.photos/seed/${item.id}/200/200`}
                  alt={item.name}
                  onError={(e) => e.target.src = `https://via.placeholder.com/200x200/F5EFE6/C97B5F?text=${item.name}`}
                />
                {item.is_on_offer && (
                  <span className="ci-offer">-{item.discount_percent}%</span>
                )}
              </div>

              <div className="ci-info-warm">
                <span className="ci-hotel-tag">
                  {item.hotel_emoji} {item.hotel_name}
                </span>
                <h3>{item.name}</h3>
                <p className="ci-desc-warm">{item.description || 'Delicious dish'}</p>
                <div className="ci-price-row">
                  <span className="ci-price-warm">{formatKSh(item.price)}</span>
                  {item.original_price && item.original_price !== item.price && (
                    <span className="ci-orig-warm">{formatKSh(item.original_price)}</span>
                  )}
                </div>
              </div>

              <div className="ci-controls-warm">
                <div className="ci-qty-warm">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    <FaMinus />
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <FaPlus />
                  </button>
                </div>
                <div className="ci-subtotal-warm">
                  <span className="ci-sub-label">Subtotal</span>
                  <span className="ci-sub-value">{formatKSh(item.price * item.quantity)}</span>
                </div>
                <button
                  className="ci-remove-warm"
                  onClick={() => {
                    removeFromCart(item.id);
                    showToast(`${item.name} removed`, 'info');
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="cart-summary-warm">
          <h2>Order Summary</h2>
          <div className="cs-row-warm">
            <span>Subtotal</span>
            <span>{formatKSh(subtotal)}</span>
          </div>
          <div className="cs-row-warm">
            <span><FaMotorcycle /> Delivery</span>
            <span className="cs-free">FREE</span>
          </div>
          <div className="cs-row-warm">
            <span>Service Fee</span>
            <span className="cs-free">FREE</span>
          </div>

          <div className="cs-divider-warm" />

          <div className="cs-total-warm">
            <span>Total</span>
            <span className="cs-total-val">{formatKSh(subtotal)}</span>
          </div>

          <button className="checkout-btn-warm" onClick={handleCheckout}>
            Proceed to Checkout <FaArrowRight />
          </button>

          <div className="cs-perks-warm">
            <span><FaShieldAlt /> Secure payment</span>
            <span><FaMotorcycle /> 20–30 min delivery</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Cart;