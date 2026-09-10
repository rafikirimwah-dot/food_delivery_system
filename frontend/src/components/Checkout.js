// frontend/src/components/Checkout.js
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaMapMarkerAlt, FaMobileAlt, FaMoneyBillWave, 
  FaCreditCard, FaCheckCircle, FaMotorcycle, FaShieldAlt 
} from 'react-icons/fa';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useToast } from './ToastContext';
import './Checkout.css';

function Checkout() {
  const { cartItems, getTotal, clearCart } = useContext(CartContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [formData, setFormData] = useState({
    address: user?.address || '',
    phone: user?.phone || '',
    payment_method: 'mpesa',
    mpesa_number: user?.phone || '',
    instructions: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return 'KSh 0';
    return `KSh ${Math.round(num).toLocaleString()}`;
  };

  const total = getTotal();
  const deliveryFee = 0;
  const finalTotal = total + deliveryFee;

  // If cart is empty and not completed, redirect
  if (cartItems.length === 0 && !orderComplete) {
    return (
      <div className="checkout-page-v2">
        <div className="checkout-empty">
          <h2>Your cart is empty</h2>
          <Link to="/hotels" className="btn-hero-primary">Browse Restaurants</Link>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.address.trim()) {
      showToast('Please enter a delivery address', 'warning');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      showToast('Please enter a valid phone number', 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const hotelId = cartItems[0]?.hotel_id;

      // Simulate payment processing
      await new Promise(r => setTimeout(r, 1800));

      const response = await axios.post(
        'http://localhost:5000/api/orders',
        {
          hotel_id: hotelId,
          items: cartItems.map(item => ({
            food_item_id: item.id,
            quantity: item.quantity,
            price: item.price
          })),
          delivery_address: formData.address,
          payment_method: formData.payment_method
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrderId(response.data.order_id);
      setOrderComplete(true);
      clearCart();
      showToast('Payment successful! Order placed 🎉', 'success');

    } catch (error) {
      console.error(error);
      showToast('Order failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ============ SUCCESS SCREEN ============
  if (orderComplete) {
    return (
      <div className="checkout-success">
        <div className="success-orb">
          <FaCheckCircle />
        </div>
        <h1>Order Confirmed! 🎉</h1>
        <p>
          Your food is being prepared. We'll notify you when the rider is on the way.
        </p>
        <div className="success-details">
          <div className="sd-row">
            <span>Order Number</span>
            <strong>#{orderId}</strong>
          </div>
          <div className="sd-row">
            <span>Amount Paid</span>
            <strong>{formatPrice(finalTotal)}</strong>
          </div>
          <div className="sd-row">
            <span>Payment Method</span>
            <strong>{formData.payment_method === 'mpesa' ? 'M-Pesa' : 'Cash on Delivery'}</strong>
          </div>
        </div>
        <div className="success-actions">
          <Link to={`/order-tracking/${orderId}`} className="btn-hero-primary">
            <FaMotorcycle /> Track Order
          </Link>
          <Link to="/hotels" className="btn-hero-ghost">
            Order More
          </Link>
        </div>
      </div>
    );
  }

  // ============ CHECKOUT FORM ============
  return (
    <div className="checkout-page-v2">
      <Link to="/cart" className="back-link-v2">
        <FaArrowLeft /> Back to Cart
      </Link>

      <div className="checkout-header">
        <h1>Checkout</h1>
        <p>Almost there! Confirm your details below.</p>
      </div>

      <form onSubmit={handleSubmit} className="checkout-layout">
        {/* LEFT — FORM */}
        <div className="checkout-form">
          {/* Delivery */}
          <div className="co-card">
            <div className="co-card-header">
              <div className="co-card-icon" style={{ background: 'rgba(0, 212, 255, 0.15)', color: '#00D4FF' }}>
                <FaMapMarkerAlt />
              </div>
              <div>
                <h3>Delivery Details</h3>
                <p>Where should we drop your food?</p>
              </div>
            </div>

            <div className="co-field">
              <label>Delivery Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. Westlands, Nairobi - Apartment 4B, near Sarit Centre"
                rows="3"
                required
              />
            </div>

            <div className="co-field">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 0712 345 678"
                required
              />
            </div>

            <div className="co-field">
              <label>Delivery Instructions <span>(optional)</span></label>
              <input
                type="text"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="e.g. Call when you arrive, gate code 1234"
              />
            </div>
          </div>

          {/* Payment */}
          <div className="co-card">
            <div className="co-card-header">
              <div className="co-card-icon" style={{ background: 'rgba(198, 255, 0, 0.15)', color: '#C6FF00' }}>
                <FaMoneyBillWave />
              </div>
              <div>
                <h3>Payment Method</h3>
                <p>Choose how you want to pay</p>
              </div>
            </div>

            <div className="payment-options">
              <label className={`payment-option ${formData.payment_method === 'mpesa' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="mpesa"
                  checked={formData.payment_method === 'mpesa'}
                  onChange={handleChange}
                />
                <div className="po-icon" style={{ background: 'linear-gradient(135deg, #00E676, #00B248)' }}>
                  <FaMobileAlt />
                </div>
                <div className="po-info">
                  <div className="po-title">M-Pesa</div>
                  <div className="po-desc">Pay via mobile money</div>
                </div>
                <div className="po-check">
                  {formData.payment_method === 'mpesa' && <FaCheckCircle />}
                </div>
              </label>

              <label className={`payment-option ${formData.payment_method === 'cash' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="cash"
                  checked={formData.payment_method === 'cash'}
                  onChange={handleChange}
                />
                <div className="po-icon" style={{ background: 'linear-gradient(135deg, #FFB800, #FF3D68)' }}>
                  <FaMoneyBillWave />
                </div>
                <div className="po-info">
                  <div className="po-title">Cash on Delivery</div>
                  <div className="po-desc">Pay the rider when food arrives</div>
                </div>
                <div className="po-check">
                  {formData.payment_method === 'cash' && <FaCheckCircle />}
                </div>
              </label>
            </div>

            {formData.payment_method === 'mpesa' && (
              <div className="co-field mpesa-field">
                <label>M-Pesa Number</label>
                <input
                  type="tel"
                  name="mpesa_number"
                  value={formData.mpesa_number}
                  onChange={handleChange}
                  placeholder="0712 345 678"
                />
                <small>You'll receive an STK push to confirm payment</small>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — SUMMARY */}
        <div className="checkout-summary">
          <div className="co-summary-card">
            <h3>Order Summary</h3>

            <div className="co-items">
              {cartItems.map(item => (
                <div className="co-item" key={item.id}>
                  <div className="co-item-img">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      onError={(e) => e.target.src = 'https://via.placeholder.com/60'}
                    />
                    <span className="co-item-qty">{item.quantity}</span>
                  </div>
                  <div className="co-item-info">
                    <div className="co-item-name">{item.name}</div>
                    <div className="co-item-hotel">{item.hotel_name}</div>
                  </div>
                  <div className="co-item-price">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="co-summary-divider"></div>

            <div className="co-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="co-summary-row">
              <span>Delivery</span>
              <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>FREE</span>
            </div>

            <div className="co-summary-divider"></div>

            <div className="co-summary-total">
              <span>Total</span>
              <span className="co-total-value">{formatPrice(finalTotal)}</span>
            </div>

            <button 
              type="submit" 
              className="place-order-btn"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="btn-spinner"></span> Processing...
                </>
              ) : (
                <>
                  <FaShieldAlt /> Pay {formatPrice(finalTotal)}
                </>
              )}
            </button>

            <div className="co-trust">
              <div><FaShieldAlt /> Secure payment</div>
              <div><FaMotorcycle /> 20-30 min delivery</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Checkout;