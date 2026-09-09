import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCart } from './api';

function Navbar() {
  const [session, setSession] = useState(() => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }));
  const navigate = useNavigate();

  useEffect(() => {
    const refreshSession = () => setSession({
      token: localStorage.getItem('token'),
      user: JSON.parse(localStorage.getItem('user') || 'null')
    });
    window.addEventListener('auth-changed', refreshSession);
    return () => window.removeEventListener('auth-changed', refreshSession);
  }, []);

  const { token, user } = session;
  const cartCount = getCart().reduce((total, item) => total + item.quantity, 0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/login');
  };

  return (
    <aside className="navbar">
      <div className="nav-container">
        <NavLink to="/" className="nav-logo"><span className="logo-mark">FD</span><span>Food<br />Delivery</span></NavLink>
        <div className="nav-label">Explore</div>
        <ul className="nav-menu">
          <li><NavLink to="/" end><span>⌂</span> Home</NavLink></li>
          <li><NavLink to="/hotels"><span>◈</span> Restaurants</NavLink></li>
          {token && user?.role === 'user' && (
            <>
              <li><NavLink to="/my-orders"><span>◷</span> My orders</NavLink></li>
              <li><NavLink to="/cart"><span>▢</span> Cart {cartCount > 0 && <b className="cart-count">{cartCount}</b>}</NavLink></li>
            </>
          )}
          {token && user?.role === 'admin' && (
            <li><NavLink to="/admin"><span>▦</span> Admin dashboard</NavLink></li>
          )}
          {token && user?.role === 'manager' && (
            <li><NavLink to="/manager"><span>▦</span> Manager dashboard</NavLink></li>
          )}
        </ul>
        <div className="nav-bottom">
          {!token ? <><NavLink className="nav-signin" to="/login">Sign in</NavLink><NavLink className="button primary nav-join" to="/register">Join the table</NavLink></> : <><div className="user-chip"><span>{(user?.name || 'Guest').charAt(0).toUpperCase()}</span><div><strong>{user?.name || 'Guest'}</strong><small>{user?.role || 'Customer'}</small></div></div><button onClick={handleLogout} className="logout-btn">Log out</button></>}
        </div>
      </div>
    </aside>
  );
}

export default Navbar;