import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login(form.email, form.password);
      if (response.user.role === 'ADMIN') navigate('/admin-dashboard');
      else if (response.user.role === 'TRAVEL_AGENT') navigate('/travel-agent-dashboard');
      else if (response.user.role === 'SERVICE_PROVIDER') navigate('/service-provider-dashboard');
      else navigate('/customer-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>Login</h2>
        <p>Welcome back to VoyageVista.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit} className="stack-form">
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" autoComplete="email" required />
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" autoComplete="current-password" required />
          <button className="btn btn-primary">Sign in</button>
        </form>
        <p className="small-note">No account yet? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}
