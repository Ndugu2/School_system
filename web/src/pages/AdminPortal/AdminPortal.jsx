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
  BookOpen
} from 'lucide-react';
import AdmissionsTab from './AdmissionsTab';
import AcademicYearsTab from './AcademicYearsTab';
import SubjectsTab from './SubjectsTab';
import ClassesStreamsTab from './ClassesStreamsTab';
import TeachersTab from './TeachersTab';
import './AdminPortal.css';

export default function AdminPortal({ onSwitchToLegacy }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Deduce activeTab from URL path
  const getTabFromPath = (path) => {
    if (path.includes('/admin/admissions')) return 'admissions';
    if (path.includes('/admin/academic-years')) return 'academic-years';
    if (path.includes('/admin/subjects')) return 'subjects';
    if (path.includes('/admin/classes')) return 'classes';
    if (path.includes('/admin/teachers')) return 'teachers';
    if (path.includes('/admin/students')) return 'students';
    if (path.includes('/admin/users')) return 'users';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));
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

      {/* Header & Live Topbar */}
      <header className="ap-topbar">
        <div className="ap-brand-group">
          <div className="ap-brand-icon">
            <School size={22} color="#c59b27" />
          </div>
          <div>
            <div className="ap-brand-title">NDUGU ACADEMY</div>
            <div className="ap-brand-sub">School Administration Portal</div>
          </div>
          <div 
            onClick={() => handleTabChange('academic-years')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: '#0b1220',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              color: '#d8b257',
              cursor: 'pointer'
            }}
            title="Click to manage Academic Years & Terms"
          >
            <Calendar size={13} color="#d8b257" />
            <span>
              {academicYearsList.find(y => y.isActive)?.label || '2026 Academic Year'}
              {' '}&bull;{' '}
              <strong style={{ color: '#34d399' }}>
                {academicYearsList.find(y => y.isActive)?.terms?.find(t => t.isCurrent)?.name || 'Term I'}
              </strong>
            </span>
          </div>
        </div>

        {/* Single Page Navigation Tabs (Synced to URL) */}
        <nav className="ap-nav-tabs">
          <button
            className={`ap-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </button>

          <button
            className={`ap-tab-btn ${activeTab === 'admissions' ? 'active' : ''}`}
            onClick={() => handleTabChange('admissions')}
          >
            <UserCheck size={16} />
            <span>Admissions</span>
            {applicationsList.filter(a => a.status === 'pending').length > 0 ? (
              <span style={{ 
                fontSize: '11px', 
                backgroundColor: '#c59b27', 
                color: '#080e1a', 
                fontWeight: 900, 
                padding: '2px 8px', 
                borderRadius: '9999px',
                marginLeft: '4px' 
              }}>
                {applicationsList.filter(a => a.status === 'pending').length}
              </span>
            ) : (
              applicationsList.length > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}>({applicationsList.length})</span>
            )}
          </button>

          <button
            className={`ap-tab-btn ${activeTab === 'academic-years' ? 'active' : ''}`}
            onClick={() => handleTabChange('academic-years')}
          >
            <Calendar size={16} />
            <span>Years &amp; Terms</span>
            {academicYearsList.length > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}>({academicYearsList.length})</span>}
          </button>

          <button
            className={`ap-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => handleTabChange('subjects')}
          >
            <BookOpen size={16} />
            <span>Subjects</span>
            {subjectsList.length > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}>({subjectsList.length})</span>}
          </button>

          <button
            className={`ap-tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => handleTabChange('classes')}
          >
            <Layers size={16} />
            <span>Classes &amp; Streams</span>
            {classesList.length > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}>({classesList.length})</span>}
          </button>

          <button
            className={`ap-tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => handleTabChange('teachers')}
          >
            <Users size={16} />
            <span>Teachers</span>
            {teachersList.length > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}>({teachersList.length})</span>}
          </button>

          <button
            className={`ap-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => handleTabChange('students')}
          >
            <GraduationCap size={16} />
            <span>Students</span>
            {studentsList.length > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}>({studentsList.length})</span>}
          </button>

          <button
            className={`ap-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <UserPlus size={16} />
            <span>Personnel</span>
            {usersList.length > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}>({usersList.length})</span>}
          </button>
        </nav>

        {/* Top Right Actions */}
        <div className="ap-top-actions">
          <div className="ap-user-chip">
            <div className="ap-user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="ap-user-info">
              <span className="ap-user-name">{user?.name || 'Administrator'}</span>
              <span className="ap-user-role">{user?.role || 'admin'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="ap-btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            title="View Public School Website"
          >
            <Globe size={14} color="#d8b257" />
            <span>School Website</span>
          </button>

          {onSwitchToLegacy && (
            <button
              type="button"
              onClick={onSwitchToLegacy}
              className="ap-btn-legacy"
              title="Open the previous multi-role prototype backup"
            >
              <ExternalLink size={14} />
              <span>Legacy Backup</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="ap-btn-logout"
            title="Sign out of Portal"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="ap-workspace">
        {/* Dynamic Action & Search Bar */}
        <div className="ap-action-bar">
          <div className="ap-page-header">
            <h2>
              {activeTab === 'overview' && 'School Administration Overview'}
              {activeTab === 'admissions' && 'Student Admissions & Clearance Board'}
              {activeTab === 'academic-years' && 'Academic Years & School Terms'}
              {activeTab === 'subjects' && 'Curriculum & Subjects Catalog'}
              {activeTab === 'classes' && 'Academic Classes & Stream Allocations'}
              {activeTab === 'teachers' && 'Teaching Faculty Directory'}
              {activeTab === 'students' && 'Student Enrollment Registry'}
              {activeTab === 'users' && 'Staff & System Accounts'}
            </h2>
            <p>
              {activeTab === 'overview' && 'Central command center for Ndugu Academy operations.'}
              {activeTab === 'admissions' && 'Review applications, verify records, approve admissions, and issue official LCK- admission numbers.'}
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

        {/* TAB 1: OVERVIEW — NO BORDERS ON CARDS */}
        {activeTab === 'overview' && (
          <>
            {/* Stat Cards Grid */}
            <div className="ap-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              
              {/* Card 1: Academic Year & Term */}
              <div className="ap-stat-card" onClick={() => handleTabChange('academic-years')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Active Academic Year</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(197, 155, 39, 0.15)' }}>
                    <Calendar size={18} color="#d8b257" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#d8b257' }}>
                  {academicYearsList.find(y => y.isActive)?.year || 2026}
                </div>
                <div className="ap-stat-footer">
                  <span style={{ color: '#34d399', fontWeight: 800 }}>● {academicYearsList.find(y => y.isActive)?.terms?.find(t => t.isCurrent)?.name || 'Term I'} Active</span>
                  <span style={{ color: '#94a3b8' }}>&bull; Switch Term</span>
                </div>
              </div>

              {/* Card 2: Curriculum Subjects */}
              <div className="ap-stat-card" onClick={() => handleTabChange('subjects')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Curriculum Subjects</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }}>
                    <BookOpen size={18} color="#60a5fa" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#60a5fa' }}>{subjectsList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={14} color="#60a5fa" />
                  <span>O-Level &amp; A-Level Catalog</span>
                </div>
              </div>

              {/* Card 3: Classes & Streams */}
              <div className="ap-stat-card" onClick={() => handleTabChange('classes')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Classes &amp; Streams</span>
                  <div className="ap-stat-icon">
                    <Layers size={18} color="#d8b257" />
                  </div>
                </div>
                <div className="ap-stat-val">{classesList.length} Classes</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={14} color="#d8b257" />
                  <span>{classesList.reduce((acc, c) => acc + (c.streams?.length || 0), 0)} Attached Streams</span>
                </div>
              </div>

              {/* Card 4: Teachers */}
              <div className="ap-stat-card" onClick={() => handleTabChange('teachers')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Teaching Faculty</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)' }}>
                    <Users size={18} color="#34d399" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#34d399' }}>{teachersList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={14} color="#34d399" />
                  <span>Subject &amp; Stream Teachers</span>
                </div>
              </div>

              {/* Card 5: Admissions Intake */}
              <div className="ap-stat-card" onClick={() => handleTabChange('admissions')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Admissions Intake</span>
                  <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                    <UserCheck size={18} color="#f59e0b" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#d8b257' }}>{applicationsList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={14} color="#f59e0b" />
                  <span>{applicationsList.filter(a => a.status === 'pending').length} Pending Approvals</span>
                </div>
              </div>

              {/* Card 6: Enrolled Students */}
              <div className="ap-stat-card" onClick={() => handleTabChange('students')} style={{ cursor: 'pointer' }}>
                <div className="ap-stat-top">
                  <span className="ap-stat-label">Enrolled Students</span>
                  <div className="ap-stat-icon">
                    <GraduationCap size={18} color="#d8b257" />
                  </div>
                </div>
                <div className="ap-stat-val">{studentsList.length}</div>
                <div className="ap-stat-footer">
                  <ArrowUpRight size={14} color="#d8b257" />
                  <span>Active Registration Records</span>
                </div>
              </div>

              {/* Card 7: System Health */}
              <div className="ap-stat-card">
                <div className="ap-stat-top">
                  <span className="ap-stat-label">System Health</span>
                  <div className="ap-stat-icon">
                    <Activity size={18} color="#34d399" />
                  </div>
                </div>
                <div className="ap-stat-val" style={{ color: '#34d399', fontSize: '24px' }}>
                  {systemHealth.status}
                </div>
                <div className="ap-stat-footer">
                  <span className="ap-pulse-dot" style={{ width: '6px', height: '6px', backgroundColor: '#34d399' }} />
                  <span>Latency: {systemHealth.latency} ms &bull; Live Synchronization</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Staff Overview — NO CARD BORDERS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              <div className="ap-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Sparkles size={18} color="#d8b257" />
                  <span>Administrative Operations</span>
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                  Quick shortcuts to enroll students, configure classes, or provision faculty logins.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => setShowAddClassModal(true)}
                    className="ap-btn-secondary"
                    style={{ justifyContent: 'flex-start', padding: '14px', width: '100%' }}
                  >
                    <School size={18} color="#d8b257" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>Add Academic Class</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Create S1, S2, S3, S4, S5 or S6 with streams</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="ap-btn-secondary"
                    style={{ justifyContent: 'flex-start', padding: '14px', width: '100%' }}
                  >
                    <GraduationCap size={18} color="#d8b257" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>Enroll Student</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Assign student registration ID and parent contact</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="ap-btn-secondary"
                    style={{ justifyContent: 'flex-start', padding: '14px', width: '100%' }}
                  >
                    <UserPlus size={18} color="#d8b257" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>Provision Staff Account</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Create teacher or bursar login credentials</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Staff Accounts — NO CARD BORDER */}
              <div className="ap-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <Users size={18} color="#d8b257" />
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
                  <div className="ap-empty-state">
                    <Users size={32} color="#d8b257" />
                    <p>No staff accounts registered yet.</p>
                    <button onClick={() => setShowAddUserModal(true)} className="ap-btn-primary" style={{ padding: '8px 14px' }}>
                      Add First User
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {usersList.slice(0, 5).map((u) => (
                      <div
                        key={u._id || u.email}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          backgroundColor: '#0b1220',
                          borderRadius: '12px',
                          border: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(197, 155, 39, 0.12)',
                            color: '#d8b257',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px'
                          }}>
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{u.email}</div>
                          </div>
                        </div>
                        <span className="ap-badge">{u.role}</span>
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
