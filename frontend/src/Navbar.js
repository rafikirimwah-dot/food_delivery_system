import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">Food Delivery</Link>
        <ul className="nav-menu">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/hotels">Hotels</Link></li>
          {token && user?.role === 'user' && (
            <>
              <li><Link to="/my-orders">My Orders</Link></li>
              <li><Link to="/cart">Cart</Link></li>
            </>
          )}
          {token && user?.role === 'admin' && (
            <li><Link to="/admin">Admin Dashboard</Link></li>
          )}
          {token && user?.role === 'manager' && (
            <li><Link to="/manager">Manager Dashboard</Link></li>
          )}
          {!token ? (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          ) : (
            <li><button onClick={handleLogout} className="logout-btn">Logout</button></li>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;