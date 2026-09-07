import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, getCart, saveCart } from '../api';

function HotelMenu() {
  const { id } = useParams(); const navigate = useNavigate(); const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { apiRequest(`/hotels/${id}`).then(setData).catch((err) => setError(err.message)); }, [id]);
  const add = (item) => { const cart = getCart(); const found = cart.find((entry) => entry.food_item_id === item.id); const next = found ? cart.map((entry) => entry.food_item_id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...cart, { food_item_id: item.id, hotel_id: Number(id), name: item.name, price: Number(item.price), quantity: 1 }]; saveCart(next); };
  if (error) return <main className="page"><p className="error">{error}</p><Link className="text-link" to="/hotels">Back to restaurants</Link></main>;
  if (!data) return <main className="page"><p className="empty">Loading menu...</p></main>;
  return <main className="page"><Link className="back-link" to="/hotels">← All restaurants</Link><section className="menu-intro"><div><p className="eyebrow">{data.hotel.cuisine_type || 'Menu'}</p><h1>{data.hotel.name}</h1><p>{data.hotel.description}</p></div><span className="rating large-rating">★ {data.hotel.rating}</span></section><div className="menu-list">{data.menu.map((item) => <article className="menu-item" key={item.id}><div><p className="eyebrow">{item.category || 'Featured'}</p><h2>{item.name}</h2><p className="muted">{item.description}</p><small>{item.preparation_time || 15} min prep</small></div><div className="menu-action"><strong>${Number(item.price).toFixed(2)}</strong><button className="button secondary" onClick={() => add(item)}>Add</button></div></article>)}</div><button className="floating-cart button primary" onClick={() => navigate('/cart')}>View cart</button></main>;
}
export default HotelMenu;
