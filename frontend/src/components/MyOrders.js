import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';

function MyOrders() {
  const [orders, setOrders] = useState([]); const [error, setError] = useState('');
  const load = () => apiRequest('/users/orders').then(setOrders).catch((err) => setError(err.message));
  useEffect(load, []);
  const confirm = async (id) => { try { await apiRequest(`/orders/${id}/confirm-delivery`, { method: 'PUT' }); load(); } catch (err) { setError(err.message); } };
  return <main className="page"><div className="section-heading"><div><p className="eyebrow">Your journey</p><h1>Order history.</h1></div></div>{error && <p className="error">{error}</p>}<div className="dashboard-list">{orders.map((order) => <article className="data-card" key={order.id}><div><p className="eyebrow">Order #{order.order_number || order.id}</p><h2>{order.hotel_name}</h2><p className="muted">{new Date(order.created_at).toLocaleString()} · {order.delivery_address}</p></div><div className="data-side"><strong>${Number(order.total_amount).toFixed(2)}</strong><span className={`status status-${order.status}`}>{order.status}</span>{order.is_delivered ? <small>Delivery confirmed</small> : order.status === 'delivered' ? <button className="button secondary" onClick={() => confirm(order.id)}>Confirm delivery</button> : null}</div></article>)}</div>{!orders.length && !error && <p className="empty">No orders yet. Your next one could be excellent.</p>}</main>;
}
export default MyOrders;
