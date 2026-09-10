import React, { useState, useEffect } from 'react';
import {
  FaUtensils, FaShoppingBag, FaMoneyBillWave, FaPlus, FaEdit,
  FaTrash, FaTimes, FaCheck, FaChartLine, FaFire, FaClock, FaStar
} from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './ManagerDashboard.css';

function ManagerDashboard() {
  const [hotel, setHotel] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState({ total_earnings: 0, total_orders: 0 });
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'Main', is_available: true });
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n || 0)).toLocaleString()}`;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [h, m, o, e] = await Promise.all([
        axios.get('http://localhost:5000/api/manager/hotel', { headers }),
        axios.get('http://localhost:5000/api/manager/menu', { headers }),
        axios.get('http://localhost:5000/api/manager/orders', { headers }),
        axios.get('http://localhost:5000/api/manager/earnings', { headers })
      ]);
      setHotel(h.data);
      setMenu(m.data);
      setOrders(o.data);
      setEarnings(e.data);
    } catch (err) {
      showToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', category: 'Main', is_available: true });
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Main',
      is_available: item.is_available
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) return showToast('Name and price required', 'warning');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      if (editing) {
        await axios.put(`http://localhost:5000/api/manager/menu/${editing.id}`, form, { headers });
        showToast('Item updated', 'success');
      } else {
        await axios.post('http://localhost:5000/api/manager/menu', form, { headers });
        showToast('Item added', 'success');
      }
      setModal(false);
      fetchAll();
    } catch { showToast('Failed to save', 'error'); }
  };

  const del = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/manager/menu/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Item deleted', 'info');
      fetchAll();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/manager/orders/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Order marked as "${status}"`, 'success');
      fetchAll();
    } catch { showToast('Failed to update', 'error'); }
  };

  const activeOrders = orders.filter(o => ['pending','confirmed','preparing','ready'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const todayRevenue = orders.filter(o => {
    return new Date(o.created_at).toDateString() === new Date().toDateString() && o.status === 'completed';
  }).reduce((s, o) => s + parseFloat(o.manager_amount || 0), 0);

  if (loading) return <div className="loading-container"><div className="spinner" /><p>Loading your restaurant…</p></div>;

  if (!hotel) return (
    <div className="loading-container">
      <h2>No restaurant assigned</h2>
      <p style={{ color: 'var(--muted)' }}>Contact admin for assistance.</p>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
    { id: 'orders', label: 'Orders', icon: <FaShoppingBag />, badge: activeOrders },
    { id: 'menu', label: 'Menu', icon: <FaUtensils /> },
    { id: 'earnings', label: 'Earnings', icon: <FaMoneyBillWave /> }
  ];

  return (
    <div className="manager-page-warm">
      {/* HEADER */}
      <div className="manager-head-warm">
        <div className="mh-bg-emoji-warm">{hotel.emoji || '🍽️'}</div>
        <div className="mh-inner-warm">
          <div>
            <span className="mh-badge-warm">
              <span className="badge-dot-warm" /> MANAGER ACCESS
            </span>
            <div className="mh-title-warm">
              <div className="mh-emoji-warm">{hotel.emoji || '🍽️'}</div>
              <div>
                <h1>{hotel.name}</h1>
                <p>{hotel.vibe} · {hotel.cuisine_type}</p>
              </div>
            </div>
          </div>
          <div className="mh-stats-warm">
            <div className="mhs-item-warm">
              <div className="mhs-val-warm">{activeOrders}</div>
              <div className="mhs-lbl-warm">Active</div>
            </div>
            <div className="mhs-item-warm">
              <div className="mhs-val-warm">{menu.length}</div>
              <div className="mhs-lbl-warm">Items</div>
            </div>
            <div className="mhs-item-warm">
              <div className="mhs-val-warm">⭐ {hotel.rating || 'N/A'}</div>
              <div className="mhs-lbl-warm">Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="manager-stats-warm">
        <div className="ms-card-warm">
          <div className="ms-ic-warm" style={{ background: 'var(--terracotta-tint)', color: 'var(--terracotta)' }}>
            <FaMoneyBillWave />
          </div>
          <div>
            <div className="ms-lbl-warm">Total earnings</div>
            <div className="ms-val-warm">{formatKSh(earnings.total_earnings)}</div>
          </div>
        </div>
        <div className="ms-card-warm">
          <div className="ms-ic-warm" style={{ background: 'var(--sage-tint)', color: 'var(--sage-dark)' }}>
            <FaShoppingBag />
          </div>
          <div>
            <div className="ms-lbl-warm">Total orders</div>
            <div className="ms-val-warm">{completedOrders}</div>
          </div>
        </div>
        <div className="ms-card-warm">
          <div className="ms-ic-warm" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
            <FaFire />
          </div>
          <div>
            <div className="ms-lbl-warm">Today's revenue</div>
            <div className="ms-val-warm">{formatKSh(todayRevenue)}</div>
          </div>
        </div>
        <div className="ms-card-warm">
          <div className="ms-ic-warm" style={{ background: 'var(--rose-tint)', color: 'var(--rose-dark)' }}>
            <FaClock />
          </div>
          <div>
            <div className="ms-lbl-warm">Pending</div>
            <div className="ms-val-warm">{orders.filter(o => o.status === 'pending').length}</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="manager-tabs-warm">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`manager-tab-warm ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
            {t.badge > 0 && <span className="mt-badge-warm">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="overview-manager-warm">
          <div className="mc-card-warm">
            <div className="mc-head-warm"><h3><FaClock /> Recent orders</h3></div>
            {orders.slice(0, 5).map(o => (
              <div className="mini-row-warm" key={o.id}>
                <div>
                  <div className="mr-name">{o.user_name}</div>
                  <div className="mr-meta">#{o.order_number || o.id} · {new Date(o.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="mr-amount">{formatKSh(o.total_amount)}</div>
                <span className={`status-warm status-${o.status}`}>{o.status}</span>
              </div>
            ))}
            {orders.length === 0 && <div className="empty-mini-warm">No orders yet</div>}
          </div>

          <div className="mc-card-warm">
            <div className="mc-head-warm"><h3><FaStar /> Top items</h3></div>
            {menu.slice(0, 5).map((item, i) => (
              <div className="mini-row-warm" key={item.id}>
                <div className="mr-rank">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div className="mr-name">{item.name}</div>
                  <div className="mr-meta">{item.category}</div>
                </div>
                <div className="mr-amount">{formatKSh(item.price)}</div>
              </div>
            ))}
            {menu.length === 0 && <div className="empty-mini-warm">No menu items yet</div>}
          </div>
        </div>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <div className="orders-manager-warm">
          {orders.length === 0 ? (
            <div className="empty-large-warm">
              <div className="esl-ic-warm">📦</div>
              <h3>No orders yet</h3>
              <p>Orders will appear here as customers start buying.</p>
            </div>
          ) : orders.map(o => (
            <div className="order-manager-warm" key={o.id}>
              <div className="omc-head-warm">
                <div>
                  <div className="omc-num">#{o.order_number || o.id}</div>
                  <div className="omc-customer"><strong>{o.user_name}</strong></div>
                  <div className="omc-address">📍 {o.delivery_address}</div>
                </div>
                <div className="omc-right-warm">
                  <div className="omc-total-warm">{formatKSh(o.total_amount)}</div>
                  <span className={`status-warm status-${o.status}`}>{o.status}</span>
                </div>
              </div>
              <div className="omc-actions-warm">
                {o.status === 'pending' && <button className="omc-btn-warm primary" onClick={() => updateStatus(o.id, 'confirmed')}><FaCheck /> Confirm Order</button>}
                {o.status === 'confirmed' && <button className="omc-btn-warm primary" onClick={() => updateStatus(o.id, 'preparing')}><FaFire /> Start Preparing</button>}
                {o.status === 'preparing' && <button className="omc-btn-warm primary" onClick={() => updateStatus(o.id, 'ready')}><FaCheck /> Mark Ready</button>}
                {o.status === 'ready' && <button className="omc-btn-warm primary" onClick={() => updateStatus(o.id, 'delivered')}><FaCheck /> Out for Delivery</button>}
                {['delivered','completed','cancelled'].includes(o.status) && (
                  <span className="omc-done-warm">
                    {o.status === 'completed' ? '✅ Completed' : o.status === 'delivered' ? '🛵 Delivered' : '❌ Cancelled'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MENU */}
      {tab === 'menu' && (
        <div className="menu-manager-warm">
          <div className="mm-head-warm">
            <h3>Menu ({menu.length})</h3>
            <button className="btn-primary-warm" onClick={openAdd}><FaPlus /> Add Item</button>
          </div>
          <div className="mm-grid-warm">
            {menu.map(item => (
              <div className="mm-card-warm" key={item.id}>
                <div className="mm-img-warm">
                  <img
                    src={item.image_url || `https://picsum.photos/seed/${item.id}/300/200`}
                    alt={item.name}
                    onError={(e) => e.target.src = `https://via.placeholder.com/300x200/F5EFE6/C97B5F?text=${encodeURIComponent(item.name)}`}
                  />
                  {!item.is_available && <span className="mm-unavail-warm">Unavailable</span>}
                </div>
                <div className="mm-body-warm">
                  <div className="mm-top-warm">
                    <h4>{item.name}</h4>
                    <span className="mm-cat-warm">{item.category}</span>
                  </div>
                  <p className="mm-desc-warm">{item.description || 'No description'}</p>
                  <div className="mm-price-warm">{formatKSh(item.price)}</div>
                  <div className="mm-actions-warm">
                    <button className="mm-btn-warm edit" onClick={() => openEdit(item)}><FaEdit /> Edit</button>
                    <button className="mm-btn-warm delete" onClick={() => del(item.id, item.name)}><FaTrash /> Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {menu.length === 0 && (
              <div className="empty-large-warm" style={{ gridColumn: '1 / -1' }}>
                <div className="esl-ic-warm">🍽️</div>
                <h3>Menu is empty</h3>
                <p>Click "Add Item" to start building your menu.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EARNINGS */}
      {tab === 'earnings' && (
        <div className="earnings-warm">
          <div className="earn-hero-warm">
            <div className="eh-lbl-warm">Total Earned (after commission)</div>
            <div className="eh-val-warm">{formatKSh(earnings.total_earnings)}</div>
            <div className="eh-sub-warm">From {earnings.total_orders} completed order{earnings.total_orders !== 1 && 's'}</div>
          </div>

          <div className="earn-note-warm">
            <div className="en-ic-warm">💡</div>
            <div>
              <strong>How earnings work</strong>
              <p>When customers order, payment goes to FoodExpress. Once they confirm delivery, we release your share (order total minus 10% platform commission).</p>
            </div>
          </div>

          <div className="admin-card-warm">
            <div className="ac-head-warm"><h3>Recent payouts</h3></div>
            <div className="table-wrap-warm">
              <table className="admin-table-warm">
                <thead>
                  <tr><th>Order</th><th>Total</th><th>Commission</th><th>Your payout</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {orders.filter(o => o.status === 'completed').slice(0, 20).map(o => (
                    <tr key={o.id}>
                      <td className="td-order-warm">#{o.order_number || o.id}</td>
                      <td className="td-price-warm">{formatKSh(o.total_amount)}</td>
                      <td className="td-comm-warm">-{formatKSh(o.admin_commission)}</td>
                      <td style={{ color: 'var(--sage-dark)', fontWeight: 700 }}>{formatKSh(o.manager_amount)}</td>
                      <td className="td-date-warm">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {orders.filter(o => o.status === 'completed').length === 0 && (
                    <tr><td colSpan="5" className="td-empty-warm">No completed orders yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay-warm" onClick={() => setModal(false)}>
          <div className="modal-box-warm" onClick={e => e.stopPropagation()}>
            <div className="modal-head-warm">
              <h2>{editing ? 'Edit Item' : 'Add New Item'}</h2>
              <button className="modal-close-warm" onClick={() => setModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-body-warm">
              <div className="mf-warm">
                <label>Item name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken Biryani" />
              </div>
              <div className="mf-warm">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description..." rows="3" />
              </div>
              <div className="mf-row-warm">
                <div className="mf-warm">
                  <label>Price (KSh) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 850" />
                </div>
                <div className="mf-warm">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option>Main</option><option>Appetizers</option><option>Sides</option>
                    <option>Desserts</option><option>Beverages</option><option>Soups</option>
                    <option>Salads</option><option>Pizza</option><option>Burgers</option>
                    <option>Chicken</option><option>Pasta</option><option>Sushi</option>
                  </select>
                </div>
              </div>
              <label className="mf-check-warm">
                <input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} />
                <span>Available for ordering</span>
              </label>
            </div>
            <div className="modal-foot-warm">
              <button className="btn-ghost-warm" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary-warm" onClick={save}>
                {editing ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;