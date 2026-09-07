import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, getCart, saveCart } from '../api';

function Checkout() {
  const navigate = useNavigate(); const cart = getCart(); const [form, setForm] = useState({ delivery_address: '', payment_method: 'cash' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const submit = async (event) => { event.preventDefault(); if (!cart.length) return; setBusy(true); setError(''); try { await apiRequest('/orders', { method: 'POST', body: JSON.stringify({ hotel_id: cart[0].hotel_id, items: cart, ...form }) }); saveCart([]); navigate('/my-orders'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  if (!cart.length) return <main className="page empty-state"><h1>Your cart is empty.</h1><Link className="button primary" to="/hotels">Find a meal</Link></main>;
  return <main className="page narrow-page"><section className="form-card"><p className="eyebrow">Almost there</p><h1>Where should we bring it?</h1><form onSubmit={submit}><label>Delivery address<textarea required rows="4" value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} placeholder="Street, building, apartment..." /></label><label>Payment method<select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="cash">Cash on delivery</option><option value="card">Card</option><option value="mobile_money">Mobile money</option></select></label><div className="checkout-total"><span>Order total</span><strong>${total.toFixed(2)}</strong></div>{error && <p className="error">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Placing order...' : 'Place order'}</button></form></section></main>;
}
export default Checkout;
