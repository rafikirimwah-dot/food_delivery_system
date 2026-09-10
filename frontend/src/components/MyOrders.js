// frontend/src/components/MyOrders.js
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/orders/${orderId}/confirm-delivery`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Delivery confirmed! Enjoy your meal 🍽️', 'success');
      fetchOrders();
    } catch (err) {
      showToast('Failed to confirm delivery', 'error');
    }
  };

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return 'KSh 0';
    return `KSh ${Math.round(num).toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const statusConfig = {
    pending:    { label: 'Pending',       color: '#FFB800', icon: <FaClock />,          bg: 'rgba(255,184,0,0.15)' },
    confirmed:  { label: 'Confirmed',     color: '#00D4FF', icon: <FaCheckCircle />,    bg: 'rgba(0,212,255,0.15)' },
    preparing:  { label: 'Preparing',     color: '#9D4EDD', icon: <FaUtensils />,       bg: 'rgba(157,78,221,0.15)' },
    ready:      { label: 'Ready',         color: '#00E676', icon: <FaBox />,            bg: 'rgba(0,230,118,0.15)' },
    delivered:  { label: 'On the Way',    color: '#C6FF00', icon: <FaMotorcycle />,     bg: 'rgba(198,255,0,0.15)' },
    completed:  { label: 'Delivered',     color: '#00E676', icon: <FaCheckCircle />,    bg: 'rgba(0,230,118,0.15)' },
    cancelled:  { label: 'Cancelled',     color: '#FF3D68', icon: <FaTimesCircle />,    bg: 'rgba(255,61,104,0.15)' }
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'confirmed', 'preparing', 'ready', 'delivered'].includes(order.status);
    if (filter === 'completed') return order.status === 'completed';
    if (filter === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  // ============ EMPTY ============
  if (orders.length === 0) {
    return (
      <div className="orders-empty-v2">
        <div className="empty-orb">
          <FaReceipt />
        </div>
        <h1>No orders yet</h1>
        <p>Your order history will appear here. Time to try something delicious!</p>
        <Link to="/hotels" className="btn-hero-primary">
          <FaArrowRight /> Order Now
        </Link>
      </div>
    );
  }

  return (
    <div className="orders-page-v2">
      <div className="orders-header">
        <div>
          <h1>My Orders</h1>
          <p>{orders.length} order{orders.length !== 1 ? 's' : ''} in total</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="orders-filters">
        {filterTabs.map(tab => {
          const count = tab.id === 'all' ? orders.length : orders.filter(o => {
            if (tab.id === 'active') return ['pending','confirmed','preparing','ready','delivered'].includes(o.status);
            return o.status === tab.id;
          }).length;

          return (
            <button
              key={tab.id}
              className={`filter-tab ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <div className="orders-list-v2">
        {filteredOrders.length === 0 ? (
          <div className="no-filter-results">
            <p>No {filter} orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const hotelColor = order.hotel_color || '#FF6B35';
            const isDelivered = order.status === 'completed';

            return (
              <div 
                className="order-card-v2" 
                key={order.id}
                style={{ '--order-color': hotelColor }}
              >
                <div className="oc-header">
                  <div className="oc-hotel">
                    <div 
                      className="oc-hotel-emoji"
                      style={{ 
                        background: `${hotelColor}22`,
                        borderColor: hotelColor,
                        boxShadow: `0 0 20px ${hotelColor}40`
                      }}
                    >
                      {order.hotel_emoji || '🍽️'}
                    </div>
                    <div>
                      <div className="oc-order-number">
                        Order #{order.order_number || order.id}
                      </div>
                      <div className="oc-hotel-name">{order.hotel_name}</div>
                    </div>
                  </div>

                  <div 
                    className="oc-status-pill"
                    style={{ background: status.bg, color: status.color }}
                  >
                    {status.icon} {status.label}
                  </div>
                </div>

                <div className="oc-meta">
                  <div className="oc-meta-item">
                    <span className="oc-meta-label">Placed</span>
                    <span className="oc-meta-value">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="oc-meta-item">
                    <span className="oc-meta-label">Delivery</span>
                    <span className="oc-meta-value oc-delivery">
                      {order.delivery_address?.substring(0, 40)}{order.delivery_address?.length > 40 ? '...' : ''}
                    </span>
                  </div>
                </div>

                <div className="oc-footer">
                  <div className="oc-total">
                    <span className="oc-total-label">Total</span>
                    <span className="oc-total-value">{formatPrice(order.total_amount)}</span>
                  </div>

                  <div className="oc-actions">
                    {!isDelivered && order.status !== 'cancelled' && (
                      <>
                        <Link 
                          to={`/order-tracking/${order.id}`} 
                          className="oc-btn ghost"
                        >
                          Track <FaMotorcycle />
                        </Link>
                        {order.status === 'delivered' && (
                          <button 
                            className="oc-btn primary"
                            onClick={() => handleConfirmDelivery(order.id)}
                          >
                            Confirm Delivery <FaCheckCircle />
                          </button>
                        )}
                      </>
                    )}
                    {isDelivered && (
                      <Link to={`/hotel/${order.hotel_id}`} className="oc-btn primary">
                        Order Again <FaArrowRight />
                      </Link>
                    )}
                    {order.status === 'cancelled' && (
                      <Link to={`/hotel/${order.hotel_id}`} className="oc-btn ghost">
                        Try Again
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MyOrders;