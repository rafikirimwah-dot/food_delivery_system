import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './Login.css';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      showToast(`Welcome back, ${res.data.user.name.split(' ')[0]}!`, 'success');
      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'manager') navigate('/manager');
      else navigate('/');
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-warm">
      <div className="auth-card-warm">
        <div className="auth-brand-warm">
          <div className="auth-mark-warm">🍽️</div>
          <h1>Welcome back</h1>
          <p>Sign in to continue ordering delicious food.</p>
        </div>

        <form onSubmit={submit} className="auth-form-warm">
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
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary-warm auth-submit-warm" disabled={loading}>
            {loading ? 'Signing in…' : <>Sign In <FaArrowRight /></>}
          </button>
        </form>

        <p className="auth-switch-warm">
          New to FoodExpress? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;