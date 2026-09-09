import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, saveSession } from '../api';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await apiRequest('/login', { method: 'POST', body: JSON.stringify(form) });
      saveSession(data);
      window.dispatchEvent(new Event('auth-changed'));

      const role = data?.user?.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'manager') navigate('/manager');
      else navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return <main className="page narrow-page"><section className="form-card"><p className="eyebrow">Welcome back</p><h1>Sign in to your table.</h1><p className="muted">Track orders, save favorites, and get dinner moving.</p><form onSubmit={submit}>
    <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
    <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
    {error && <p className="error">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
  </form><p className="form-footer">New here? <Link to="/register">Create an account</Link></p></section></main>;
}

export default Login;
