import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaHotel, 
  FaShoppingCart, 
  FaUser, 
  FaSignOutAlt,
  FaTimes,
  FaUtensils,
  FaChartBar
} from 'react-icons/fa';
import './Sidebar.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();

  useEffect(() => {
    const handleSidebarToggle = () => {
      setIsOpen(prev => !prev);
    };

    window.addEventListener('toggleSidebar', handleSidebarToggle);
    return () => window.removeEventListener('toggleSidebar', handleSidebarToggle);
  }, []);

  const closeSidebar = () => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    closeSidebar();
    window.location.reload();
  };

  const menuItems = [
    { icon: <FaHome />, label: 'Home', path: '/', show: true },
    { icon: <FaHotel />, label: 'Hotels', path: '/hotels', show: true },
    { icon: <FaShoppingCart />, label: 'Cart', path: '/cart', show: token && user?.role === 'user' },
    { icon: <FaUtensils />, label: 'My Orders', path: '/my-orders', show: token && user?.role === 'user' },
    { icon: <FaChartBar />, label: 'Admin Dashboard', path: '/admin', show: token && user?.role === 'admin' },
    { icon: <FaChartBar />, label: 'Manager Dashboard', path: '/manager', show: token && user?.role === 'manager' },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={closeSidebar} />
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🍔</span>
            <span className="logo-text">Food<span>Delivery</span></span>
          </div>
          <button className="close-btn" onClick={closeSidebar}>
            <FaTimes />
          </button>
        </div>

        {token && user && (
          <div className="sidebar-user">
            <div className="user-avatar">
              <FaUser />
            </div>
            <div className="user-info">
              <h4>{user.name}</h4>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            if (!item.show) return null;
            return (
              <Link 
                key={index} 
                to={item.path} 
                className="sidebar-link"
                onClick={closeSidebar}
              >
                <span className="link-icon">{item.icon}</span>
                <span className="link-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!token ? (
            <>
              <Link to="/login" className="sidebar-link" onClick={closeSidebar}>
                <span className="link-icon"><FaUser /></span>
                <span className="link-label">Login</span>
              </Link>
              <Link to="/register" className="sidebar-link" onClick={closeSidebar}>
                <span className="link-icon"><FaUser /></span>
                <span className="link-label">Register</span>
              </Link>
            </>
          ) : (
            <button className="sidebar-link logout-link" onClick={handleLogout}>
              <span className="link-icon"><FaSignOutAlt /></span>
              <span className="link-label">Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;