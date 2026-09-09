import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaShoppingCart, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { CartContext } from './context/CartContext';
import './components/Navbar.css';

function Navbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();
  const cartContext = useContext(CartContext);
  const cartCount = cartContext?.cartCount ?? 0;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    document.body.style.overflow = isSidebarOpen ? 'auto' : 'hidden';
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-left">
            <button className="hamburger-btn" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <Link to="/" className="nav-logo">
              <span className="logo-icon">🍔</span>
              <span className="logo-text">Food<span>Delivery</span></span>
            </Link>
          </div>

          <div className="nav-center">
            <div className="search-bar">
              <input type="text" placeholder="Search for restaurants or dishes..." />
              <button className="search-btn">Search</button>
            </div>
          </div>

          <div className="nav-right">
            {token && user?.role === 'user' && (
              <Link to="/cart" className="nav-cart">
                <FaShoppingCart />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
            )}

            <div className="user-dropdown">
              <button 
                className="user-btn"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <FaUser />
                {token && <span>{user?.name?.split(' ')[0]}</span>}
              </button>
              
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  {!token ? (
                    <>
                      <Link to="/login" className="dropdown-item">Login</Link>
                      <Link to="/register" className="dropdown-item">Register</Link>
                    </>
                  ) : (
                    <>
                      <Link to={user?.role === 'admin' ? '/admin' : 
                               user?.role === 'manager' ? '/manager' : 
                               '/my-orders'} 
                            className="dropdown-item">
                        Dashboard
                      </Link>
                      <button onClick={handleLogout} className="dropdown-item logout-btn">
                        <FaSignOutAlt /> Logout
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;