import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  LogOut,
  Activity,
  Layers,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  UserPlus,
  School,
  X,
  Sparkles,
  ExternalLink,
  Globe,
  Calendar,
  UserCheck,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  FileCheck2,
  ShieldCheck,
  Award,
  Landmark,
  Home,
  Bed
} from 'lucide-react';
import AdmissionsTab from './AdmissionsTab';
import AcademicYearsTab from './AcademicYearsTab';
import SubjectsTab from './SubjectsTab';
import ClassesStreamsTab from './ClassesStreamsTab';
import TeachersTab from './TeachersTab';
import ClassPermitsTab from './ClassPermitsTab';
import Finance from '../Finance';
import Hostel from '../Hostel';
import './AdminPortal.css';

export default function AdminPortal({ onSwitchToLegacy }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Deduce activeTab from URL path
  const getTabFromPath = (path) => {
    if (path.includes('/admin/admissions')) return 'admissions';
    if (path.includes('/admin/permits')) return 'permits';
    if (path.includes('/admin/finance')) return 'finance';
    if (path.includes('/admin/hostel') || path.includes('/admin/boarding')) return 'hostel';
    if (path.includes('/admin/academic-years')) return 'academic-years';
    if (path.includes('/admin/subjects')) return 'subjects';
    if (path.includes('/admin/classes')) return 'classes';
    if (path.includes('/admin/teachers')) return 'teachers';
    if (path.includes('/admin/students')) return 'students';
    if (path.includes('/admin/users')) return 'users';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState(null);

  // Live Data State
  const [usersList, setUsersList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [applicationsList, setApplicationsList] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ status: 'Operational', latency: 42 });

  // Modal States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Form states
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [classForm, setClassForm] = useState({ name: '', level: 'S1', stream: 'Main', academicYear: 2026 });
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: 'StudentPass2026!',
    classId: '',
    gender: 'Male',
    parentName: '',
    parentPhone: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Keep activeTab in sync when browser URL changes (e.g. Back/Forward)
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    if (tab === 'overview') navigate('/admin');
    else navigate(`/admin/${tab}`);
  };

  // Fetch all live data from backend
  const fetchLiveData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const startTime = performance.now();
      
      const [usersRes, classesRes, studentsRes, healthRes, appsRes, yearsRes, subsRes, teachersRes] = await Promise.allSettled([
        api.get('/auth/users'),
        api.get('/classes'),
        api.get('/students'),
        api.get('/health'),
        api.get('/student-applications'),
        api.get('/academic-years'),
        api.get('/subjects'),
        api.get('/teachers')
      ]);

      const roundtrip = Math.round(performance.now() - startTime);

      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        setUsersList(usersRes.value);
      }
      if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)) {
        setClassesList(classesRes.value);
      }
      if (studentsRes.status === 'fulfilled') {
        const data = studentsRes.value?.students || studentsRes.value;
        if (Array.isArray(data)) setStudentsList(data);
      }
      if (appsRes.status === 'fulfilled' && Array.isArray(appsRes.value)) {
        setApplicationsList(appsRes.value);
      }
      if (yearsRes.status === 'fulfilled' && Array.isArray(yearsRes.value)) {
        setAcademicYearsList(yearsRes.value);
      }
      if (subsRes.status === 'fulfilled' && Array.isArray(subsRes.value)) {
        setSubjectsList(subsRes.value);
      }
      if (teachersRes.status === 'fulfilled' && Array.isArray(teachersRes.value)) {
        setTeachersList(teachersRes.value);
      }
      if (healthRes.status === 'fulfilled') {
        setSystemHealth({
          status: 'Operational',
          latency: roundtrip
        });
      }
    } catch (err) {
      console.error('Failed to sync academic data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  // Admissions Approval & Rejection Handlers
  const handleApproveApplication = async (appId) => {
    setActionLoading(true);
    try {
      const res = await api.put(`/student-applications/${appId}/approve`);
      showAlert(res.message || `Admission approved! Issued Admission Number: ${res.admission_number}`);
      await fetchLiveData(true);
    } catch (err) {
      showAlert(err.message || 'Failed to approve application', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectApplication = async (appId, reason) => {
    setActionLoading(true);
    try {
      const res = await api.put(`/student-applications/${appId}/reject`, { reason });
      showAlert(res.message || 'Application rejected');
      await fetchLiveData(true);
    } catch (err) {
      showAlert(err.message || 'Failed to reject application', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Real Creation Handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/auth/register', userForm);
      showAlert(`User "${userForm.name}" registered successfully!`);
      setShowAddUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'teacher' });
      fetchLiveData(true);
    } catch (err) {
      showAlert(err.response?.data?.error?.message || err.message || 'Failed to create user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/classes', classForm);
      showAlert(`Class "${classForm.name}" created successfully!`);
      setShowAddClassModal(false);
      setClassForm({ name: '', level: 'S1', stream: 'Main', academicYear: 2026 });
      fetchLiveData(true);
    } catch (err) {
      showAlert(err.response?.data?.error?.message || err.message || 'Failed to create class', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/students', studentForm);
      showAlert(`Student "${studentForm.name}" enrolled successfully!`);
      setShowAddStudentModal(false);
      setStudentForm({
        name: '',
        email: '',
        password: 'StudentPass2026!',
        classId: '',
        gender: 'Male',
        parentName: '',
        parentPhone: ''
      });
      fetchLiveData(true);
    } catch (err) {
      showAlert(err.response?.data?.error?.message || err.message || 'Failed to enroll student', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered queries
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return usersList;
    const q = searchQuery.toLowerCase();
    return usersList.filter(u => 
      u.name?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) || 
      u.role?.toLowerCase().includes(q)
    );
  }, [usersList, searchQuery]);

  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classesList;
    const q = searchQuery.toLowerCase();
    return classesList.filter(c => 
      c.name?.toLowerCase().includes(q) || 
      c.level?.toLowerCase().includes(q) ||
      c.stream?.toLowerCase().includes(q)
    );
  }, [classesList, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return studentsList;
    const q = searchQuery.toLowerCase();
    return studentsList.filter(s => 
      s.name?.toLowerCase().includes(q) || 
      s.studentId?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [studentsList, searchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-portal-root">
      {/* Top Notification Toast — No card borders */}
      {alert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#131f37',
          color: alert.type === 'error' ? '#f87171' : '#34d399',
          border: 'none',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          fontWeight: 700,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'apModalIn 0.2s ease-out'
        }}>
          {alert.type === 'error' ? <AlertTriangle size={18} color="#f87171" /> : <CheckCircle size={18} color="#34d399" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div 
          className="ap-sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* 2-Column Dashboard Shell */}
      <div className="ap-layout-shell">
        {/* Left Sidebar Navigation */}
        <aside className={`ap-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileNavOpen ? 'mobile-open' : ''}`}>
          {/* Brand & Toggle */}
          <div className="ap-sidebar-brand-wrapper">
            <div className="ap-sidebar-brand" onClick={() => handleTabChange('overview')} title="Ndugu Academy Admin Portal">
              <div className="ap-brand-icon">
                <School size={22} color="#c59b27" />
              </div>
              {!sidebarCollapsed && (
                <div className="ap-brand-text">
                  <div className="ap-brand-title">NDUGU ACADEMY</div>
                  <div className="ap-brand-sub">Admin Portal</div>
                </div>
              )}
            </div>
            
            <button
              type="button"
              className="ap-sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label="Toggle Sidebar"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Quick User Identity Card in Sidebar */}
          {!sidebarCollapsed ? (
            <div className="ap-sidebar-profile">
              <div className="ap-user-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="ap-sidebar-profile-info">
                <div className="ap-user-name">{user?.name || 'Administrator'}</div>
                <div className="ap-user-role">{user?.role || 'admin'}</div>
              </div>
            </div>
          ) : (
            <div className="ap-sidebar-profile collapsed" title={`${user?.name || 'Administrator'} (${user?.role || 'admin'})`}>
              <div className="ap-user-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
            </div>
          )}

          {/* Grouped Sidebar Navigation Menu */}
          <div className="ap-sidebar-nav">
            {/* GROUP 1: COMMAND CENTER */}
            <div className="ap-nav-group">
              {!sidebarCollapsed && <div className="ap-nav-group-title">Command Center</div>}
              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabChange('overview')}
                title="Overview Dashboard"
              >
                <div className="ap-link-lead">
                  <LayoutDashboard size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Overview</span>}
                </div>
              </button>
            </div>

            {/* GROUP 2: BURSAR & FINANCIALS (LICOKA BENCHMARK) */}
            <div className="ap-nav-group">
              {!sidebarCollapsed && <div className="ap-nav-group-title">Bursar &amp; Financials</div>}
              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'finance' ? 'active' : ''}`}
                onClick={() => handleTabChange('finance')}
                title="Institutional Finances, Fees & 40% Gatekeeper"
              >
                <div className="ap-link-lead">
                  <Landmark size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Fees &amp; Financials</span>}
                </div>
                {!sidebarCollapsed && <span className="ap-badge-gold">Bursary</span>}
              </button>
            </div>

            {/* GROUP 3: RESIDENTIAL & HOSTEL (LICOKA BENCHMARK) */}
            <div className="ap-nav-group">
              {!sidebarCollapsed && <div className="ap-nav-group-title">Dormitories &amp; Boarding</div>}
              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'hostel' ? 'active' : ''}`}
                onClick={() => handleTabChange('hostel')}
                title="Hostel Accommodation, Bed Allocations & Exeat Passes"
              >
                <div className="ap-link-lead">
                  <Home size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Dormitories &amp; Welfare</span>}
                </div>
                {!sidebarCollapsed && <span className="ap-badge-accent">Hostels</span>}
              </button>
            </div>

            {/* GROUP 4: ADMISSIONS & CLEARANCE */}
            <div className="ap-nav-group">
              {!sidebarCollapsed && <div className="ap-nav-group-title">Admissions &amp; Clearance</div>}
              
              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'admissions' ? 'active' : ''}`}
                onClick={() => handleTabChange('admissions')}
                title="Admissions Board"
              >
                <div className="ap-link-lead">
                  <UserCheck size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Admissions</span>}
                </div>
                {!sidebarCollapsed && (
                  applicationsList.filter(a => a.status === 'pending').length > 0 ? (
                    <span className="ap-badge-gold">
                      {applicationsList.filter(a => a.status === 'pending').length} pending
                    </span>
                  ) : applicationsList.length > 0 ? (
                    <span className="ap-badge-subtle">{applicationsList.length}</span>
                  ) : null
                )}
              </button>

              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'permits' ? 'active' : ''}`}
                onClick={() => handleTabChange('permits')}
                title="Class Entry Permits & Stream Allocations"
              >
                <div className="ap-link-lead">
                  <FileCheck2 size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Class Permits</span>}
                </div>
                {!sidebarCollapsed && <span className="ap-badge-accent">PER-xxxx</span>}
              </button>

              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => handleTabChange('students')}
                title="Students Registry"
              >
                <div className="ap-link-lead">
                  <GraduationCap size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Students Registry</span>}
                </div>
                {!sidebarCollapsed && studentsList.length > 0 && (
                  <span className="ap-badge-subtle">{studentsList.length}</span>
                )}
              </button>
            </div>

            {/* GROUP 5: ACADEMIC CALENDAR & CURRICULUM */}
            <div className="ap-nav-group">
              {!sidebarCollapsed && <div className="ap-nav-group-title">Academics &amp; Faculty</div>}

              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'academic-years' ? 'active' : ''}`}
                onClick={() => handleTabChange('academic-years')}
                title="Academic Years & Terms"
              >
                <div className="ap-link-lead">
                  <Calendar size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Years &amp; Terms</span>}
                </div>
                {!sidebarCollapsed && academicYearsList.length > 0 && (
                  <span className="ap-badge-subtle">
                    {academicYearsList.find(y => y.isActive)?.terms?.find(t => t.isCurrent)?.name || 'Active'}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'subjects' ? 'active' : ''}`}
                onClick={() => handleTabChange('subjects')}
                title="Curriculum Subjects"
              >
                <div className="ap-link-lead">
                  <BookOpen size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Curriculum Subjects</span>}
                </div>
                {!sidebarCollapsed && subjectsList.length > 0 && (
                  <span className="ap-badge-subtle">{subjectsList.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'classes' ? 'active' : ''}`}
                onClick={() => handleTabChange('classes')}
                title="Classes & Streams"
              >
                <div className="ap-link-lead">
                  <Layers size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Classes &amp; Streams</span>}
                </div>
                {!sidebarCollapsed && classesList.length > 0 && (
                  <span className="ap-badge-subtle">{classesList.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => handleTabChange('teachers')}
                title="Teaching Faculty"
              >
                <div className="ap-link-lead">
                  <Users size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Teaching Faculty</span>}
                </div>
                {!sidebarCollapsed && teachersList.length > 0 && (
                  <span className="ap-badge-subtle">{teachersList.length}</span>
                )}
              </button>
            </div>

            {/* GROUP 4: ADMINISTRATION & PERSONNEL */}
            <div className="ap-nav-group">
              {!sidebarCollapsed && <div className="ap-nav-group-title">Staff &amp; Access</div>}

              <button
                type="button"
                className={`ap-sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => handleTabChange('users')}
                title="Staff Accounts"
              >
                <div className="ap-link-lead">
                  <UserPlus size={18} className="ap-link-icon" />
                  {!sidebarCollapsed && <span className="ap-link-label">Staff &amp; Personnel</span>}
                </div>
                {!sidebarCollapsed && usersList.length > 0 && (
                  <span className="ap-badge-subtle">{usersList.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="ap-sidebar-footer">
            {!sidebarCollapsed && (
              <div 
                className="ap-sidebar-term-pill"
                onClick={() => handleTabChange('academic-years')}
                title="Manage Academic Calendar"
              >
                <div className="ap-pulse-dot" />
                <div className="ap-term-pill-content">
                  <span className="ap-term-pill-year">
                    {academicYearsList.find(y => y.isActive)?.label || '2026 Academic Year'}
                  </span>
                  <span className="ap-term-pill-term">
                    {academicYearsList.find(y => y.isActive)?.terms?.find(t => t.isCurrent)?.name || 'Term I'} Active
                  </span>
                </div>
              </div>
            )}

            <div className="ap-sidebar-footer-actions">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="ap-sidebar-action-btn"
                title="Public School Website"
              >
                <Globe size={16} color="#d8b257" />
                {!sidebarCollapsed && <span>School Website</span>}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="ap-sidebar-action-btn ap-logout-action"
                title="Sign out of Portal"
              >
                <LogOut size={16} />
                {!sidebarCollapsed && <span>Sign Out</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Content Shell: Header + Workspace */}
        <div className="ap-main-canvas">
          {/* Executive Topbar */}
          <header className="ap-topbar">
            <div className="ap-topbar-left">
              <button
                type="button"
                className="ap-mobile-menu-btn"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open Navigation Menu"
              >
                <Menu size={20} />
              </button>

              <div className="ap-topbar-breadcrumb">
                <span className="ap-breadcrumb-lead">Admin Console</span>
                <span className="ap-breadcrumb-sep">/</span>
                <span className="ap-breadcrumb-active">
                  {activeTab === 'overview' && 'Overview Dashboard'}
                  {activeTab === 'finance' && 'Institutional Finances & Bursar'}
                  {activeTab === 'hostel' && 'Dormitories & Welfare'}
                  {activeTab === 'admissions' && 'Admissions & Clearance'}
                  {activeTab === 'permits' && 'Class Entry Permits'}
                  {activeTab === 'academic-years' && 'Academic Years & Terms'}
                  {activeTab === 'subjects' && 'Curriculum Subjects'}
                  {activeTab === 'classes' && 'Classes & Streams'}
                  {activeTab === 'teachers' && 'Teaching Faculty'}
                  {activeTab === 'students' && 'Students Registry'}
                  {activeTab === 'users' && 'Staff Accounts'}
                </span>
              </div>
            </div>

            <div className="ap-topbar-right">
              {/* System Health Status */}
              <div className="ap-health-badge" title={`API Latency: ${systemHealth.latency}ms`}>
                <div className="ap-pulse-dot" />
                <span>{systemHealth.status} ({systemHealth.latency}ms)</span>
              </div>

              {/* Refresh / Sync Records */}
              <button
                type="button"
                onClick={() => fetchLiveData(true)}
                className="ap-btn-secondary ap-btn-compact"
                title="Sync live records from server"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span className="ap-hide-mobile">{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>

              {onSwitchToLegacy && (
                <button
                  type="button"
                  onClick={onSwitchToLegacy}
                  className="ap-btn-legacy ap-btn-compact"
                  title="Open legacy multi-tab backup"
                >
                  <ExternalLink size={14} />
                  <span className="ap-hide-mobile">Legacy</span>
                </button>
              )}

              {/* User Avatar Chip */}
              <div className="ap-user-chip">
                <div className="ap-user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="ap-user-info ap-hide-mobile">
                  <span className="ap-user-name">{user?.name || 'Administrator'}</span>
                  <span className="ap-user-role">{user?.role || 'admin'}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Workspace */}
          <main className="ap-workspace">
            {/* Dynamic Action & Search Bar */}
            <div className="ap-action-bar">
              <div className="ap-page-header">
                <h2>
                  {activeTab === 'overview' && 'School Administration Overview'}
                  {activeTab === 'finance' && 'Institutional Finance & Bursar Operations'}
                  {activeTab === 'hostel' && 'Hostel Accommodation & Dormitory Management'}
                  {activeTab === 'admissions' && 'Student Admissions & Clearance Board'}
                  {activeTab === 'permits' && 'Class Entry Permits & Stream Allocations'}
                  {activeTab === 'academic-years' && 'Academic Years & School Terms'}
                  {activeTab === 'subjects' && 'Curriculum & Subjects Catalog'}
                  {activeTab === 'classes' && 'Academic Classes & Stream Allocations'}
                  {activeTab === 'teachers' && 'Teaching Faculty Directory'}
                  {activeTab === 'students' && 'Student Enrollment Registry'}
                  {activeTab === 'users' && 'Staff & System Accounts'}
                </h2>
                <p>
                  {activeTab === 'overview' && 'Central command center for Ndugu Academy operations.'}
                  {activeTab === 'finance' && 'Manage tuition fee structures, student ledger balances, official RcT receipts, and 40% threshold exam/dining gatekeeper passes.'}
                  {activeTab === 'hostel' && 'Oversee residential boarding dormitories, room and bed capacity allocations, student boarding approvals, and digital exeat passes.'}
                  {activeTab === 'admissions' && 'Review applications, verify records, approve admissions, and issue official LCK- admission numbers.'}
                  {activeTab === 'permits' && 'Generate official Licoka-style class permits (PER-xxxx), verify 40% fee clearance status, assign streams (Green/White/Blue), and print student permit passes.'}
                  {activeTab === 'academic-years' && 'Configure calendar sessions and toggle active Term I, Term II, or Term III.'}
                  {activeTab === 'subjects' && 'Manage O-Level (Compulsory/Optional) and A-Level (Principal/Subsidiary) subjects with UNEB codes.'}
                  {activeTab === 'classes' && 'Attach streams to academic classes, assign stream masters, and track capacities.'}
                  {activeTab === 'teachers' && 'Manage faculty profiles, contact records, qualifications, and teaching allocations.'}
                  {activeTab === 'students' && 'Ugandan curriculum student registry with auto-generated registration numbers.'}
                  {activeTab === 'users' && 'Manage authenticated accounts for instructors, heads of department, and bursars.'}
                </p>
              </div>

          <div className="ap-controls-group">
            {['users', 'students'].includes(activeTab) && (
              <div className="ap-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ap-search-input"
                />
              </div>
            )}

            <button
              onClick={() => fetchLiveData(true)}
              className="ap-btn-secondary"
              title="Refresh live school records"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Records'}</span>
            </button>

            {activeTab === 'users' && (
              <button onClick={() => setShowAddUserModal(true)} className="ap-btn-primary">
                <UserPlus size={16} />
                <span>Add Staff Account</span>
              </button>
            )}
            {activeTab === 'students' && (
              <button onClick={() => setShowAddStudentModal(true)} className="ap-btn-primary">
                <GraduationCap size={16} />
                <span>Enroll Student</span>
              </button>
            )}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowAddStudentModal(true)} className="ap-btn-primary">
                  <Plus size={15} /> Enroll Student
                </button>
                <button onClick={() => setShowAddClassModal(true)} className="ap-btn-secondary">
                  <Plus size={15} /> Create Class
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: OVERVIEW — SLEEK COMPACT EXECUTIVE DASHBOARD */}
        {activeTab === 'overview' && (
          <>
            {/* Stat Cards Grid — Balanced 6 Cards */}
            <div className="ap-stat-grid">
              
              {/* Card 1: Academic Year & Term */}
              <div className="ap-stat-card" onClick={() => handleTabChange('academic-years')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Academic Year</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(197, 155, 39, 0.15)' }}>
                    <Calendar size={15} color="#d8b257" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#d8b257' }}>
                  {academicYearsList.find(y => y.isActive)?.year || 2026}
                </div>
                <div className="ap-stat-footer">
                  <span style={{ color: '#34d399', fontWeight: 700 }}>● {academicYearsList.find(y => y.isActive)?.terms?.find(t => t.isCurrent)?.name || 'Term I'} Active</span>
                  <span style={{ color: '#94a3b8' }}>&bull; Switch</span>
                </div>
              </div>

              {/* Card 2: Enrolled Students */}
              <div className="ap-stat-card" onClick={() => handleTabChange('students')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Enrolled Students</span>
                  <div className="ap-stat-icon">
                    <GraduationCap size={15} color="#d8b257" />
                  </div>
                </div>
                <div className="ap-stat-val">{studentsList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={12} color="#d8b257" />
                  <span>Active Registration Records</span>
                </div>
              </div>

              {/* Card 3: Admissions Pipeline */}
              <div className="ap-stat-card" onClick={() => handleTabChange('admissions')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Admissions Intake</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                    <UserCheck size={15} color="#f59e0b" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#d8b257' }}>{applicationsList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={12} color="#f59e0b" />
                  <span>{applicationsList.filter(a => a.status === 'pending').length} Pending Approvals</span>
                </div>
              </div>

              {/* Card 4: Classes & Streams */}
              <div className="ap-stat-card" onClick={() => handleTabChange('classes')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Classes &amp; Streams</span>
                  <div className="ap-stat-icon">
                    <Layers size={15} color="#d8b257" />
                  </div>
                </div>
                <div className="ap-stat-val">{classesList.length} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ap-text-muted)' }}>Classes</span></div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={12} color="#d8b257" />
                  <span>{classesList.reduce((acc, c) => acc + (c.streams?.length || 0), 0)} Attached Streams</span>
                </div>
              </div>

              {/* Card 5: Curriculum Subjects */}
              <div className="ap-stat-card" onClick={() => handleTabChange('subjects')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Curriculum Subjects</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }}>
                    <BookOpen size={15} color="#60a5fa" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#60a5fa' }}>{subjectsList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={12} color="#60a5fa" />
                  <span>O-Level &amp; A-Level Catalog</span>
                </div>
              </div>

              {/* Card 6: Teaching Faculty */}
              <div className="ap-stat-card" onClick={() => handleTabChange('teachers')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Teaching Faculty</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)' }}>
                    <Users size={15} color="#34d399" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#34d399' }}>{teachersList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={12} color="#34d399" />
                  <span>Subject &amp; Stream Teachers</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Staff Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div className="ap-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <Sparkles size={16} color="#d8b257" />
                    <span>Administrative Operations</span>
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--ap-text-dim)' }}>Core Shortcuts</span>
                </div>

                <div className="ap-quick-grid">
                  <button
                    onClick={() => setShowAddClassModal(true)}
                    className="ap-quick-tile"
                  >
                    <div className="ap-quick-tile-icon">
                      <School size={16} />
                    </div>
                    <div>
                      <div className="ap-quick-tile-title">Add Class</div>
                      <div className="ap-quick-tile-desc">S1–S6 and Streams</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="ap-quick-tile"
                  >
                    <div className="ap-quick-tile-icon">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <div className="ap-quick-tile-title">Enroll Student</div>
                      <div className="ap-quick-tile-desc">Registration &amp; Parent</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="ap-quick-tile"
                  >
                    <div className="ap-quick-tile-icon">
                      <UserPlus size={16} />
                    </div>
                    <div>
                      <div className="ap-quick-tile-title">Staff Account</div>
                      <div className="ap-quick-tile-desc">Teacher / Bursar login</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabChange('permits')}
                    className="ap-quick-tile"
                  >
                    <div className="ap-quick-tile-icon">
                      <FileCheck2 size={16} />
                    </div>
                    <div>
                      <div className="ap-quick-tile-title">Entry Permits</div>
                      <div className="ap-quick-tile-desc">Licoka Clearance Status</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Staff Accounts */}
              <div className="ap-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <Users size={16} color="#d8b257" />
                    <span>Academic &amp; Administrative Personnel</span>
                  </h3>
                  <button
                    onClick={() => handleTabChange('users')}
                    style={{ background: 'none', border: 'none', color: '#d8b257', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    View All &rarr;
                  </button>
                </div>

                {usersList.length === 0 ? (
                  <div className="ap-empty-state" style={{ padding: '24px 16px' }}>
                    <Users size={28} color="#d8b257" />
                    <p style={{ fontSize: '12px', margin: '8px 0' }}>No staff accounts registered yet.</p>
                    <button onClick={() => setShowAddUserModal(true)} className="ap-btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Add First User
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {usersList.slice(0, 4).map((u) => (
                      <div key={u._id || u.email} className="ap-person-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="ap-person-avatar">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ap-text-dim)' }}>{u.email}</div>
                          </div>
                        </div>
                        <span className="ap-badge" style={{ fontSize: '10.5px', padding: '3px 8px' }}>{u.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB: ADMISSIONS BOARD */}
        {activeTab === 'admissions' && (
          <AdmissionsTab
            applications={applicationsList}
            onRefresh={() => fetchLiveData(true)}
            onApprove={handleApproveApplication}
            onReject={handleRejectApplication}
            actionLoading={actionLoading}
          />
        )}

        {/* TAB: CLASS ENTRY PERMITS (LICOKA CLEARANCE) */}
        {activeTab === 'permits' && (
          <ClassPermitsTab />
        )}

        {/* TAB: INSTITUTIONAL FINANCE & BURSAR OPERATIONS */}
        {activeTab === 'finance' && (
          <Finance />
        )}

        {/* TAB: HOSTEL ACCOMMODATION & DORMITORIES */}
        {activeTab === 'hostel' && (
          <Hostel />
        )}

        {/* TAB: ACADEMIC YEARS & TERMS */}
        {activeTab === 'academic-years' && (
          <AcademicYearsTab
            academicYears={academicYearsList}
            onRefresh={() => fetchLiveData(true)}
            showAlert={showAlert}
          />
        )}

        {/* TAB: CURRICULUM SUBJECTS */}
        {activeTab === 'subjects' && (
          <SubjectsTab
            subjects={subjectsList}
            teachers={teachersList}
            onRefresh={() => fetchLiveData(true)}
            showAlert={showAlert}
          />
        )}

        {/* TAB: CLASSES & STREAMS MANAGEMENT */}
        {activeTab === 'classes' && (
          <ClassesStreamsTab
            classes={classesList}
            teachers={teachersList}
            academicYears={academicYearsList}
            onRefresh={() => fetchLiveData(true)}
            showAlert={showAlert}
          />
        )}

        {/* TAB: TEACHING FACULTY */}
        {activeTab === 'teachers' && (
          <TeachersTab
            teachers={teachersList}
            subjects={subjectsList}
            classes={classesList}
            onRefresh={() => fetchLiveData(true)}
            showAlert={showAlert}
          />
        )}

        {/* TAB: USERS & STAFF — NO CARD BORDER */}
        {activeTab === 'users' && (
          <div className="ap-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>School Personnel Directory ({filteredUsers.length})</h3>
                <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Authorized academic and administrative staff accounts</p>
              </div>
              <button onClick={() => setShowAddUserModal(true)} className="ap-btn-primary">
                <UserPlus size={16} />
                <span>Add Staff Member</span>
              </button>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="ap-empty-state">
                <Users size={40} color="#d8b257" />
                <p>No matching staff members found.</p>
                <button onClick={() => setShowAddUserModal(true)} className="ap-btn-primary">
                  Create Staff Account
                </button>
              </div>
            ) : (
              <div className="ap-table-wrapper">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email / Username</th>
                      <th>Designation</th>
                      <th>Account Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id || u.email}>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{u.name}</td>
                        <td style={{ color: '#d4d4d4' }}>{u.email}</td>
                        <td>
                          <span className="ap-badge">{u.role}</span>
                        </td>
                        <td>
                          <span style={{ color: '#34d399', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            <span className="ap-pulse-dot" style={{ width: '6px', height: '6px', backgroundColor: '#34d399' }} />
                            <span>Active</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STUDENTS — NO CARD BORDER */}
        {activeTab === 'students' && (
          <div className="ap-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Student Registry ({filteredStudents.length})</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Official enrollment registry with unique student identification numbers</p>
              </div>
              <button onClick={() => setShowAddStudentModal(true)} className="ap-btn-primary">
                <GraduationCap size={16} />
                <span>Enroll Student</span>
              </button>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="ap-empty-state">
                <GraduationCap size={40} color="#d8b257" />
                <p>No student enrollment records found.</p>
                <button onClick={() => setShowAddStudentModal(true)} className="ap-btn-primary">
                  Enroll First Student
                </button>
              </div>
            ) : (
              <div className="ap-table-wrapper">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Full Name</th>
                      <th>Class Cohort</th>
                      <th>Gender</th>
                      <th>Parent / Guardian</th>
                      <th>Contact Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s._id || s.studentId}>
                        <td style={{ fontFamily: 'var(--admin-mono)', color: '#d8b257', fontWeight: 700 }}>
                          {s.studentId}
                        </td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{s.name}</td>
                        <td>{s.class?.name || 'Not Assigned'}</td>
                        <td>{s.gender || '—'}</td>
                        <td>{s.parentName || '—'}</td>
                        <td style={{ fontFamily: 'var(--admin-mono)', color: '#d4d4d4' }}>{s.parentPhone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
        </div> {/* /.ap-main-canvas */}
      </div> {/* /.ap-layout-shell */}

      {/* MODAL 1: ADD USER — NO CARD BORDER */}
      {showAddUserModal && (
        <div className="ap-modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>Create Staff Account</h3>
              <button className="ap-modal-close" onClick={() => setShowAddUserModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="ap-modal-body">
                <div className="ap-field">
                  <label>Full Staff Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tr. Sarah Nakato"
                    value={userForm.name}
                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. s.nakato@ndugu.ac.ug"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>School Role</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="admin">Administrator</option>
                    <option value="teacher">Teacher / Instructor</option>
                    <option value="bursar">Bursar (Finance)</option>
                    <option value="headteacher">Headteacher</option>
                    <option value="director-of-studies">Director of Studies</option>
                  </select>
                </div>
              </div>
              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="ap-btn-primary">
                  {actionLoading ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD CLASS — NO CARD BORDER */}
      {showAddClassModal && (
        <div className="ap-modal-overlay" onClick={() => setShowAddClassModal(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>Create Academic Class</h3>
              <button className="ap-modal-close" onClick={() => setShowAddClassModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="ap-modal-body">
                <div className="ap-field">
                  <label>Class Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior 1 Alpha"
                    value={classForm.name}
                    onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>Academic Level</label>
                  <select
                    value={classForm.level}
                    onChange={e => setClassForm({ ...classForm, level: e.target.value })}
                  >
                    <option value="S1">Senior 1 (S1)</option>
                    <option value="S2">Senior 2 (S2)</option>
                    <option value="S3">Senior 3 (S3)</option>
                    <option value="S4">Senior 4 (S4)</option>
                    <option value="S5">Senior 5 (S5)</option>
                    <option value="S6">Senior 6 (S6)</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label>Stream</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science, Arts, Alpha, Blue"
                    value={classForm.stream}
                    onChange={e => setClassForm({ ...classForm, stream: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>Academic Year</label>
                  <input
                    type="number"
                    required
                    value={classForm.academicYear}
                    onChange={e => setClassForm({ ...classForm, academicYear: parseInt(e.target.value, 10) })}
                  />
                </div>
              </div>
              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setShowAddClassModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="ap-btn-primary">
                  {actionLoading ? 'Saving...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ENROLL STUDENT — NO CARD BORDER */}
      {showAddStudentModal && (
        <div className="ap-modal-overlay" onClick={() => setShowAddStudentModal(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>Enroll New Student</h3>
              <button className="ap-modal-close" onClick={() => setShowAddStudentModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateStudent}>
              <div className="ap-modal-body">
                <div className="ap-field">
                  <label>Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Joshua Kato"
                    value={studentForm.name}
                    onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>Student Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. j.kato@student.ndugu.ac.ug"
                    value={studentForm.email}
                    onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>Assign to Class</label>
                  <select
                    value={studentForm.classId}
                    onChange={e => setStudentForm({ ...studentForm, classId: e.target.value })}
                  >
                    <option value="">-- Select Class --</option>
                    {classesList.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.level})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ap-field">
                  <label>Gender</label>
                  <select
                    value={studentForm.gender}
                    onChange={e => setStudentForm({ ...studentForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label>Parent / Guardian Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Robert Kato"
                    value={studentForm.parentName}
                    onChange={e => setStudentForm({ ...studentForm, parentName: e.target.value })}
                  />
                </div>
                <div className="ap-field">
                  <label>Parent Phone (Uganda +256)</label>
                  <input
                    type="text"
                    placeholder="+256 700 000000"
                    value={studentForm.parentPhone}
                    onChange={e => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setShowAddStudentModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="ap-btn-primary">
                  {actionLoading ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
