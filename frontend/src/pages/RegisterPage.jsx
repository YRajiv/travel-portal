import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      navigate('/customer-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>Create account</h2>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit} className="stack-form">
          <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} autoComplete="name" required />
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} autoComplete="email" required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} autoComplete="new-password" minLength={8} required />
          <button className="btn btn-primary">Register</button>
        </form>
        <p className="small-note">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
