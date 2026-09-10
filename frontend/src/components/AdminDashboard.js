import React, { useState, useEffect } from 'react';
import {
  FaUsers, FaStore, FaShoppingBag, FaMoneyBillWave, FaChartLine,
  FaCheckCircle, FaClock, FaTrophy, FaFire
} from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './AdminDashboard.css';

function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n || 0)).toLocaleString()}`;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [m, h, o] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/pending-managers', { headers }),
        axios.get('http://localhost:5000/api/admin/hotels', { headers }),
        axios.get('http://localhost:5000/api/admin/orders', { headers })
      ]);
      setPending(m.data);
      setHotels(h.data);
      setOrders(o.data);
    } catch (err) {
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id, name) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/admin/approve-manager/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`${name} approved ✅`, 'success');
      fetchAll();
    } catch { showToast('Failed to approve', 'error'); }
  };

  const completed = orders.filter(o => o.status === 'completed');
  const totalRevenue = completed.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const totalCommission = completed.reduce((s, o) => s + parseFloat(o.admin_commission || 0), 0);
  const activeOrders = orders.filter(o => ['pending','confirmed','preparing','ready','delivered'].includes(o.status)).length;

  const perf = hotels.map(h => {
    const ho = completed.filter(o => o.hotel_id === h.id);
    return {
      ...h,
      orderCount: ho.length,
      revenue: ho.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0)
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const stats = [
    { icon: <FaMoneyBillWave />, label: 'Total revenue', value: formatKSh(totalRevenue), color: 'var(--terracotta)', bg: 'var(--terracotta-tint)' },
    { icon: <FaChartLine />, label: 'Commission earned', value: formatKSh(totalCommission), color: 'var(--gold)', bg: 'var(--gold-tint)' },
    { icon: <FaShoppingBag />, label: 'Total orders', value: orders.length, color: 'var(--sage-dark)', bg: 'var(--sage-tint)' },
    { icon: <FaStore />, label: 'Active hotels', value: hotels.filter(h => h.is_active).length, color: 'var(--rose-dark)', bg: 'var(--rose-tint)' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
    { id: 'pending', label: 'Approvals', icon: <FaClock />, badge: pending.length },
    { id: 'orders', label: 'Orders', icon: <FaShoppingBag /> },
    { id: 'hotels', label: 'Hotels', icon: <FaStore /> }
  ];

  if (loading) return <div className="loading-container"><div className="spinner" /><p>Loading dashboard…</p></div>;

  return (
    <div className="admin-page-warm">
      <div className="admin-head-warm">
        <div>
          <span className="admin-badge-warm">
            <span className="badge-dot-warm" /> ADMIN ACCESS
          </span>
          <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p>Here's what's happening across FoodExpress today.</p>
        </div>
        <div className="admin-quick-warm">
          <FaFire style={{ color: 'var(--terracotta)' }} />
          <div>
            <div className="aq-val">{activeOrders}</div>
            <div className="aq-lbl">Active orders</div>
          </div>
        </div>
      </div>

      <div className="stats-grid-warm">
        {stats.map((s, i) => (
          <div className="stat-card-warm" key={i}>
            <div className="sc-icon-warm" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="sc-label-warm">{s.label}</div>
              <div className="sc-value-warm">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-tabs-warm">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab-warm ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
            {t.badge > 0 && <span className="tab-badge-warm">{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="overview-warm">
          <div className="admin-card-warm">
            <div className="ac-head-warm">
              <h3><FaTrophy /> Top performing restaurants</h3>
              <span className="ac-sub">By revenue</span>
            </div>
            {perf.slice(0, 5).map((h, i) => (
              <div className="rank-row-warm" key={h.id}>
                <div className={`rank-n-warm rank-${i + 1}`}>{i + 1}</div>
                <div className="rank-emoji-warm">{h.emoji || '🍽️'}</div>
                <div className="rank-info-warm">
                  <div className="rank-name-warm">{h.name}</div>
                  <div className="rank-meta-warm">
                    {h.orderCount} order{h.orderCount !== 1 && 's'} · {h.cuisine_type}
                  </div>
                </div>
                <div className="rank-val-warm">{formatKSh(h.revenue)}</div>
              </div>
            ))}
            {perf.length === 0 && <div className="empty-warm">No completed orders yet</div>}
          </div>

          <div className="admin-card-warm">
            <div className="ac-head-warm"><h3><FaMoneyBillWave /> Commission summary</h3></div>
            <div className="commission-warm">
              <div className="cb-row-warm">
                <div className="cb-lbl">Gross revenue</div>
                <div className="cb-val">{formatKSh(totalRevenue)}</div>
              </div>
              <div className="cb-divider-warm" />
              <div className="cb-row-warm">
                <div className="cb-lbl">Your commission</div>
                <div className="cb-val cb-highlight-warm">{formatKSh(totalCommission)}</div>
              </div>
              <div className="cb-row-warm">
                <div className="cb-lbl">Manager payouts</div>
                <div className="cb-val">{formatKSh(totalRevenue - totalCommission)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'pending' && (
        <div className="pending-warm">
          {pending.length === 0 ? (
            <div className="empty-large-warm">
              <div className="esl-ic-warm">✅</div>
              <h3>All caught up</h3>
              <p>No pending manager approvals right now.</p>
            </div>
          ) : (
            <div className="pending-grid-warm">
              {pending.map(m => (
                <div className="pending-card-warm" key={m.id}>
                  <div className="pending-av-warm">{m.name.charAt(0)}</div>
                  <div className="pending-info-warm">
                    <h3>{m.name}</h3>
                    <p>{m.email}</p>
                    <span className="pending-tag-warm">
                      <FaClock /> {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button className="approve-btn-warm" onClick={() => approve(m.id, m.name)}>
                    <FaCheckCircle /> Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="admin-card-warm">
          <div className="ac-head-warm">
            <h3>Recent orders</h3>
            <span className="ac-sub">{orders.length} total</span>
          </div>
          <div className="table-wrap-warm">
            <table className="admin-table-warm">
              <thead>
                <tr>
                  <th>Order</th><th>Customer</th><th>Hotel</th>
                  <th>Amount</th><th>Commission</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 50).map(o => (
                  <tr key={o.id}>
                    <td className="td-order-warm">#{o.order_number || o.id}</td>
                    <td>{o.user_name}</td>
                    <td>{o.hotel_name}</td>
                    <td className="td-price-warm">{formatKSh(o.total_amount)}</td>
                    <td className="td-comm-warm">{formatKSh(o.admin_commission)}</td>
                    <td><span className={`status-warm status-${o.status}`}>{o.status}</span></td>
                    <td className="td-date-warm">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan="7" className="td-empty-warm">No orders yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'hotels' && (
        <div className="hotel-grid-admin-warm">
          {hotels.map(h => (
            <div className="hotel-admin-warm" key={h.id}>
              <div className="hac-head-warm" style={{ background: `linear-gradient(135deg, ${h.brand_color}30 0%, ${h.brand_color}10 100%)` }}>
                <span className="hac-emoji-warm">{h.emoji || '🍽️'}</span>
                <span className="hac-status-warm">
                  {h.is_active ? <><FaCheckCircle /> Active</> : 'Inactive'}
                </span>
              </div>
              <div className="hac-body-warm">
                <h3>{h.name}</h3>
                <p className="hac-cuisine-warm" style={{ color: h.brand_color }}>{h.cuisine_type}</p>
                <p className="hac-vibe-warm">{h.vibe}</p>
                <div className="hac-stats-warm">
                  <div>
                    <div className="hac-val">{orders.filter(o => o.hotel_id === h.id).length}</div>
                    <div className="hac-lbl">Orders</div>
                  </div>
                  <div>
                    <div className="hac-val">⭐ {h.rating || 'N/A'}</div>
                    <div className="hac-lbl">Rating</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;