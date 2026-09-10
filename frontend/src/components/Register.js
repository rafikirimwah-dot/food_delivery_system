import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser, FaStore, FaArrowRight } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './Register.css';

function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'user', hotelName: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return showToast('Password must be 6+ characters', 'warning');
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/register', form);
      showToast(
        form.role === 'manager'
          ? 'Manager account created. Await admin approval.'
          : 'Account created! Please sign in.',
        'success'
      );
      navigate('/login');
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-warm">
      <div className="auth-card-warm">
        <div className="auth-brand-warm">
          <div className="auth-mark-warm">🍽️</div>
          <h1>Create account</h1>
          <p>Join FoodExpress and start ordering.</p>
        </div>

        <form onSubmit={submit} className="auth-form-warm">
          <div className="role-selector-warm">
            <button
              type="button"
              className={`role-btn-warm ${form.role === 'user' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, role: 'user' })}
            >
              <FaUser /> Customer
            </button>
            <button
              type="button"
              className={`role-btn-warm ${form.role === 'manager' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, role: 'manager' })}
            >
              <FaStore /> Restaurant
            </button>
          </div>

          <div className="af-warm">
            <label>Full name</label>
            <div className="af-input-warm">
              <FaUser />
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Wanjiku"
                required
              />
            </div>
          </div>

          <div className="af-warm">
            <label>Email address</label>
            <div className="af-input-warm">
              <FaEnvelope />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="af-warm">
            <label>Password</label>
            <div className="af-input-warm">
              <FaLock />
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                required
              />
            </div>
          </div>

          {form.role === 'manager' && (
            <div className="af-warm">
              <label>Restaurant name</label>
              <div className="af-input-warm">
                <FaStore />
                <input
                  type="text"
                  value={form.hotelName}
                  onChange={e => setForm({ ...form, hotelName: e.target.value })}
                  placeholder="e.g. Mama Oliech Kitchen"
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary-warm auth-submit-warm" disabled={loading}>
            {loading ? 'Creating account…' : <>Create Account <FaArrowRight /></>}
          </button>
        </form>

        <p className="auth-switch-warm">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;