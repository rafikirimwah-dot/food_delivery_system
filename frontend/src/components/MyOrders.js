import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaClock, FaCheckCircle, FaMotorcycle, FaBox,
  FaUtensils, FaTimesCircle, FaArrowRight, FaReceipt
} from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './MyOrder.css';

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { showToast } = useToast();

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n)).toLocaleString()}`;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/users/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data);
      } catch (err) {
        showToast('Failed to load orders', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [showToast]);

  const confirmDelivery = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/orders/${id}/confirm-delivery`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Delivery confirmed! Enjoy your meal 🍽️', 'success');
      // reload
      const res = await axios.get('http://localhost:5000/api/users/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch {
      showToast('Failed to confirm', 'error');
    }
  };

  const statusMap = {
    pending:   { label: 'Pending',      color: 'var(--gold)',       bg: 'var(--gold-tint)',   icon: <FaClock /> },
    confirmed: { label: 'Confirmed',    color: 'var(--terracotta)', bg: 'var(--terracotta-tint)', icon: <FaCheckCircle /> },
    preparing: { label: 'Preparing',    color: 'var(--terracotta-dark)', bg: 'var(--terracotta-tint)', icon: <FaUtensils /> },
    ready:     { label: 'Ready',        color: 'var(--sage-dark)',  bg: 'var(--sage-tint)',   icon: <FaBox /> },
    delivered: { label: 'On the way',   color: 'var(--rose-dark)',  bg: 'var(--rose-tint)',   icon: <FaMotorcycle /> },
    completed: { label: 'Delivered',    color: 'var(--sage-dark)',  bg: 'var(--sage-tint)',   icon: <FaCheckCircle /> },
    cancelled: { label: 'Cancelled',    color: 'var(--rose-dark)',  bg: 'var(--rose-tint)',   icon: <FaTimesCircle /> }
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const filtered = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending','confirmed','preparing','ready','delivered'].includes(o.status);
    return o.status === filter;
  });

  if (loading) return <div className="loading-container"><div className="spinner" /><p>Loading your orders…</p></div>;

  if (orders.length === 0) {
    return (
      <div className="orders-empty-warm">
        <div className="empty-orb-warm"><FaReceipt /></div>
        <h1>No orders yet</h1>
        <p>Your order history will appear here. Let's change that.</p>
        <Link to="/hotels" className="btn-primary-warm">
          Order Now <FaArrowRight />
        </Link>
      </div>
    );
  }

  return (
    <div className="orders-page-warm">
      <div className="orders-head-warm">
        <h1>My Orders</h1>
        <p>{orders.length} order{orders.length !== 1 && 's'}</p>
      </div>

      <div className="orders-filters-warm">
        {filters.map(f => {
          const count = f.id === 'all' ? orders.length :
            f.id === 'active' ? orders.filter(o => ['pending','confirmed','preparing','ready','delivered'].includes(o.status)).length :
            orders.filter(o => o.status === f.id).length;
          return (
            <button
              key={f.id}
              className={`filter-btn-warm ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="filter-count-warm">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="orders-list-warm">
        {filtered.length === 0 ? (
          <div className="no-results-warm">No {filter} orders</div>
        ) : filtered.map(o => {
          const st = statusMap[o.status] || statusMap.pending;
          return (
            <div className="order-card-warm" key={o.id}>
              <div className="oc-head-warm">
                <div className="oc-hotel-warm">
                  <div className="oc-hotel-icon">
                    {o.hotel_emoji || '🍽️'}
                  </div>
                  <div>
                    <div className="oc-num">#{o.order_number || o.id}</div>
                    <div className="oc-name">{o.hotel_name}</div>
                  </div>
                </div>
                <span className="oc-status-warm" style={{ background: st.bg, color: st.color }}>
                  {st.icon} {st.label}
                </span>
              </div>

              <div className="oc-meta-warm">
                <div>
                  <div className="oc-meta-label">Placed</div>
                  <div className="oc-meta-val">{formatDate(o.created_at)}</div>
                </div>
                <div>
                  <div className="oc-meta-label">Delivery to</div>
                  <div className="oc-meta-val">
                    {o.delivery_address?.substring(0, 45)}
                    {o.delivery_address?.length > 45 && '…'}
                  </div>
                </div>
              </div>

              <div className="oc-foot-warm">
                <div className="oc-total-warm">
                  <span className="oc-total-label">Total</span>
                  <span className="oc-total-val">{formatKSh(o.total_amount)}</span>
                </div>
                <div className="oc-actions-warm">
                  {!['completed','cancelled'].includes(o.status) && (
                    <Link to={`/order-tracking/${o.id}`} className="oc-btn-warm ghost">
                      Track <FaMotorcycle />
                    </Link>
                  )}
                  {o.status === 'delivered' && (
                    <button className="oc-btn-warm primary" onClick={() => confirmDelivery(o.id)}>
                      Confirm <FaCheckCircle />
                    </button>
                  )}
                  {o.status === 'completed' && (
                    <Link to={`/hotel/${o.hotel_id}`} className="oc-btn-warm primary">
                      Order Again <FaArrowRight />
                    </Link>
                  )}
                  {o.status === 'cancelled' && (
                    <Link to={`/hotel/${o.hotel_id}`} className="oc-btn-warm ghost">
                      Try Again
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyOrders;