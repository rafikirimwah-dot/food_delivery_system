import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaHome, FaStore, FaShoppingCart, FaUtensils, FaChartLine,
  FaSignOutAlt, FaTimes, FaUser
} from 'react-icons/fa';
import './Sidebar.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();

  useEffect(() => {
    const toggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleSidebar', toggle);
    return () => window.removeEventListener('toggleSidebar', toggle);
  }, []);

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    close();
    window.location.reload();
  };

  const menuItems = [
    { icon: <FaHome />, label: 'Home', path: '/', show: true },
    { icon: <FaStore />, label: 'Restaurants', path: '/hotels', show: true },
    { icon: <FaShoppingCart />, label: 'Cart', path: '/cart', show: token && user?.role === 'user' },
    { icon: <FaUtensils />, label: 'My Orders', path: '/my-orders', show: token && user?.role === 'user' },
    { icon: <FaChartLine />, label: 'Admin Dashboard', path: '/admin', show: token && user?.role === 'admin' },
    { icon: <FaChartLine />, label: 'Manager Dashboard', path: '/manager', show: token && user?.role === 'manager' },
  ];

  return (
    <>
      <div className={`sidebar-overlay-warm ${isOpen ? 'active' : ''}`} onClick={close} />

      <aside className={`sidebar-warm ${isOpen ? 'open' : ''}`}>
        <div className="sb-header">
          <div className="sb-brand">
            <span className="sb-mark">🍽️</span>
            <span className="sb-name">FoodExpress</span>
          </div>
          <button className="sb-close" onClick={close} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {token && user && (
          <div className="sb-user">
            <div className="sb-avatar">{user.name?.charAt(0)}</div>
            <div>
              <div className="sb-user-name">{user.name}</div>
              <div className="sb-user-role">{user.role}</div>
            </div>
          </div>
        )}

        <nav className="sb-nav">
          {menuItems.map((item, i) => {
            if (!item.show) return null;
            return (
              <Link key={i} to={item.path} className="sb-link" onClick={close}>
                <span className="sb-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sb-footer">
          {!token ? (
            <>
              <Link to="/login" className="sb-link" onClick={close}>
                <span className="sb-icon"><FaUser /></span>
                <span>Login</span>
              </Link>
              <Link to="/register" className="sb-link primary" onClick={close}>
                <span className="sb-icon"><FaUser /></span>
                <span>Create Account</span>
              </Link>
            </>
          ) : (
            <button className="sb-link danger" onClick={handleLogout}>
              <span className="sb-icon"><FaSignOutAlt /></span>
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;