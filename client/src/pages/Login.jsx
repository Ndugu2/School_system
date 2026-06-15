import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, Loader } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(formData.name, formData.email, formData.password, formData.role);
      } else {
        await login(formData.email, formData.password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Brand/Hero Section */}
        <div style={styles.heroSection}>
          <div style={styles.heroOverlay} />
          <div style={styles.heroContent}>
            <div style={styles.logoBadge}>
              <GraduationCap size={40} color="#fbbf24" />
            </div>
            <h1 style={styles.heroTitle}>Ndugu Academy</h1>
            <p style={styles.heroSubtitle}>Uganda's Leading School Information Management System</p>
            <div style={styles.heroFeatures}>
              <div style={styles.featureItem}>
                <span style={styles.featureDot}>•</span>
                <span>Automated Uganda Curriculum Grading (PLE/UCE/UACE)</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureDot}>•</span>
                <span>Term-based Attendance & Marks tracking</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureDot}>•</span>
                <span>School Fees Invoices & Payments in UGX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div style={styles.formSection}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>
                {isRegister ? 'Create Administrator Account' : 'Welcome Back'}
              </h2>
              <p style={styles.formSubtitle}>
                {isRegister 
                  ? 'Configure the first super-admin or add staff' 
                  : 'Enter your credentials to access your dashboard'}
              </p>
            </div>

            {error && <div style={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>
              {isRegister && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Name</label>
                  <div style={styles.inputWrapper}>
                    <User size={18} style={styles.inputIcon} />
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. John Mukasa"
                      value={formData.name}
                      onChange={handleChange}
                      style={styles.input}
                    />
                  </div>
                </div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.inputIcon} />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    style={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Account Designation (Role)</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    style={styles.select}
                  >
                    <option value="admin">Administrator</option>
                    <option value="teacher">Class Teacher / Instructor</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent / Guardian</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={styles.submitButton}
              >
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  isRegister ? 'Register Account' : 'Sign In'
                )}
              </button>
            </form>

            <div style={styles.toggleFooter}>
              <span>
                {isRegister 
                  ? 'Already have an administrator account?' 
                  : 'Setting up the school system for the first time?'}
              </span>
              <button
                onClick={() => setIsRegister(!isRegister)}
                style={styles.toggleButton}
              >
                {isRegister ? 'Sign In Here' : 'Register First Admin Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    width: '100%',
    maxWidth: '1200px',
    minHeight: '680px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    }
  },
  heroSection: {
    position: 'relative',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px',
    color: '#ffffff',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  logoBadge: {
    background: 'rgba(255, 255, 255, 0.08)',
    width: '72px',
    height: '72px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '28px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: '800',
    marginBottom: '12px',
    letterSpacing: '-0.5px',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#cbd5e1',
    marginBottom: '40px',
    lineHeight: '1.5',
  },
  heroFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    color: '#94a3b8',
  },
  featureDot: {
    color: '#fbbf24',
    fontSize: '24px',
  },
  formSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
  },
  formHeader: {
    marginBottom: '32px',
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  formSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    color: 'var(--danger)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    marginBottom: '24px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    color: 'var(--text-tertiary)',
  },
  input: {
    width: '100%',
    padding: '12px 16px 12px 42px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'var(--transition)',
    ':focus': {
      borderColor: 'var(--primary)',
      boxShadow: '0 0 0 3px var(--primary-light)',
    }
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition)',
    boxShadow: 'var(--shadow-sm)',
    ':hover': {
      backgroundColor: 'var(--primary-hover)',
    }
  },
  toggleFooter: {
    marginTop: '28px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    ':hover': {
      textDecoration: 'underline',
    }
  }
};
