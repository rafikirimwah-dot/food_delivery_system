import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaShoppingCart, FaUser, FaSignOutAlt, FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import { CartContext } from './context/CartContext';
import './components/Navbar.css';

function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();
  const { cartCount } = useContext(CartContext);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload();
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggleSidebar'));
  };

  return (
    <nav className="navbar-warm">
      <div className="nav-inner">
        <div className="nav-left">
          <button className="burger-btn" onClick={toggleSidebar} aria-label="Menu">
            <FaBars />
          </button>

          <Link to="/" className="brand">
            <div className="brand-mark">🍽️</div>
            <div className="brand-text">
              <span className="brand-top">Food</span>
              <span className="brand-bottom">Express</span>
            </div>
          </Link>

          <div className="location-pill">
            <FaMapMarkerAlt />
            <span>Nairobi, Kenya</span>
          </div>
        </div>

        <div className="nav-center">
          <div className="search-warm">
            <FaSearch />
            <input type="text" placeholder="Search restaurants, dishes..." />
          </div>
        </div>

        <div className="nav-right">
          {token && user?.role === 'user' && (
            <Link to="/cart" className="cart-btn" aria-label="Cart">
              <FaShoppingCart />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
          )}

          <div className="user-menu">
            <button
              className="user-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="avatar-warm">
                {user?.name?.charAt(0)?.toUpperCase() || <FaUser />}
              </span>
              {token && <span className="user-name">{user?.name?.split(' ')[0]}</span>}
            </button>

            {isDropdownOpen && (
              <div className="dropdown-warm">
                {!token ? (
                  <>
                    <Link to="/login" className="dd-item">Login</Link>
                    <Link to="/register" className="dd-item primary">Create Account</Link>
                  </>
                ) : (
                  <>
                    <div className="dd-header">
                      <div className="dd-avatar">{user?.name?.charAt(0)}</div>
                      <div>
                        <div className="dd-name">{user?.name}</div>
                        <div className="dd-role">{user?.role}</div>
                      </div>
                    </div>
                    <Link
                      to={user?.role === 'admin' ? '/admin' :
                           user?.role === 'manager' ? '/manager' :
                           '/my-orders'}
                      className="dd-item"
                    >
                      Dashboard
                    </Link>
                    <button onClick={handleLogout} className="dd-item danger">
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
  );
}

export default Navbar;