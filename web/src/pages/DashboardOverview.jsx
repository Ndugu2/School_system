import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Search, CalendarCheck2, Plus, TrendingUp, Users, BriefcaseBusiness, GraduationCap, BookOpen, BadgeDollarSign, Clock3, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardOverview({ setCurrentTab }) {
  const { user } = useAuth();
  const isFinanceManager = user?.role === 'bursar';
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [chartMode, setChartMode] = useState('Weekly');
  const [selectedItem, setSelectedItem] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    students: null,
    attendance: null,
    fees: null,
    classes: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadDashboardStats = async () => {
      const academicYear = new Date().getFullYear();
      const [studentsResult, classesResult, attendanceResult, feesResult] = await Promise.allSettled([
        api.get('/students'),
        api.get('/classes'),
        api.get('/attendance/analytics?term=Term 1'),
        api.get(`/fees/reports/class-summary?term=Term 1&academicYear=${academicYear}`),
      ]);

      if (!isMounted) return;

      setDashboardStats({
        students: studentsResult.status === 'fulfilled' ? studentsResult.value.length : null,
        attendance: attendanceResult.status === 'fulfilled' ? attendanceResult.value.daily.rate : null,
        fees: feesResult.status === 'fulfilled' ? feesResult.value.totalCollected : null,
        classes: classesResult.status === 'fulfilled' ? classesResult.value.length : null,
      });
    };

    loadDashboardStats();
    return () => { isMounted = false; };
  }, []);

  const formatCurrency = (amount) => amount === null ? '...' : `UGX ${Number(amount || 0).toLocaleString('en-UG')}`;
  const formatStat = (value, suffix = '') => value === null ? '...' : `${value}${suffix}`;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.trim()?.split(' ')[0] || 'there';
  const roleLabel = user?.role === 'bursar' ? 'Finance Manager' : user?.role ? user.role.replace(/-/g, ' ') : 'school team';

  const navigateTo = (tab) => {
    setShowQuickActions(false);
    setCurrentTab(tab);
  };

  const searchTargets = isFinanceManager ? [
    { label: 'Fees & Invoices', tab: 'fees', icon: BadgeDollarSign },
    { label: 'Finance & ERP', tab: 'finance', icon: TrendingUp },
    { label: 'School Messages', tab: 'messages', icon: Bell },
  ] : [
    { label: 'Students', tab: 'students', icon: Users },
    { label: 'Teachers', tab: 'teachers', icon: BriefcaseBusiness },
    { label: 'Classes & Subjects', tab: 'classes', icon: BookOpen },
    { label: 'Attendance', tab: 'attendance', icon: CalendarCheck2 },
    { label: 'Grades & Reports', tab: 'grades', icon: GraduationCap },
    { label: 'Fees & Invoices', tab: 'fees', icon: BadgeDollarSign },
  ];

  const filteredTargets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return query ? searchTargets.filter((target) => target.label.toLowerCase().includes(query)) : [];
  }, [searchTerm]);
  const overviewStats = isFinanceManager ? [
    { label: 'Fees Collected (UGX)', value: formatCurrency(dashboardStats.fees), delta: 'Term 1 total', accent: '#fbbf24', tab: 'fees' },
    { label: 'Receivables Ledger', value: 'Open ledger', delta: 'Invoices and balances', accent: '#7c8cff', tab: 'finance' },
  ] : [
    { label: 'Total Students', value: formatStat(dashboardStats.students), delta: 'Live enrollment', accent: '#7c8cff', tab: 'students' },
    { label: 'Average Attendance', value: formatStat(dashboardStats.attendance, '%'), delta: 'Today', accent: '#6ee7c8', tab: 'attendance' },
    { label: 'Fees Collected (UGX)', value: formatCurrency(dashboardStats.fees), delta: 'Term 1 total', accent: '#fbbf24', tab: 'fees' },
    { label: 'Classes Today', value: formatStat(dashboardStats.classes), delta: 'configured classes', accent: '#5bc0ff', tab: 'classes' },
  ];

  const attendanceData = [
    { label: 'Aug', value: 92 },
    { label: 'Sep', value: 93 },
    { label: 'Oct', value: 95 },
    { label: 'Nov', value: 94 },
    { label: 'Dec', value: 96 },
  ];
  const displayedAttendance = chartMode === 'Weekly'
    ? attendanceData
    : attendanceData.map((item, index) => ({ ...item, value: item.value + (index % 2 === 0 ? 1 : -1) }));

  const feesData = [
    { label: 'Aug', value: 32 },
    { label: 'Sep', value: 45 },
    { label: 'Oct', value: 39 },
    { label: 'Nov', value: 52 },
    { label: 'Dec', value: 48 },
  ];

  const schedule = [
    { time: '08:30-09:30', className: '9A', subject: 'Mathematics', teacher: 'Mr. Okello', status: 'Ongoing' },
    { time: '09:30-10:30', className: '8B', subject: 'Biology', teacher: 'Mrs. Achieng', status: 'Upcoming' },
  ];

  const activity = [
    { text: 'Sarah J. profile was updated to new student registration.', time: '3 hours ago', tag: 'profile' },
    { text: 'School fees invoice was approved and sent to parents.', time: '1 day ago', tag: 'invoice' },
  ];

  return (
    <div className="dashboard-shell" style={styles.dashboardShell}>
      <div className="dashboard-top-bar" style={styles.topBar}>
        <div className="dashboard-search-wrap" style={styles.searchWrap}>
          <div style={styles.searchBox}>
            <Search size={18} color="#9aa7bd" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search modules" aria-label="Search dashboard modules" style={styles.searchInput} />
          </div>
          {filteredTargets.length > 0 && <div style={styles.searchResults}>
            {filteredTargets.map((target) => {
              const Icon = target.icon;
              return <button key={target.tab} style={styles.searchResult} onClick={() => navigateTo(target.tab)}><Icon size={15} />{target.label}</button>;
            })}
          </div>}
        </div>
        <div className="dashboard-top-actions" style={styles.topActions}>
          <div style={styles.quickActionWrap}>
            <button style={styles.iconBtn} onClick={() => setShowQuickActions((visible) => !visible)} aria-label="Open quick actions"><Plus size={18} /></button>
            {showQuickActions && <div style={styles.quickActions}>
              {isFinanceManager && <button onClick={() => navigateTo('finance')}>Open finance ledger</button>}
              {!isFinanceManager && <>
                <button onClick={() => navigateTo('students')}>Add student</button>
                <button onClick={() => navigateTo('attendance')}>Take attendance</button>
              </>}
              <button onClick={() => navigateTo('fees')}>Record payment</button>
            </div>}
          </div>
          <button style={styles.iconBtn} onClick={() => navigateTo('notifications')} aria-label="Open notifications"><Bell size={18} /></button>
          <div className="dashboard-user-chip" style={styles.userChip}>
            <div style={styles.avatar}>{user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}</div>
            <div style={styles.userMeta}>
                <span style={styles.userName}>{user?.name || 'User'}</span>
                <span style={styles.userRole}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="dashboard-welcome" style={styles.welcomeBanner}>
        <div style={styles.welcomeCopy}>
          <span style={styles.welcomeEyebrow}>Ndugu Academy · {new Date().toLocaleDateString('en-UG', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <h1 style={styles.welcomeTitle}>{greeting}, {firstName}</h1>
          <p style={styles.welcomeText}>Here&apos;s your school overview for today. Keep the {roleLabel} workspace moving with the latest activity below.</p>
        </div>
        <div style={styles.welcomeMark} aria-hidden="true"><GraduationCap size={30} /></div>
      </section>

      <div className="dashboard-stats-grid" style={styles.statsGrid}>
        {overviewStats.map((card) => (
          <button key={card.label} style={styles.statCard} onClick={() => navigateTo(card.tab)}>
            <div style={styles.statTitle}>{card.label}</div>
            <div style={styles.statValue}>{card.value}</div>
            <div style={styles.statDeltaRow}>
              <span style={{ ...styles.deltaBadge, background: `${card.accent}22`, color: card.accent }}>
                {card.delta}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="dashboard-content-grid" style={{ ...styles.contentGrid, display: isFinanceManager ? 'none' : undefined }}>
        <div className="dashboard-panel" style={styles.panel}>
          <div className="dashboard-panel-header" style={styles.panelHeader}>
            <div style={styles.panelTitleRow}>
              <div style={styles.panelTitleIcon}><TrendingUp size={16} /></div>
              <span style={styles.panelTitle}>Attendance Overview</span>
            </div>
            <button style={styles.filterBtn} onClick={() => setChartMode((mode) => mode === 'Weekly' ? 'Monthly' : 'Weekly')}>{chartMode}</button>
          </div>

          <div style={styles.chartArea}>
            <div style={styles.chartGrid}>
              {[90, 92, 94, 96, 98].map((y) => (
                <div key={y} style={{ ...styles.chartLine, bottom: `${(y - 90) / 10 * 100}%` }} />
              ))}
            </div>
            <div style={styles.lineChartWrap}>
              <svg viewBox="0 0 420 180" preserveAspectRatio="none" style={styles.lineChart}>
                <path d="M 0 120 C 60 110, 90 100, 130 70 S 220 80, 260 60 S 340 50, 420 35" fill="none" stroke="#67e8d4" strokeWidth="3" strokeLinecap="round" />
                <circle cx="130" cy="70" r="5" fill="#67e8d4" />
                <circle cx="260" cy="60" r="5" fill="#67e8d4" />
                <circle cx="420" cy="35" r="5" fill="#67e8d4" />
              </svg>
            </div>
            <div style={styles.axisRow}>
              {displayedAttendance.map((item) => (
                <div key={item.label} style={styles.axisItem}>{item.label}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-panel" style={styles.panel}>
          <div className="dashboard-panel-header" style={styles.panelHeader}>
            <div style={styles.panelTitleRow}>
              <div style={styles.panelTitleIcon}><BadgeDollarSign size={16} /></div>
              <span style={styles.panelTitle}>Fees Collected (UGX)</span>
            </div>
            <button style={styles.moreBtn} onClick={() => navigateTo('fees')} aria-label="Open fees and invoices">•••</button>
          </div>

          <div style={styles.barChartWrap}>
            {feesData.map((item) => (
              <div key={item.label} style={styles.barGroup}>
                <div style={{ height: `${item.value}%`, ...styles.bar, background: item.value > 48 ? '#67e8d4' : '#c59b27' }} />
                <span style={styles.barMonth}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-grid" style={{ ...styles.bottomGrid, display: isFinanceManager ? 'none' : undefined }}>
        <div className="dashboard-panel" style={styles.panel}>
          <div className="dashboard-panel-header" style={styles.panelHeader}>
            <div style={styles.panelTitleRow}>
              <div style={styles.panelTitleIcon}><CalendarCheck2 size={16} /></div>
              <span style={styles.panelTitle}>Today&apos;s Class Schedule</span>
            </div>
            <button style={styles.moreBtn} onClick={() => navigateTo('operations')} aria-label="Open operations and events">•••</button>
          </div>

          <div className="dashboard-table-wrap" style={styles.tableWrap}>
            <div className="dashboard-table-head" style={styles.tableHead}>
              <span>Time</span>
              <span>Class</span>
              <span>Subject</span>
              <span>Teacher</span>
              <span>Status</span>
            </div>
            {schedule.map((row) => (
              <button key={`${row.time}-${row.className}`} className="dashboard-table-row" style={styles.tableRow} onClick={() => setSelectedItem({ type: 'Class schedule', title: `${row.className} ${row.subject}`, details: `${row.time} with ${row.teacher}`, action: 'Open timetable', tab: 'operations' })}>
                <span data-label="Time">{row.time}</span>
                <span data-label="Class">{row.className}</span>
                <span data-label="Subject">{row.subject}</span>
                <span data-label="Teacher">{row.teacher}</span>
                <span data-label="Status">
                  <span style={{ ...styles.statusPill, background: row.status === 'Ongoing' ? '#1d4f66' : '#f7d66f22', color: row.status === 'Ongoing' ? '#6ee7c8' : '#f6c863' }}>
                    {row.status}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-panel" style={styles.panel}>
          <div className="dashboard-panel-header" style={styles.panelHeader}>
            <div style={styles.panelTitleRow}>
              <div style={styles.panelTitleIcon}><Clock3 size={16} /></div>
              <span style={styles.panelTitle}>Recent Activity</span>
            </div>
            <button style={styles.moreBtn} onClick={() => navigateTo('notifications')} aria-label="Open recent notifications">•••</button>
          </div>

          <div style={styles.activityList}>
            {activity.map((item, index) => (
              <button key={item.text} style={styles.activityItem} onClick={() => setSelectedItem({ type: 'Recent activity', title: item.text, details: item.time, action: 'Open notifications', tab: 'notifications' })}>
                <div style={styles.activityBullet} />
                <div style={styles.activityBody}>
                  <div style={styles.activityText}>{item.text}</div>
                  <div style={styles.activityMeta}>{item.time}</div>
                </div>
                {index === 0 ? <div style={styles.helpBadge}><ArrowUpRight size={14} /></div> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFinanceManager && <div className="dashboard-panel" style={styles.financeFocusPanel}>
        <div style={styles.panelTitleRow}><div style={styles.panelTitleIcon}><BadgeDollarSign size={16} /></div><span style={styles.panelTitle}>Finance Manager workspace</span></div>
        <p style={styles.financeFocusText}>Review collections, post receipts, manage fee invoices, and keep the school ledger reconciled.</p>
        <div style={styles.financeActionRow}>
          <button style={styles.financeAction} onClick={() => navigateTo('fees')}><BadgeDollarSign size={17} /> Fees &amp; invoices <ArrowUpRight size={14} /></button>
          <button style={styles.financeAction} onClick={() => navigateTo('finance')}><TrendingUp size={17} /> Finance &amp; ERP <ArrowUpRight size={14} /></button>
        </div>
      </div>}

      {selectedItem && (
        <div style={styles.modalBackdrop} role="presentation" onClick={() => setSelectedItem(null)}>
          <div style={styles.detailModal} role="dialog" aria-modal="true" aria-label={selectedItem.type} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalEyebrow}>{selectedItem.type}</div>
                <h3 style={styles.modalTitle}>{selectedItem.title}</h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedItem(null)} aria-label="Close details">×</button>
            </div>
            <p style={styles.modalDetails}>{selectedItem.details}</p>
            <button style={styles.modalAction} onClick={() => navigateTo(selectedItem.tab)}>{selectedItem.action}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  dashboardShell: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    color: '#edf4ff',
  },
  searchWrap: {
    position: 'relative',
    width: 'min(320px, 100%)',
    maxWidth: '40%',
    minWidth: 0,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    background: '#1b2335',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    borderRadius: '14px',
    padding: '12px 18px',
  },
  welcomeBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '24px 28px',
    borderRadius: '16px',
    background: 'linear-gradient(115deg, #211052 0%, #3f1c85 55%, #155e75 100%)',
    border: '1px solid rgba(167, 139, 250, 0.35)',
    boxShadow: '0 14px 30px rgba(48, 28, 104, 0.22)',
  },
  welcomeCopy: {
    minWidth: 0,
  },
  welcomeEyebrow: {
    display: 'block',
    color: '#c4b5fd',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: '28px',
    lineHeight: 1.15,
    fontWeight: 800,
    marginBottom: '7px',
  },
  welcomeText: {
    color: '#ddd6fe',
    fontSize: '13px',
    maxWidth: '620px',
  },
  welcomeMark: {
    width: '58px',
    height: '58px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fef3c7',
    background: 'rgba(255, 255, 255, 0.13)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    background: 'rgba(148, 163, 184, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#a7b0c8',
  },
  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#edf4ff',
    fontSize: '14px',
  },
  searchResults: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '6px',
    background: '#202b40',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '10px',
    boxShadow: '0 14px 30px rgba(0, 0, 0, 0.25)',
  },
  searchResult: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 10px',
    border: 'none',
    borderRadius: '7px',
    background: 'transparent',
    color: '#edf4ff',
    textAlign: 'left',
    cursor: 'pointer',
  },
  quickActionWrap: {
    position: 'relative',
  },
  quickActions: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '150px',
    padding: '6px',
    background: '#202b40',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '10px',
    boxShadow: '0 14px 30px rgba(0, 0, 0, 0.25)',
  },
  searchText: {
    fontSize: '14px',
    color: '#a7b0c8',
  },
  topActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    background: 'rgba(148, 163, 184, 0.08)',
    color: '#edf4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 10px 6px 6px',
    borderRadius: '12px',
    background: 'rgba(148, 163, 184, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f9a8d4, #7dd3fc)',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '12px',
  },
  userMeta: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
  },
  userName: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#edf4ff',
  },
  userRole: {
    fontSize: '10px',
    color: '#99a3b9',
    textTransform: 'uppercase',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '16px',
  },
  statCard: {
    background: '#1a2335',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '14px',
    padding: '18px 16px',
    minHeight: '110px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
    borderStyle: 'solid',
    textAlign: 'left',
    cursor: 'pointer',
  },
  statTitle: {
    fontSize: '14px',
    color: '#a7b0c8',
    fontWeight: 600,
  },
  statValue: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#f3f6ff',
    lineHeight: 1.2,
  },
  statDeltaRow: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  deltaBadge: {
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '999px',
    padding: '6px 8px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '18px',
  },
  panel: {
    background: '#1a2335',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '16px',
    padding: '18px 18px 14px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
  },
  panelTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  panelTitleIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(104, 101, 255, 0.12)',
    color: '#8bb8ff',
  },
  panelTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#f3f6ff',
  },
  filterBtn: {
    background: 'rgba(148, 163, 184, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    color: '#c1c9dc',
    borderRadius: '10px',
    padding: '7px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  chartArea: {
    position: 'relative',
    height: '220px',
    paddingTop: '8px',
  },
  chartGrid: {
    position: 'absolute',
    inset: '0 0 24px 0',
    backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)',
    backgroundSize: '100% 25%',
    borderRadius: '12px',
  },
  chartLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTop: '1px solid rgba(148,163,184,0.08)',
  },
  lineChartWrap: {
    position: 'relative',
    height: '180px',
    width: '100%',
    zIndex: 1,
  },
  lineChart: {
    width: '100%',
    height: '100%',
  },
  axisRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    fontSize: '12px',
    color: '#95a2bb',
    marginTop: '4px',
  },
  axisItem: {
    textAlign: 'center',
  },
  moreBtn: {
    border: 'none',
    background: 'transparent',
    color: '#b5c0d8',
    fontSize: '20px',
    cursor: 'pointer',
  },
  barChartWrap: {
    height: '220px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '14px',
    padding: '12px 0 0',
  },
  barGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    height: '100%',
  },
  bar: {
    width: '100%',
    maxWidth: '42px',
    borderRadius: '8px 8px 0 0',
    boxShadow: '0 10px 20px rgba(103, 232, 212, 0.12)',
    minHeight: '20px',
  },
  barMonth: {
    fontSize: '11px',
    color: '#9aa7bd',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '18px',
  },
  financeFocusPanel: {
    background: '#1a2335',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '14px',
    padding: '22px',
  },
  financeFocusText: {
    color: '#a7b0c8',
    fontSize: '13px',
    margin: '12px 0 18px',
    maxWidth: '620px',
  },
  financeActionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  financeAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    borderRadius: '9px',
    padding: '10px 13px',
    background: 'rgba(99, 102, 241, 0.16)',
    color: '#edf4ff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
  },
  tableWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.8fr 1fr 1.1fr 0.8fr',
    fontSize: '12px',
    fontWeight: 700,
    color: '#9aa7bd',
    padding: '0 4px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.8fr 1fr 1.1fr 0.8fr',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#f2f5fd',
    padding: '12px 4px',
    borderTop: '1px solid rgba(148,163,184,0.12)',
    width: '100%',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '84px',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: 700,
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '8px 0',
    borderLeft: '2px solid rgba(148,163,184,0.15)',
    paddingLeft: '12px',
    width: '100%',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderRadius: 0,
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
  },
  activityBullet: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#7dd3fc',
    marginTop: '7px',
  },
  activityBody: {
    flex: 1,
  },
  activityText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#edf4ff',
  },
  activityMeta: {
    fontSize: '11px',
    color: '#9aa7bd',
    marginTop: '4px',
  },
  helpBadge: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#e2e8f0',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '2px',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'rgba(5, 9, 18, 0.68)',
  },
  detailModal: {
    width: 'min(420px, 100%)',
    padding: '22px',
    background: '#202b40',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    borderRadius: '14px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.38)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  modalEyebrow: {
    color: '#8bb8ff',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  modalTitle: {
    margin: '6px 0 0',
    color: '#f3f6ff',
    fontSize: '18px',
  },
  modalDetails: {
    margin: '18px 0',
    color: '#c1c9dc',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  closeBtn: {
    width: '30px',
    height: '30px',
    border: 'none',
    borderRadius: '50%',
    background: 'rgba(148, 163, 184, 0.12)',
    color: '#edf4ff',
    fontSize: '22px',
    cursor: 'pointer',
  },
  modalAction: {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 14px',
    background: '#67e8d4',
    color: '#102532',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

