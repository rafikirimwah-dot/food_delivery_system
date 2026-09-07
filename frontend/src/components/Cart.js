import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCart, saveCart } from '../api';

function Cart() {
  const [cart, setCart] = useState(getCart());
  useEffect(() => { const update = () => setCart(getCart()); window.addEventListener('cart-updated', update); return () => window.removeEventListener('cart-updated', update); }, []);
  const change = (id, amount) => { const next = cart.map((item) => item.food_item_id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0); setCart(next); saveCart(next); };
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <main className="page narrow-content"><div className="section-heading"><div><p className="eyebrow">Your selections</p><h1>Ready when you are.</h1></div><Link className="back-link" to="/hotels">Add more items</Link></div>{!cart.length ? <section className="empty-state"><h2>Your cart is waiting.</h2><p className="muted">Start with a restaurant and build something good.</p><Link className="button primary" to="/hotels">Browse restaurants</Link></section> : <><section className="cart-list">{cart.map((item) => <article className="cart-row" key={item.food_item_id}><div><h2>{item.name}</h2><p className="muted">${item.price.toFixed(2)} each</p></div><div className="quantity"><button onClick={() => change(item.food_item_id, -1)} aria-label="Decrease quantity">−</button><strong>{item.quantity}</strong><button onClick={() => change(item.food_item_id, 1)} aria-label="Increase quantity">+</button></div><strong>${(item.price * item.quantity).toFixed(2)}</strong></article>)}</section><section className="order-total"><span>Total</span><strong>${total.toFixed(2)}</strong><Link className="button primary" to="/checkout">Continue to checkout</Link></section></>}</main>;
}
export default Cart;
