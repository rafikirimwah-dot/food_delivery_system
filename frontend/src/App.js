import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Navbar from './Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Hotels from './components/Hotels';
import HotelMenu from './components/HotelMenu';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import MyOrders from './components/MyOrders';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';

function App() {
  const [session, setSession] = useState(() => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }));

  useEffect(() => {
    const refreshSession = () => setSession({
      token: localStorage.getItem('token'),
      user: JSON.parse(localStorage.getItem('user') || 'null')
    });
    window.addEventListener('auth-changed', refreshSession);
    return () => window.removeEventListener('auth-changed', refreshSession);
  }, []);

  const { token, user } = session;

  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/hotel/:id" element={<HotelMenu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={token ? <Checkout /> : <Navigate to="/login" />} />
          <Route path="/my-orders" element={token ? <MyOrders /> : <Navigate to="/login" />} />
          <Route path="/admin/*" element={
            token && user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />
          } />
          <Route path="/manager/*" element={
            token && user?.role === 'manager' ? <ManagerDashboard /> : <Navigate to="/" />
          } />
        </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;