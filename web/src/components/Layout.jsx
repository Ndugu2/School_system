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
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const filteredMenuItems = menuItems.filter(item => canAccessTab(user?.role, item.id));

  return (
    <div style={styles.appContainer}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, left: sidebarOpen ? 0 : '-280px' }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoContainer}>
            <GraduationCap size={28} color="#fbbf24" />
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
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '600' : '400'
                }}
              >
                <Icon size={20} style={{ color: isActive ? 'var(--primary)' : 'var(--text-tertiary)' }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={logout} style={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ ...styles.mainArea, marginLeft: sidebarOpen ? 'var(--sidebar-width)' : 0 }}>
        {/* Topbar */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              style={styles.menuToggleBtn}
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <Menu size={22} />
            </button>
            <h2 style={styles.pageTitle}>
              {menuItems.find(i => i.id === currentTab)?.label || 'Overview'}
            </h2>
          </div>

          <div style={styles.headerRight}>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} style={styles.iconBtn}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Notification Badge */}
            <button style={styles.iconBtn}>
              <Bell size={20} />
            </button>

            {/* Profile Summary */}
            <div style={styles.profileBadge}>
              <div style={styles.avatarPlaceholder}>
                {userInitial}
              </div>
              <div style={styles.profileText}>
                <span style={styles.profileName}>{user?.name || 'User'}</span>
                <span style={styles.profileRole}>{userRole}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content body */}
        <main style={styles.contentBody}>
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
    backgroundColor: 'var(--bg-primary)',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    width: 'var(--sidebar-width)',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
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
    borderBottom: '1px solid var(--border)',
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
    color: 'var(--text-primary)',
  },
  closeSidebarBtn: {
    display: 'none', // Shown only on mobile screens
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  navigation: {
    padding: '27px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    flex: 1,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'var(--transition)',
    fontSize: '15px',
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
    gap: '15px',
    padding: '12px 16px',
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--danger)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'var(--transition)',
    ':hover': {
      backgroundColor: 'var(--danger-light)',
    }
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    transition: 'var(--transition)',
  },
  header: {
    height: '84px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
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
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '21px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '19px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '50%',
    transition: 'var(--transition)',
    ':hover': {
      backgroundColor: 'var(--bg-tertiary)',
    }
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '18px',
    borderLeft: '1px solid var(--border)',
  },
  avatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
  },
  profileName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  profileRole: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  contentBody: {
    padding: '24px 32px 32px',
    flex: 1,
    overflowY: 'auto',
  }
};
