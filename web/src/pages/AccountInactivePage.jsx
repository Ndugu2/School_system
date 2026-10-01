import { UserX, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountInactivePage() {
  const { logout } = useAuth();
  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.iconWrap}>
          <UserX size={44} color="#d97706" />
        </div>
        <h2 style={s.title}>Account Deactivated</h2>
        <p style={s.message}>
          Your account has been deactivated by a school administrator. You cannot sign in until
          it is reactivated. Please contact the administration office for assistance.
        </p>
        <button style={s.backBtn} onClick={logout}>
          <LogOut size={15} /> Return to Sign In
        </button>
      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    background: 'var(--bg-primary)',
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
    backgroundColor: '#fef3c7',
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
    backgroundColor: 'var(--primary)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
};