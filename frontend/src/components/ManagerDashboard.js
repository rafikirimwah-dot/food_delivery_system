// frontend/src/components/ManagerDashboard.js
import React, { useState, useEffect } from 'react';
import { 
  FaUtensils, FaShoppingBag, FaMoneyBillWave, FaPlus, 
  FaEdit, FaTrash, FaTimes, FaCheck, FaChartLine, 
  FaFire, FaStar, FaClock 
} from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './ManagerDashboard.css';

function ManagerDashboard() {
  const [hotel, setHotel] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState({ total_earnings: 0, total_orders: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', category: 'Main', is_available: true
  });
  const { showToast } = useToast();

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [hotelRes, menuRes, ordersRes, earningsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/manager/hotel', { headers }),
        axios.get('http://localhost:5000/api/manager/menu', { headers }),
        axios.get('http://localhost:5000/api/manager/orders', { headers }),
        axios.get('http://localhost:5000/api/manager/earnings', { headers })
      ]);

      setHotel(hotelRes.data);
      setMenu(menuRes.data);
      setOrders(ordersRes.data);
      setEarnings(earningsRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return 'KSh 0';
    return `KSh ${Math.round(num).toLocaleString()}`;
  };

  // ============ MENU CRUD ============
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '', price: '', category: 'Main', is_available: true });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Main',
      is_available: item.is_available
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.price) {
      showToast('Name and price are required', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingItem) {
        await axios.put(
          `http://localhost:5000/api/manager/menu/${editingItem.id}`,
          formData,
          { headers }
        );
        showToast('Item updated ✅', 'success');
      } else {
        await axios.post(
          'http://localhost:5000/api/manager/menu',
          formData,
          { headers }
        );
        showToast('Item added ✅', 'success');
      }

      setShowModal(false);
      fetchAll();
    } catch (err) {
      showToast('Failed to save item', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/manager/menu/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Item deleted', 'info');
      fetchAll();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/manager/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Order marked as "${newStatus}"`, 'success');
      fetchAll();
    } catch (err) {
      showToast('Failed to update order', 'error');
    }
  };

  // ============ STATS ============
  const activeOrders = orders.filter(o =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
  ).length;

  const completedOrders = orders.filter(o => o.status === 'completed').length;

  const todayRevenue = orders
    .filter(o => {
      const today = new Date().toDateString();
      return new Date(o.created_at).toDateString() === today && o.status === 'completed';
    })
    .reduce((sum, o) => sum + parseFloat(o.manager_amount || 0), 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your restaurant...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="loading-container">
        <h2>No hotel assigned to your account</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Contact admin for assistance</p>
      </div>
    );
  }

  const hotelColor = hotel.brand_color || '#FF6B35';
  const hotelEmoji = hotel.emoji || '🍽️';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
    { id: 'orders', label: 'Orders', icon: <FaShoppingBag />, badge: activeOrders },
    { id: 'menu', label: 'Menu', icon: <FaUtensils /> },
    { id: 'earnings', label: 'Earnings', icon: <FaMoneyBillWave /> }
  ];

  return (
    <div 
      className="manager-page"
      style={{ '--hotel-color': hotelColor, '--hotel-color-glow': `${hotelColor}66` }}
    >
      {/* HEADER */}
      <div 
        className="manager-header"
        style={{
          background: `linear-gradient(135deg, ${hotelColor} 0%, ${hotelColor}cc 100%)`
        }}
      >
        <div className="mh-bg-emoji">{hotelEmoji}</div>
        <div className="mh-inner">
          <div className="mh-left">
            <div className="mh-badge">
              <span className="badge-dot"></span>
              RESTAURANT MANAGER
            </div>
            <div className="mh-title-row">
              <div className="mh-emoji-badge">{hotelEmoji}</div>
              <div>
                <h1>{hotel.name}</h1>
                <p>{hotel.vibe} · {hotel.cuisine_type}</p>
              </div>
            </div>
          </div>
          <div className="mh-right">
            <div className="mh-stat">
              <div className="mhs-value">{activeOrders}</div>
              <div className="mhs-label">Active</div>
            </div>
            <div className="mh-stat">
              <div className="mhs-value">{menu.length}</div>
              <div className="mhs-label">Menu Items</div>
            </div>
            <div className="mh-stat">
              <div className="mhs-value">⭐ {hotel.rating || 'N/A'}</div>
              <div className="mhs-label">Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="manager-stats">
        <div className="ms-card">
          <div className="ms-icon" style={{ background: 'rgba(198,255,0,0.15)', color: '#C6FF00' }}>
            <FaMoneyBillWave />
          </div>
          <div className="ms-info">
            <div className="ms-label">Total Earnings</div>
            <div className="ms-value">{formatPrice(earnings.total_earnings)}</div>
          </div>
        </div>

        <div className="ms-card">
          <div className="ms-icon" style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}>
            <FaShoppingBag />
          </div>
          <div className="ms-info">
            <div className="ms-label">Total Orders</div>
            <div className="ms-value">{completedOrders}</div>
          </div>
        </div>

        <div className="ms-card">
          <div className="ms-icon" style={{ background: 'rgba(255,184,0,0.15)', color: '#FFB800' }}>
            <FaFire />
          </div>
          <div className="ms-info">
            <div className="ms-label">Today's Revenue</div>
            <div className="ms-value">{formatPrice(todayRevenue)}</div>
          </div>
        </div>

        <div className="ms-card">
          <div className="ms-icon" style={{ background: 'rgba(255,61,104,0.15)', color: '#FF3D68' }}>
            <FaClock />
          </div>
          <div className="ms-info">
            <div className="ms-label">Pending Orders</div>
            <div className="ms-value">
              {orders.filter(o => o.status === 'pending').length}
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="manager-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`manager-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={
              activeTab === tab.id
                ? { background: hotelColor, borderColor: hotelColor, boxShadow: `0 8px 24px ${hotelColor}66` }
                : {}
            }
          >
            {tab.icon} {tab.label}
            {tab.badge > 0 && <span className="mt-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="manager-content">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="mcontent-card">
              <div className="mcc-header">
                <h3><FaClock /> Recent Orders</h3>
              </div>
              {orders.slice(0, 5).map(order => (
                <div className="mini-order-row" key={order.id}>
                  <div className="mor-info">
                    <div className="mor-customer">{order.user_name}</div>
                    <div className="mor-meta">
                      #{order.order_number || order.id} · {new Date(order.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="mor-amount">{formatPrice(order.total_amount)}</div>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status}
                  </span>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="empty-mini">No orders yet</div>
              )}
            </div>

            <div className="mcontent-card">
              <div className="mcc-header">
                <h3><FaStar /> Top Selling Items</h3>
              </div>
              {menu.slice(0, 5).map((item, idx) => (
                <div className="mini-menu-row" key={item.id}>
                  <div className="mmr-rank">{idx + 1}</div>
                  <div className="mmr-info">
                    <div className="mmr-name">{item.name}</div>
                    <div className="mmr-cat">{item.category}</div>
                  </div>
                  <div className="mmr-price">{formatPrice(item.price)}</div>
                </div>
              ))}
              {menu.length === 0 && (
                <div className="empty-mini">No menu items yet</div>
              )}
            </div>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <div className="orders-manager-list">
            {orders.length === 0 ? (
              <div className="empty-state-large">
                <div className="esl-icon">📦</div>
                <h3>No orders yet</h3>
                <p>Orders will appear here when customers start ordering</p>
              </div>
            ) : (
              orders.map(order => (
                <div 
                  className="order-manager-card" 
                  key={order.id}
                  style={{ '--order-color': hotelColor }}
                >
                  <div className="omc-header">
                    <div>
                      <div className="omc-order-num">
                        #{order.order_number || order.id}
                      </div>
                      <div className="omc-customer">
                        <strong>{order.user_name}</strong>
                      </div>
                      <div className="omc-address">
                        📍 {order.delivery_address}
                      </div>
                    </div>
                    <div className="omc-right">
                      <div className="omc-total">{formatPrice(order.total_amount)}</div>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="omc-actions">
                    {order.status === 'pending' && (
                      <button 
                        className="omc-btn primary"
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                      >
                        <FaCheck /> Confirm Order
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button 
                        className="omc-btn primary"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                      >
                        <FaFire /> Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button 
                        className="omc-btn primary"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                      >
                        <FaCheck /> Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button 
                        className="omc-btn primary"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        <FaCheck /> Out for Delivery
                      </button>
                    )}
                    {['delivered', 'completed', 'cancelled'].includes(order.status) && (
                      <span className="omc-done">
                        {order.status === 'completed' ? '✅ Completed' :
                         order.status === 'delivered' ? '🛵 Delivered' : '❌ Cancelled'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MENU */}
        {activeTab === 'menu' && (
          <div className="menu-manager-section">
            <div className="menu-manager-header">
              <h3>Menu Items ({menu.length})</h3>
              <button className="add-item-btn" onClick={openAddModal}>
                <FaPlus /> Add New Item
              </button>
            </div>

            <div className="menu-manager-grid">
              {menu.map(item => (
                <div className="menu-manager-card" key={item.id}>
                  <div className="mmc-image">
                    <img 
                      src={item.image_url || `https://picsum.photos/seed/${item.id}/300/200`} 
                      alt={item.name}
                      onError={(e) => e.target.src = `https://via.placeholder.com/300x200/1C2230/C6FF00?text=${encodeURIComponent(item.name)}`}
                    />
                    {!item.is_available && (
                      <span className="unavailable-badge">Unavailable</span>
                    )}
                  </div>
                  <div className="mmc-body">
                    <div className="mmc-top">
                      <h4>{item.name}</h4>
                      <span className="mmc-category">{item.category}</span>
                    </div>
                    <p className="mmc-desc">{item.description || 'No description'}</p>
                    <div className="mmc-price">{formatPrice(item.price)}</div>
                    <div className="mmc-actions">
                      <button 
                        className="mmc-btn edit"
                        onClick={() => openEditModal(item)}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button 
                        className="mmc-btn delete"
                        onClick={() => handleDelete(item.id, item.name)}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {menu.length === 0 && (
                <div className="empty-state-large" style={{ gridColumn: '1 / -1' }}>
                  <div className="esl-icon">🍽️</div>
                  <h3>Your menu is empty</h3>
                  <p>Click "Add New Item" to start building your menu</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EARNINGS */}
        {activeTab === 'earnings' && (
          <div className="earnings-section">
            <div className="earnings-hero">
              <div className="eh-label">Total Earned (After Commission)</div>
              <div className="eh-value">{formatPrice(earnings.total_earnings)}</div>
              <div className="eh-sub">
                From {earnings.total_orders} completed order{earnings.total_orders !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="earnings-note">
              <div className="en-icon">💡</div>
              <div>
                <strong>How your earnings work:</strong>
                <p>
                  When customers order, their payment goes to FoodExpress first. 
                  Once they confirm delivery, we release your share (order total minus 10% platform commission) directly to you.
                </p>
              </div>
            </div>

            <div className="earnings-table-card">
              <h3>Recent Payouts</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Total</th>
                      <th>Commission</th>
                      <th>Your Payout</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(o => o.status === 'completed')
                      .slice(0, 20)
                      .map(order => (
                        <tr key={order.id}>
                          <td className="td-order">#{order.order_number || order.id}</td>
                          <td className="td-price">{formatPrice(order.total_amount)}</td>
                          <td className="td-commission">-{formatPrice(order.admin_commission)}</td>
                          <td className="td-payout">{formatPrice(order.manager_amount)}</td>
                          <td className="td-date">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    {orders.filter(o => o.status === 'completed').length === 0 && (
                      <tr>
                        <td colSpan="5" className="td-empty">
                          No completed orders yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-field">
                <label>Item Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Chicken Biryani"
                />
              </div>

              <div className="modal-field">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description of this dish..."
                  rows="3"
                />
              </div>

              <div className="modal-row">
                <div className="modal-field">
                  <label>Price (KSh) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 850"
                  />
                </div>

                <div className="modal-field">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option>Main</option>
                    <option>Appetizers</option>
                    <option>Sides</option>
                    <option>Desserts</option>
                    <option>Beverages</option>
                    <option>Soups</option>
                    <option>Salads</option>
                    <option>Pizza</option>
                    <option>Burgers</option>
                    <option>Chicken</option>
                    <option>Pasta</option>
                    <option>Sushi</option>
                    <option>Wraps</option>
                    <option>Sandwiches</option>
                  </select>
                </div>
              </div>

              <label className="modal-checkbox">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                />
                <span>Available for ordering</span>
              </label>
            </div>

            <div className="modal-footer">
              <button className="modal-btn ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button 
                className="modal-btn primary" 
                onClick={handleSave}
                style={{ background: `linear-gradient(135deg, ${hotelColor}, ${hotelColor}cc)` }}
              >
                {editingItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;