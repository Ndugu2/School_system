import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import DashboardOverview from './pages/DashboardOverview';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Grades from './pages/Grades';
import ParentGrades from './pages/ParentGrades';
import Fees from './pages/Fees';
import Finance from './pages/Finance';
import Inventory from './pages/Inventory';
import Operations from './pages/Operations';
import ParentPortal from './pages/ParentPortal';
import LMS from './pages/LMS';
import NotificationsHub from './pages/NotificationsHub';
import Messages from './pages/Messages';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import RegistrationClearance from './pages/RegistrationClearance';
import HR from './pages/HR';
import Library from './pages/Library';
import Hostel from './pages/Hostel';
import LeadershipPortal from './pages/LeadershipPortal';
import Analytics from './pages/Analytics';
import { canAccessTab } from './config/permissions';

function DashboardContent() {
  const { user, loading } = useAuth();
  const defaultTab = 'dashboard';
  const [currentTab, setCurrentTab] = useState(defaultTab);

  useEffect(() => {
    if (user && user.role === 'parent') {
      setCurrentTab('parent_portal');
    }
  }, [user]);

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

  if (!canAccessTab(user.role, currentTab)) {
    return <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}><div style={styles.denied}>You do not have permission to access this area.</div></Layout>;
  }

  // Render correct page view inside layout based on selected tab
  const renderTab = () => {
    switch (currentTab) {
      case 'dashboard':
        if (user.role === 'headteacher') return <LeadershipPortal type="headteacher" setCurrentTab={setCurrentTab} />;
        if (user.role === 'director-of-studies') return <LeadershipPortal type="director-of-studies" setCurrentTab={setCurrentTab} />;
        if (user.role === 'hod') return <LeadershipPortal type="hod" setCurrentTab={setCurrentTab} />;
        if (user.role === 'teacher') return <TeacherDashboard setCurrentTab={setCurrentTab} />;
        if (user.role === 'student') return <StudentDashboard setCurrentTab={setCurrentTab} />;
        if (user.role === 'parent') return <ParentPortal />;
        if (user.role === 'bursar') return <Finance />;
        return <DashboardOverview setCurrentTab={setCurrentTab} />;
      case 'admissions':
        return <RegistrationClearance />;
      case 'students':
        return <Students />;
      case 'teachers':
        return <Teachers />;
      case 'hr':
        return <HR />;
      case 'classes':
        return <Classes />;
      case 'attendance':
        return <Attendance />;
      case 'grades':
        return user.role === 'parent' ? <ParentGrades /> : user.role === 'student' ? <ParentGrades viewer="student" /> : <Grades />;
      case 'fees':
        return <Fees />;
      case 'finance':
        return <Finance />;
      case 'hostel':
        return <Hostel />;
      case 'library':
        return <Library />;
      case 'inventory':
        return <Inventory />;
      case 'operations':
        return <Operations />;
      case 'parent_portal':
        return <ParentPortal />;
      case 'lms':
        return <LMS />;
      case 'reports':
        return user.role === 'parent' ? <ParentGrades /> : user.role === 'student' ? <ParentGrades viewer="student" /> : <Reports />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'notifications':
        return <NotificationsHub />;
      case 'messages':
        return <Messages />;
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
  },
  denied: { padding: '32px', borderRadius: '12px', background: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600 }
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
