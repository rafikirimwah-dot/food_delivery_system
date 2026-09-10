// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUsers, FaStore, FaShoppingBag, FaMoneyBillWave, 
  FaChartLine, FaCheckCircle, FaTimesCircle, FaClock,
  FaTrophy, FaFire, FaWallet 
} from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './AdminDashboard.css';

function AdminDashboard() {
  const [pendingManagers, setPendingManagers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [managersRes, hotelsRes, ordersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/pending-managers', { headers }),
        axios.get('http://localhost:5000/api/admin/hotels', { headers }),
        axios.get('http://localhost:5000/api/admin/orders', { headers })
      ]);

      setPendingManagers(managersRes.data);
      setHotels(hotelsRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const approveManager = async (id, name) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/admin/approve-manager/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`${name} approved ✅`, 'success');
      fetchAll();
    } catch (err) {
      showToast('Failed to approve manager', 'error');
    }
  };

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return 'KSh 0';
    return `KSh ${Math.round(num).toLocaleString()}`;
  };

  // ============ STATS CALCULATIONS ============
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  const totalCommission = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.admin_commission || 0), 0);

  const totalManagerPayout = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.manager_amount || 0), 0);

  const activeOrders = orders.filter(o => 
    ['pending', 'confirmed', 'preparing', 'ready', 'delivered'].includes(o.status)
  ).length;

  const stats = [
    { 
      icon: <FaMoneyBillWave />, 
      label: 'Total Revenue', 
      value: formatPrice(totalRevenue), 
      color: '#C6FF00',
      bg: 'rgba(198,255,0,0.15)'
    },
    { 
      icon: <FaWallet />, 
      label: 'Commission Earned', 
      value: formatPrice(totalCommission), 
      color: '#FFB800',
      bg: 'rgba(255,184,0,0.15)'
    },
    { 
      icon: <FaShoppingBag />, 
      label: 'Total Orders', 
      value: orders.length, 
      color: '#00D4FF',
      bg: 'rgba(0,212,255,0.15)'
    },
    { 
      icon: <FaStore />, 
      label: 'Active Hotels', 
      value: hotels.filter(h => h.is_active).length, 
      color: '#00E676',
      bg: 'rgba(0,230,118,0.15)'
    }
  ];

  // ============ HOTEL PERFORMANCE ============
  const hotelPerformance = hotels.map(hotel => {
    const hotelOrders = orders.filter(o => o.hotel_id === hotel.id && o.status === 'completed');
    const revenue = hotelOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const commission = hotelOrders.reduce((sum, o) => sum + parseFloat(o.admin_commission || 0), 0);
    return { ...hotel, orderCount: hotelOrders.length, revenue, commission };
  }).sort((a, b) => b.revenue - a.revenue);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
    { id: 'pending', label: 'Pending Approvals', icon: <FaClock />, badge: pendingManagers.length },
    { id: 'orders', label: 'All Orders', icon: <FaShoppingBag /> },
    { id: 'hotels', label: 'Hotels', icon: <FaStore /> }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* HEADER */}
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-badge">
            <span className="badge-dot"></span>
            ADMIN ACCESS
          </div>
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening across FoodExpress today.</p>
        </div>
        <div className="admin-header-right">
          <div className="admin-quick-stat">
            <FaFire style={{ color: '#FF3D68' }} />
            <div>
              <div className="aqs-value">{activeOrders}</div>
              <div className="aqs-label">Active Orders</div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div className="stat-card" key={idx} style={{ '--stat-color': stat.color }}>
            <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
            <div className="stat-glow" style={{ background: stat.color }}></div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
            {tab.badge > 0 && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="admin-content">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="content-card">
              <div className="cc-header">
                <h3><FaTrophy /> Top Performing Hotels</h3>
                <span className="cc-subtitle">By revenue</span>
              </div>
              <div className="hotel-rank-list">
                {hotelPerformance.slice(0, 5).map((hotel, idx) => (
                  <div className="rank-row" key={hotel.id}>
                    <div className={`rank-number rank-${idx + 1}`}>
                      {idx + 1}
                    </div>
                    <div 
                      className="rank-emoji"
                      style={{ 
                        background: `${hotel.brand_color || '#FF6B35'}22`,
                        borderColor: hotel.brand_color || '#FF6B35'
                      }}
                    >
                      {hotel.emoji || '🍽️'}
                    </div>
                    <div className="rank-info">
                      <div className="rank-name">{hotel.name}</div>
                      <div className="rank-meta">
                        {hotel.orderCount} order{hotel.orderCount !== 1 ? 's' : ''} · {hotel.cuisine_type}
                      </div>
                    </div>
                    <div className="rank-value">
                      {formatPrice(hotel.revenue)}
                    </div>
                  </div>
                ))}
                {hotelPerformance.length === 0 && (
                  <div className="empty-state">No completed orders yet</div>
                )}
              </div>
            </div>

            <div className="content-card">
              <div className="cc-header">
                <h3><FaMoneyBillWave /> Commission Summary</h3>
              </div>
              <div className="commission-breakdown">
                <div className="cb-item">
                  <div className="cb-label">Gross Revenue</div>
                  <div className="cb-value">{formatPrice(totalRevenue)}</div>
                </div>
                <div className="cb-divider"></div>
                <div className="cb-item">
                  <div className="cb-label">Your Commission (10%)</div>
                  <div className="cb-value cb-highlight">{formatPrice(totalCommission)}</div>
                </div>
                <div className="cb-item">
                  <div className="cb-label">Manager Payouts</div>
                  <div className="cb-value">{formatPrice(totalManagerPayout)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING APPROVALS */}
        {activeTab === 'pending' && (
          <div className="pending-section">
            {pendingManagers.length === 0 ? (
              <div className="empty-state-large">
                <div className="esl-icon">✅</div>
                <h3>All caught up!</h3>
                <p>No pending manager approvals right now.</p>
              </div>
            ) : (
              <div className="pending-grid">
                {pendingManagers.map(manager => (
                  <div className="pending-card" key={manager.id}>
                    <div className="pending-avatar">
                      {manager.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="pending-info">
                      <h3>{manager.name}</h3>
                      <p className="pending-email">{manager.email}</p>
                      <span className="pending-tag">
                        <FaClock /> Registered {new Date(manager.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      className="approve-btn"
                      onClick={() => approveManager(manager.id, manager.name)}
                    >
                      <FaCheckCircle /> Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALL ORDERS */}
        {activeTab === 'orders' && (
          <div className="orders-table-wrap">
            <div className="content-card">
              <div className="cc-header">
                <h3>Recent Orders</h3>
                <span className="cc-subtitle">{orders.length} total</span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Hotel</th>
                      <th>Amount</th>
                      <th>Commission</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 50).map(order => (
                      <tr key={order.id}>
                        <td className="td-order">#{order.order_number || order.id}</td>
                        <td>{order.user_name}</td>
                        <td>{order.hotel_name}</td>
                        <td className="td-price">{formatPrice(order.total_amount)}</td>
                        <td className="td-commission">{formatPrice(order.admin_commission)}</td>
                        <td>
                          <span className={`status-badge status-${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="td-date">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan="7" className="td-empty">No orders yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HOTELS */}
        {activeTab === 'hotels' && (
          <div className="hotels-grid-admin">
            {hotels.map(hotel => (
              <div 
                className="hotel-admin-card" 
                key={hotel.id}
                style={{ '--hotel-color': hotel.brand_color || '#FF6B35' }}
              >
                <div 
                  className="hac-header"
                  style={{
                    background: `linear-gradient(135deg, ${hotel.brand_color} 0%, ${hotel.brand_color}cc 100%)`
                  }}
                >
                  <div className="hac-emoji">{hotel.emoji || '🍽️'}</div>
                  <div className="hac-status">
                    {hotel.is_active ? (
                      <><FaCheckCircle /> Active</>
                    ) : (
                      <><FaTimesCircle /> Inactive</>
                    )}
                  </div>
                </div>
                <div className="hac-body">
                  <h3>{hotel.name}</h3>
                  <p className="hac-cuisine">{hotel.cuisine_type}</p>
                  <p className="hac-vibe">{hotel.vibe}</p>
                  <div className="hac-stats">
                    <div className="hac-stat">
                      <div className="hac-stat-value">
                        {orders.filter(o => o.hotel_id === hotel.id).length}
                      </div>
                      <div className="hac-stat-label">Orders</div>
                    </div>
                    <div className="hac-stat">
                      <div className="hac-stat-value">
                        ⭐ {hotel.rating || 'N/A'}
                      </div>
                      <div className="hac-stat-label">Rating</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;