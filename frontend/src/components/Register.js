import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', hotelName: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    try { const data = await apiRequest('/register', { method: 'POST', body: JSON.stringify(form) }); setMessage(data.message); setTimeout(() => navigate('/login'), 900); }
    catch (err) { setError(err.message); }
  };
  return <main className="page narrow-page"><section className="form-card"><p className="eyebrow">Join the table</p><h1>Make your next meal easy.</h1><form onSubmit={submit}>
    <label>Name<input required value={form.name} onChange={update('name')} /></label><label>Email<input type="email" required value={form.email} onChange={update('email')} /></label><label>Password<input type="password" minLength="6" required value={form.password} onChange={update('password')} /></label>
    <label>Account type<select value={form.role} onChange={update('role')}><option value="user">Customer</option><option value="manager">Restaurant manager</option></select></label>
    {form.role === 'manager' && <label>Hotel name<input required value={form.hotelName} onChange={update('hotelName')} /></label>}
    {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}<button className="button primary">Create account</button>
  </form><p className="form-footer">Already registered? <Link to="/login">Sign in</Link></p></section></main>;
}
export default Register;
