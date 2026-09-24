import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, LayoutDashboard, Users, BookOpen, 
  Calendar, FileText, CreditCard, LogOut, Sun, Moon, Bell, Menu, X, BarChart2, Settings,
  UserCheck, Briefcase, Library as LibraryIcon, Home, MessageCircle
} from 'lucide-react';
import { canAccessTab } from '../config/permissions';

export default function Layout({ children, currentTab, setCurrentTab }) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const roleLabels = {
    bursar: 'FINANCE MANAGER',
    headteacher: 'HEADTEACHER',
    'director-of-studies': 'DIRECTOR OF STUDIES',
    hod: 'HEAD OF DEPARTMENT',
    teacher: 'TEACHER',
    student: 'STUDENT',
    parent: 'PARENT',
    admin: 'ADMIN',
  };
  const userRole = user?.role ? (roleLabels[user.role] || user.role.toUpperCase()) : 'USER';
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admissions', label: 'Admissions & Clearance', icon: UserCheck },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap },
    { id: 'hr', label: 'Staff & HR', icon: Briefcase },
    { id: 'classes', label: 'Classes & Subjects', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'grades', label: 'Grades & Reports', icon: FileText },
    { id: 'fees', label: 'Fees & Invoices', icon: CreditCard },
    { id: 'finance', label: 'Finance & ERP', icon: CreditCard },
    { id: 'hostel', label: 'Hostel & Exeats', icon: Home },
    { id: 'library', label: 'Library', icon: LibraryIcon },
    { id: 'inventory', label: 'Inventory & Assets', icon: LayoutDashboard },
    { id: 'operations', label: 'Operations & Events', icon: Calendar },
    { id: 'messages', label: 'School Messages', icon: MessageCircle },
    { id: 'lms', label: 'Holiday E-Learning', icon: BookOpen },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart2 },
    { id: 'analytics', label: 'Student Risk', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const filteredMenuItems = menuItems.filter(item => canAccessTab(user?.role, item.id));

  return (
    <div style={{ ...styles.appContainer, overflowX: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          left: sidebarOpen ? 0 : '-280px',
          boxShadow: isMobile && sidebarOpen ? '0 20px 60px rgba(15, 23, 42, 0.12)' : 'none',
          width: isMobile ? 'min(280px, 85vw)' : 'var(--sidebar-width)',
        }}
      >
        <div style={styles.sidebarHeader}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIconWrap}>
              <GraduationCap size={22} color="#f5c452" />
            </div>
            <span style={styles.logoText}>Ndugu portal</span>
          </div>
          <button
            style={{
              ...styles.closeSidebarBtn,
              display: isMobile ? 'flex' : 'none',
            }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav style={styles.navigation}>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                style={{
                  ...styles.navItem,
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : '#1f2937',
                  fontWeight: isActive ? '700' : '500',
                  border: isActive ? '1px solid rgba(124, 58, 237, 0.35)' : '1px solid transparent'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : '#6b7280' }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={logout} style={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className="app-main-area"
        style={{
          ...styles.mainArea,
          marginLeft: isMobile ? 0 : (sidebarOpen ? 'var(--sidebar-width)' : 0),
          width: isMobile ? '100%' : undefined,
          maxWidth: '100%',
        }}
      >
        {/* Topbar */}
        <header className="app-header" style={styles.header}>
          <div className="app-header-left" style={styles.headerLeft}>
            <button
              style={styles.menuToggleBtn}
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <Menu size={22} />
            </button>
            <h2 className="app-page-title" style={styles.pageTitle}>
              {menuItems.find(i => i.id === currentTab)?.label || 'Overview'}
            </h2>
          </div>

          <div className="app-header-right" style={styles.headerRight}>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} style={styles.iconBtn}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Notification Badge */}
            <button style={styles.iconBtn}>
              <Bell size={20} />
            </button>

            {/* Profile Summary */}
            <div className="app-profile-badge" style={styles.profileBadge}>
              <div style={styles.avatarPlaceholder}>
                {userInitial}
              </div>
              <div className="app-profile-text" style={styles.profileText}>
                <span style={styles.profileName}>{user?.name || 'User'}</span>
                <span style={styles.profileRole}>{userRole}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content body */}
        <main className="app-content-body" style={styles.contentBody}>
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#e8edf3',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    width: 'var(--sidebar-width)',
    backgroundColor: '#f5f7fa',
    borderRight: '1px solid rgba(148, 163, 184, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    transition: 'var(--transition)',
  },
  sidebarHeader: {
    height: '84px',
    padding: '0 26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    color: '#1f2937',
  },
  closeSidebarBtn: {
    display: 'none', // Shown only on mobile screens
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  navigation: {
    padding: '22px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'var(--transition)',
    fontSize: '16px',
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: 'var(--bg-tertiary)',
    }
  },
  sidebarFooter: {
    padding: '20px 18px',
    borderTop: '1px solid var(--border)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 16px',
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#dc2626',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'var(--transition)',
    ':hover': {
      backgroundColor: 'rgba(239, 68, 68, 0.06)',
    }
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    transition: 'var(--transition)',
    backgroundColor: '#e8edf3',
  },
  header: {
    height: '84px',
    backgroundColor: '#1a2434',
    borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 26px 0 18px',
    position: 'sticky',
    top: 0,
    zIndex: 90,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
  },
  menuToggleBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#edf4ff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#edf4ff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '8px',
    transition: 'var(--transition)',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.08)',
    }
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '10px',
    borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
  },
  avatarPlaceholder: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '15px',
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
  },
  profileName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#edf4ff',
  },
  profileRole: {
    fontSize: '11px',
    color: '#c9d1df',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  contentBody: {
    padding: '26px 28px 30px',
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#e8edf3',
  }
};
