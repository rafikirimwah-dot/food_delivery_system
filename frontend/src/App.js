import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ToastProvider } from './components/ToastContext';
import Navbar from './Navbar';
import Sidebar from './components/Sidebar';
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
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const token = localStorage.getItem('token');

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
              <Route path="/hotels" element={<Hotels />} />
              <Route path="/hotel/:id" element={<HotelMenu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={
                <ProtectedRoute allowedRoles={['user']}>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/my-orders" element={
                <ProtectedRoute allowedRoles={['user']}>
                  <MyOrders />
                </ProtectedRoute>
              } />
              <Route path="/admin/*" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/manager/*" element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;