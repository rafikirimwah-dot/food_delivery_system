import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaMapMarkerAlt, FaMobileAlt, FaMoneyBillWave,
  FaCheckCircle, FaMotorcycle, FaShieldAlt, FaCreditCard
} from 'react-icons/fa';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useToast } from './ToastContext';
import './Checkout.css';

// Initialize Stripe - only if key is available
const stripePublicKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

// Stripe Card Form Component
function StripeCardForm({ total, cartItems, form, update, processing, setProcessing, setDone, setOrderId, clearCart, showToast, getTotal }) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');

  const handleCardChange = (event) => {
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError('');
    }
  };

  const processStripePayment = async (e) => {
    e.preventDefault();
    
    if (!form.address.trim()) return showToast('Please enter delivery address', 'warning');
    if (!form.phone.trim() || form.phone.length < 10) return showToast('Please enter valid phone', 'warning');

    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const hotelId = cartItems[0]?.hotel_id;
      const totalAmount = getTotal();

      // Create order first
      const orderRes = await axios.post(
        'http://localhost:5000/api/orders',
        {
          hotel_id: hotelId,
          items: cartItems.map(i => ({ food_item_id: i.id, quantity: i.quantity, price: i.price })),
          delivery_address: form.address,
          payment_method: 'stripe'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderId = orderRes.data.order_id;

      // Create payment intent
      const intentRes = await axios.post(
        'http://localhost:5000/api/stripe/create-payment-intent',
        {
          amount: totalAmount,
          orderId: orderId,
          description: `Order #${orderId}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { clientSecret } = intentRes.data;

      // Confirm payment with stripe
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: form.name || 'Customer',
            phone: form.phone
          }
        }
      });

      if (result.error) {
        showToast(`Payment failed: ${result.error.message}`, 'error');
        setCardError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        setOrderId(orderId);
        setDone(true);
        clearCart();
        showToast('Payment successful! Order placed 🎉', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Payment failed. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="co-field-warm">
        <label>Card Details</label>
        <div style={{
          padding: '12px',
          border: '1px solid #E0E0E0',
          borderRadius: '6px',
          background: '#FAFAFA'
        }}>
          <CardElement
            onChange={handleCardChange}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#333',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                },
                invalid: {
                  color: '#d32f2f'
                }
              }
            }}
          />
        </div>
        {cardError && <div style={{ color: 'red', fontSize: '14px', marginTop: '8px' }}>{cardError}</div>}
      </div>
      <button type="submit" className="place-btn-warm" disabled={processing || !stripe} onClick={processStripePayment}>
        {processing ? (
          <><span className="btn-spin"></span> Processing…</>
        ) : (
          <><FaShieldAlt /> Pay {total}</>
        )}
      </button>
    </>
  );
}

function CheckoutForm() {
  const { cartItems, getTotal, clearCart } = useContext(CartContext);
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [form, setForm] = useState({
    address: user?.address || '',
    phone: user?.phone || '',
    payment_method: 'mpesa',
    mpesa_number: user?.phone || '',
    instructions: '',
    name: user?.name || ''
  });
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n)).toLocaleString()}`;

  const total = getTotal();

  if (cartItems.length === 0 && !done) {
    return (
      <div className="checkout-page-warm">
        <div className="checkout-empty-warm">
          <h2>Your cart is empty</h2>
          <Link to="/hotels" className="btn-primary-warm">Browse Restaurants</Link>
        </div>
      </div>
    );
  }

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.address.trim()) return showToast('Please enter delivery address', 'warning');
    if (!form.phone.trim() || form.phone.length < 10) return showToast('Please enter valid phone', 'warning');

    if (form.payment_method === 'stripe') {
      // Stripe form handles this differently
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const hotelId = cartItems[0]?.hotel_id;

      await new Promise(r => setTimeout(r, 1800));

      const res = await axios.post(
        'http://localhost:5000/api/orders',
        {
          hotel_id: hotelId,
          items: cartItems.map(i => ({ food_item_id: i.id, quantity: i.quantity, price: i.price })),
          delivery_address: form.address,
          payment_method: form.payment_method
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrderId(res.data.order_id);
      setDone(true);
      clearCart();
      showToast('Payment successful! Order placed 🎉', 'success');
    } catch (err) {
      console.error(err);
      showToast('Order failed. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (done) {
    return (
      <div className="checkout-success-warm">
        <div className="success-orb-warm"><FaCheckCircle /></div>
        <h1>Order confirmed 🎉</h1>
        <p>Your food is being prepared. We'll notify you when the rider is on the way.</p>
        <div className="success-details-warm">
          <div className="sd-row-warm"><span>Order number</span><strong>#{orderId}</strong></div>
          <div className="sd-row-warm"><span>Amount paid</span><strong>{formatKSh(total)}</strong></div>
          <div className="sd-row-warm">
            <span>Payment</span>
            <strong>{form.payment_method === 'mpesa' ? 'M-Pesa' : form.payment_method === 'stripe' ? 'Credit Card' : 'Cash on Delivery'}</strong>
          </div>
        </div>
        <div className="success-actions-warm">
          <Link to={`/order-tracking/${orderId}`} className="btn-primary-warm">
            <FaMotorcycle /> Track Order
          </Link>
          <Link to="/hotels" className="btn-ghost-warm">Order More</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-warm">
      <Link to="/cart" className="back-btn-warm">
        <FaArrowLeft /> Back to Cart
      </Link>

      <div className="checkout-head-warm">
        <h1>Checkout</h1>
        <p>Almost there. Just confirm your details below.</p>
      </div>

      <form onSubmit={submit} className="checkout-layout-warm">
        <div className="checkout-form-warm">
          <div className="co-card-warm">
            <div className="co-card-head">
              <div className="co-icon co-icon-blue"><FaMapMarkerAlt /></div>
              <div>
                <h3>Delivery Details</h3>
                <p>Where should we bring your order?</p>
              </div>
            </div>

            <div className="co-field-warm">
              <label>Delivery Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={update}
                placeholder="e.g. Westlands, Rhapta Road, Villa 12"
                rows="3"
                required
              />
            </div>

            <div className="co-field-warm">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={update}
                placeholder="e.g. 0712 345 678"
                required
              />
            </div>

            <div className="co-field-warm">
              <label>Delivery Instructions <span>(optional)</span></label>
              <input
                type="text"
                name="instructions"
                value={form.instructions}
                onChange={update}
                placeholder="e.g. Call on arrival, gate code 1234"
              />
            </div>
          </div>

          <div className="co-card-warm">
            <div className="co-card-head">
              <div className="co-icon co-icon-gold"><FaMoneyBillWave /></div>
              <div>
                <h3>Payment Method</h3>
                <p>How would you like to pay?</p>
              </div>
            </div>

            <div className="pay-options-warm">
              <label className={`pay-opt-warm ${form.payment_method === 'mpesa' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="mpesa"
                  checked={form.payment_method === 'mpesa'}
                  onChange={update}
                />
                <span className="po-ic-warm" style={{ background: 'var(--sage-tint)', color: 'var(--sage-dark)' }}>
                  <FaMobileAlt />
                </span>
                <div className="po-info-warm">
                  <div className="po-title-warm">M-Pesa</div>
                  <div className="po-desc-warm">Pay via mobile money</div>
                </div>
                {form.payment_method === 'mpesa' && <FaCheckCircle className="po-check-warm" />}
              </label>

              {stripePromise && (
                <label className={`pay-opt-warm ${form.payment_method === 'stripe' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="stripe"
                    checked={form.payment_method === 'stripe'}
                    onChange={update}
                  />
                  <span className="po-ic-warm" style={{ background: '#E8F5FF', color: '#1976D2' }}>
                    <FaCreditCard />
                  </span>
                  <div className="po-info-warm">
                    <div className="po-title-warm">Credit/Debit Card</div>
                    <div className="po-desc-warm">Visa, Mastercard, Amex</div>
                  </div>
                  {form.payment_method === 'stripe' && <FaCheckCircle className="po-check-warm" />}
                </label>
              )}

              <label className={`pay-opt-warm ${form.payment_method === 'cash' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="cash"
                  checked={form.payment_method === 'cash'}
                  onChange={update}
                />
                <span className="po-ic-warm" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
                  <FaMoneyBillWave />
                </span>
                <div className="po-info-warm">
                  <div className="po-title-warm">Cash on Delivery</div>
                  <div className="po-desc-warm">Pay the rider when food arrives</div>
                </div>
                {form.payment_method === 'cash' && <FaCheckCircle className="po-check-warm" />}
              </label>
            </div>

            {form.payment_method === 'mpesa' && (
              <div className="co-field-warm mpesa-field-warm">
                <label>M-Pesa Number</label>
                <input
                  type="tel"
                  name="mpesa_number"
                  value={form.mpesa_number}
                  onChange={update}
                  placeholder="0712 345 678"
                />
                <small>You'll receive an STK push to confirm payment.</small>
              </div>
            )}

            {form.payment_method === 'stripe' && stripePromise && (
              <StripeCardForm
                total={formatKSh(total)}
                cartItems={cartItems}
                form={form}
                update={update}
                processing={processing}
                setProcessing={setProcessing}
                setDone={setDone}
                setOrderId={setOrderId}
                clearCart={clearCart}
                showToast={showToast}
                getTotal={getTotal}
              />
            )}
          </div>
        </div>

        <aside className="checkout-summary-warm">
          <div className="co-summary-card-warm">
            <h3>Order Summary</h3>

            <div className="co-items-warm">
              {cartItems.map(item => (
                <div className="co-item-warm" key={item.id}>
                  <div className="co-item-img-warm">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      onError={(e) => e.target.src = 'https://via.placeholder.com/60x60/F5EFE6/C97B5F?text=+'}
                    />
                    <span className="co-item-qty">{item.quantity}</span>
                  </div>
                  <div className="co-item-info-warm">
                    <div className="co-item-name">{item.name}</div>
                    <div className="co-item-hotel">{item.hotel_name}</div>
                  </div>
                  <div className="co-item-price-warm">{formatKSh(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="co-divider-warm" />

            <div className="co-row-warm">
              <span>Subtotal</span>
              <span>{formatKSh(total)}</span>
            </div>
            <div className="co-row-warm">
              <span>Delivery</span>
              <span className="co-free-warm">FREE</span>
            </div>

            <div className="co-divider-warm" />

            <div className="co-total-warm">
              <span>Total</span>
              <span className="co-total-val-warm">{formatKSh(total)}</span>
            </div>

            {form.payment_method !== 'stripe' && (
              <button type="submit" className="place-btn-warm" disabled={processing}>
                {processing ? (
                  <><span className="btn-spin"></span> Processing…</>
                ) : (
                  <><FaShieldAlt /> Pay {formatKSh(total)}</>
                )}
              </button>
            )}

            <div className="co-trust-warm">
              <span><FaShieldAlt /> Secure payment</span>
              <span><FaMotorcycle /> 20–30 min</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

// Main Checkout component with Stripe Elements wrapper
function Checkout() {
  if (!stripePromise) {
    return (
      <div className="checkout-page-warm">
        <div className="checkout-empty-warm">
          <h2>Stripe is not configured</h2>
          <p>Please add REACT_APP_STRIPE_PUBLIC_KEY to your .env file</p>
          <CheckoutForm />
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}

export default Checkout;