import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Eye, EyeOff } from 'lucide-react';
import './Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', formData);
      alert('Your registry spot has been reserved. Please sign in.');
      navigate('/login');
    } catch (err) {
      const apiErr = err.response?.data?.error;
      const parsedErr = typeof apiErr === 'object' && apiErr !== null ? (apiErr.message || JSON.stringify(apiErr)) : apiErr;
      setError(parsedErr || 'Registry failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-home-link">
          Return to landing
        </Link>
        <div className="auth-brand">
          <div className="auth-brand-lockup">
            <span className="auth-brand-mark" aria-hidden="true" />
            <span className="auth-brand-name">RoutiQ</span>
          </div>
          <h1>Begin <br /><span className="brand-highlight">Growth</span></h1>
          <p className="subtitle">Join the botanical registry</p>
        </div>
        
        {error && (
          <div className="error-message">
            {typeof error === 'object' ? error.message || JSON.stringify(error) : error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom de Plume (Username)</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="e.g. CuratorName"
            />
          </div>

          <div className="form-group">
            <label>The Curator's Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="e.g. curator@sanctuary.me"
            />
          </div>
          
          <div className="form-group">
            <label>Master Cipher (Password)</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="••••••••"
                style={{ paddingRight: '2.8rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Reserving...' : 'Initiate Registry'}
          </button>
        </form>
        
        <p className="auth-link">
          Already part of the sanctuary? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
