import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminAuth from './pages/AdminPortal/AdminAuth';
import AdminPortal from './pages/AdminPortal/AdminPortal';
import LegacyApp from './legacy/LegacyApp';

function ProtectedAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Ndugu Academy Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AdminPortal />;
}

function LegacyRouteWrapper() {
  const navigate = useNavigate();
  return <LegacyApp onSwitchToAdminPortal={() => navigate('/admin')} />;
}

function LoginRouteWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Authenticating...</p>
      </div>
    );
  }

  // If already authenticated, redirect to admin
  if (user) {
    return <Navigate to="/admin" replace />;
  }

  return <AdminAuth />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin-first app: the public marketing site has been removed.
              "/" goes straight to the admin dashboard (login required). */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Portal Authentication Screen */}
          <Route path="/login" element={<LoginRouteWrapper />} />

          {/* Protected Central Admin Portal Routes */}
          <Route path="/admin" element={<ProtectedAdminRoute />} />
          <Route path="/admin/*" element={<ProtectedAdminRoute />} />

          {/* Optional Legacy Multi-Tab Prototype Backup */}
          <Route path="/legacy" element={<LegacyRouteWrapper />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#060b14',
    color: '#ffffff',
    gap: '20px',
  },
  spinner: {
    width: '46px',
    height: '46px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid #f59e0b',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    color: '#94a3b8',
  },
};
