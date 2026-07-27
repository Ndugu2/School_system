import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import DashboardOverview from './pages/DashboardOverview';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Grades from './pages/Grades';
import Fees from './pages/Fees';
import Finance from './pages/Finance';
import Inventory from './pages/Inventory';
import Operations from './pages/Operations';
import ParentPortal from './pages/ParentPortal';
import LMS from './pages/LMS';
import NotificationsHub from './pages/NotificationsHub';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function DashboardContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Connecting to Ndugu Academy Systems...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Render correct page view inside layout based on selected tab
  const renderTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'students':
        return <Students />;
      case 'teachers':
        return <Teachers />;
      case 'classes':
        return <Classes />;
      case 'attendance':
        return <Attendance />;
      case 'grades':
        return <Grades />;
      case 'fees':
        return <Fees />;
      case 'finance':
        return <Finance />;
      case 'inventory':
        return <Inventory />;
      case 'operations':
        return <Operations />;
      case 'parent_portal':
        return <ParentPortal />;
      case 'lms':
        return <LMS />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'notifications':
        return <NotificationsHub />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {renderTab()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b0f19', // Sleek dark loader
    color: '#ffffff',
    gap: '20px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '16px',
    fontWeight: '500',
    letterSpacing: '0.5px',
  }
};

// Add standard keyframe spin to header or stylesheet
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
