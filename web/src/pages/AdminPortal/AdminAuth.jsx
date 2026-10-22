import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Loader2,
  School
} from 'lucide-react';
import './AdminPortal.css';

export default function AdminAuth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/admin');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-portal-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', backgroundColor: '#080e1a' }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#0d1527',
        border: 'none',
        borderRadius: '24px',
        padding: '44px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '62px',
            height: '62px',
            margin: '0 auto 18px',
            borderRadius: '16px',
            backgroundColor: '#131f37',
            border: '1.5px solid #c59b27',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <School size={32} color="#c59b27" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginBottom: '8px' }}>
            Ndugu Academy Portal
          </h1>
          <p style={{ fontSize: '15px', color: '#94a3b8' }}>
            Authorized Staff &amp; Academic System Access
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#131f37',
            border: 'none',
            color: '#f87171',
            padding: '14px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="ap-field">
            <label style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 700 }}>Username / Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
              <input
                type="email"
                name="email"
                required
                placeholder="admin@ndugu.ac.ug"
                value={formData.email}
                onChange={handleChange}
                style={{ width: '100%', paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px', fontSize: '15px', backgroundColor: '#080e1a', border: 'none', color: '#fff', borderRadius: '12px' }}
              />
            </div>
          </div>

          <div className="ap-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 700 }}>Password</label>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                style={{ width: '100%', paddingLeft: '44px', paddingRight: '44px', paddingTop: '14px', paddingBottom: '14px', fontSize: '15px', backgroundColor: '#080e1a', border: 'none', color: '#fff', borderRadius: '12px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ap-btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '15px', fontSize: '16px', backgroundColor: '#c59b27', color: '#080e1a', fontWeight: 800, border: 'none', borderRadius: '12px' }}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <span>Authenticate &amp; Enter Portal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
