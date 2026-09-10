import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaBars, FaShoppingCart, FaUser, FaSignOutAlt, 
  FaSearch, FaMapMarkerAlt, FaWallet, FaFire 
} from 'react-icons/fa';
import { CartContext } from './context/CartContext';
import './components/Navbar.css';

function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [location, setLocation] = useState('Nairobi, Kenya');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();
  const routeLocation = useLocation();
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
    <nav className="navbar-v2">
      <div className="nav-inner">
        <div className="nav-left">
          <button className="burger-btn" onClick={toggleSidebar}>
            <FaBars />
          </button>
          
          <Link to="/" className="brand">
            <div className="brand-badge">
              <span>🍔</span>
            </div>
            <div className="brand-text">
              <span className="brand-top">Food</span>
              <span className="brand-bottom">EXPRESS</span>
            </div>
          </Link>

          <div className="location-pill">
            <FaMapMarkerAlt className="loc-icon" />
            <span>{location}</span>
          </div>
        </div>

        <div className="nav-center">
          <div className="search-v2">
            <FaSearch />
            <input 
              type="text" 
              placeholder="Search hotels, dishes, cuisines..." 
            />
            <kbd>⌘K</kbd>
          </div>
        </div>

        <div className="nav-right">
          {token && user?.role === 'user' && (
            <Link to="/cart" className="cart-btn">
              <FaShoppingCart />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
          )}

          <div className="user-menu">
            <button 
              className="user-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="avatar">
                {user?.name?.charAt(0) || <FaUser />}
              </div>
              {token && <span className="user-label">{user?.name?.split(' ')[0]}</span>}
            </button>
            
            {isDropdownOpen && (
              <div className="dropdown-v2">
                {!token ? (
                  <>
                    <Link to="/login" className="dd-item">Login</Link>
                    <Link to="/register" className="dd-item primary">Sign Up Free</Link>
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
                    <Link to={user?.role === 'admin' ? '/admin' : 
                             user?.role === 'manager' ? '/manager' : 
                             '/my-orders'} 
                          className="dd-item">
                      Dashboard
                    </Link>
                    <Link to="/wallet" className="dd-item">
                      <FaWallet /> My Wallet
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