import { ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage({ role }) {
  const { logout } = useAuth();
  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.iconWrap}>
          <ShieldAlert size={44} color="#dc2626" />
        </div>
        <h2 style={s.title}>Access Denied</h2>
        <p style={s.message}>
          Your account {role ? `(${role})` : ''} does not have permission to view this area.
          If you believe this is a mistake, please contact the school administrator.
        </p>
        <button style={s.backBtn} onClick={logout}>
          <Lock size={15} /> Sign Out
        </button>
      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
  },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: '48px',
    maxWidth: 460,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: 'var(--danger-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' },
  message: { margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: 'none',
    borderRadius: 10,
    padding: '11px 22px',
    backgroundColor: 'var(--danger)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
};