import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Search, CalendarCheck2, Plus, TrendingUp, Users, BriefcaseBusiness, GraduationCap, BookOpen, BadgeDollarSign, Clock3, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardOverview({ setCurrentTab }) {
  const { user } = useAuth();
  const isFinanceManager = user?.role === 'bursar';
  const canViewFinance = ['super-admin', 'admin', 'headteacher', 'bursar'].includes(user?.role);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState([]);
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
      const financeSummaryUrl = `/finance/reports/summary?term=Term 1&academicYear=${academicYear}`;
      const results = await Promise.allSettled([
        api.get('/students'),
        api.get('/classes'),
        api.get('/attendance/analytics?term=Term 1'),
        canViewFinance ? api.get(financeSummaryUrl) : Promise.resolve(null),
      ]);

      if (!isMounted) return;

      const [studentsResult, classesResult, attendanceResult, financeResult] = results;
      const attendance = attendanceResult.status === 'fulfilled' ? attendanceResult.value : null;
      const finance = financeResult.status === 'fulfilled' ? financeResult.value : null;

      setAttendanceSummary(attendance);
      setRevenueBreakdown(Array.isArray(finance?.revenue?.breakdown) ? finance.revenue.breakdown : []);
      setDashboardStats({
        students: studentsResult.status === 'fulfilled' && Array.isArray(studentsResult.value) ? studentsResult.value.length : null,
        attendance: attendance?.daily?.total > 0 && Number.isFinite(attendance.daily.rate) ? attendance.daily.rate : null,
        fees: Number.isFinite(finance?.revenue?.totalRevenue) ? finance.revenue.totalRevenue : null,
        classes: classesResult.status === 'fulfilled' && Array.isArray(classesResult.value) ? classesResult.value.length : null,
      });
    };

    loadDashboardStats();
    return () => { isMounted = false; };
  }, [canViewFinance, user?.role]);

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
    { label: "Today's Attendance", value: formatStat(dashboardStats.attendance, '%'), delta: 'Daily rate', accent: '#6ee7c8', tab: 'attendance' },
    ...(canViewFinance ? [{ label: 'Fees Collected (UGX)', value: formatCurrency(dashboardStats.fees), delta: 'Term 1 total', accent: '#fbbf24', tab: 'fees' }] : []),
    { label: 'Configured Classes', value: formatStat(dashboardStats.classes), delta: 'School-wide', accent: '#5bc0ff', tab: 'classes' },
  ];

  const attendanceData = [
    { label: 'Daily', value: attendanceSummary?.daily },
    { label: 'Weekly', value: attendanceSummary?.weekly },
    { label: 'Monthly', value: attendanceSummary?.monthly },
    { label: 'Term', value: attendanceSummary?.term },
  ]
    .filter(item => item.value?.total > 0 && Number.isFinite(item.value.rate))
    .map(item => ({ label: item.label, value: item.value.rate }));
  const maximumRevenue = Math.max(0, ...revenueBreakdown.map(item => Number(item.paidAmount) || 0));
  const feesData = revenueBreakdown.map(item => ({
    label: item._id,
    value: Number(item.paidAmount) || 0,
    height: maximumRevenue ? ((Number(item.paidAmount) || 0) / maximumRevenue) * 100 : 0,
  }));

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
          <div className="dashboard-search-box" style={styles.searchBox}>
            <Search size={18} color="#9aa7bd" />
            <input className="dashboard-search-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search modules" aria-label="Search dashboard modules" style={styles.searchInput} />
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
        </div>
      </div>

      <section className="dashboard-welcome" style={styles.welcomeBanner}>
        <div style={styles.welcomeCopy}>
          <span className="dashboard-welcome-eyebrow" style={styles.welcomeEyebrow}>Ndugu Academy · {new Date().toLocaleDateString('en-UG', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <h1 className="dashboard-welcome-title" style={styles.welcomeTitle}>{greeting}, {firstName}</h1>
          <p className="dashboard-welcome-text" style={styles.welcomeText}>Here&apos;s your school overview for today. Keep the {roleLabel} workspace moving with the latest activity below.</p>
        </div>
        <div style={styles.welcomeMark} aria-hidden="true"><GraduationCap size={30} /></div>
      </section>

      <div className="dashboard-stats-grid" style={styles.statsGrid}>
        {overviewStats.map((card) => (
          <button key={card.label} className="dashboard-stat-card" style={styles.statCard} onClick={() => navigateTo(card.tab)}>
            <div className="dashboard-stat-title" style={styles.statTitle}>{card.label}</div>
            <div className="dashboard-stat-value" style={styles.statValue}>{card.value}</div>
            <div style={styles.statDeltaRow}>
              <span style={{ ...styles.deltaBadge, background: `${card.accent}22`, color: card.accent }}>
                {card.delta}
              </span>
            </div>
          </button>
        ))}
      </div>
      <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
        KPI cards and attendance/fee charts use API data. Schedule and recent-activity panels below are illustrative preview data.
      </p>

      <div className="dashboard-content-grid" style={{ ...styles.contentGrid, display: isFinanceManager ? 'none' : undefined }}>
        <div className="dashboard-panel" style={styles.panel}>
          <div className="dashboard-panel-header" style={styles.panelHeader}>
            <div style={styles.panelTitleRow}>
              <div className="dashboard-panel-icon" style={styles.panelTitleIcon}><TrendingUp size={16} /></div>
              <span className="dashboard-panel-title" style={styles.panelTitle}>Attendance Rate by Period</span>
            </div>
          </div>

          <div style={styles.barChartWrap}>
            {attendanceData.length ? attendanceData.map((item) => (
              <div key={item.label} style={styles.barGroup}>
                <span className="dashboard-bar-value" style={styles.barValue}>{item.value}%</span>
                <div style={{ height: `${item.value}%`, ...styles.bar, background: '#67e8d4' }} />
                <span className="dashboard-bar-label" style={styles.barMonth}>{item.label}</span>
              </div>
            )) : (
              <p style={styles.chartEmpty}>Attendance analytics are unavailable for this account.</p>
            )}
          </div>
        </div>

        <div className="dashboard-panel" style={styles.panel}>
          <div className="dashboard-panel-header" style={styles.panelHeader}>
            <div style={styles.panelTitleRow}>
              <div className="dashboard-panel-icon" style={styles.panelTitleIcon}><BadgeDollarSign size={16} /></div>
              <span className="dashboard-panel-title" style={styles.panelTitle}>Collected by Invoice Status</span>
            </div>
            <button style={styles.moreBtn} onClick={() => navigateTo('fees')} aria-label="Open fees and invoices">•••</button>
          </div>

          <div style={styles.barChartWrap}>
            {feesData.length ? feesData.map((item) => (
              <div key={item.label} style={styles.barGroup}>
                <span className="dashboard-bar-value" style={styles.barValue}>{formatCurrency(item.value)}</span>
                <div style={{ height: `${item.height}%`, ...styles.bar, background: '#facc15', minHeight: item.value > 0 ? '3px' : 0 }} />
                <span className="dashboard-bar-label" style={styles.barMonth}>{item.label}</span>
              </div>
            )) : (
              <p style={styles.chartEmpty}>Finance summary is unavailable for this account.</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-grid" style={{ ...styles.bottomGrid, display: isFinanceManager ? 'none' : undefined }}>
        <div className="dashboard-panel" style={styles.panel}>
          <div className="dashboard-panel-header" style={styles.panelHeader}>
            <div style={styles.panelTitleRow}>
              <div className="dashboard-panel-icon" style={styles.panelTitleIcon}><CalendarCheck2 size={16} /></div>
              <span className="dashboard-panel-title" style={styles.panelTitle}>Today&apos;s Class Schedule (sample)</span>
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
              <div className="dashboard-panel-icon" style={styles.panelTitleIcon}><Clock3 size={16} /></div>
              <span className="dashboard-panel-title" style={styles.panelTitle}>Recent Activity (sample)</span>
            </div>
            <button style={styles.moreBtn} onClick={() => navigateTo('notifications')} aria-label="Open recent notifications">•••</button>
          </div>

          <div style={styles.activityList}>
            {activity.map((item, index) => (
              <button key={item.text} style={styles.activityItem} onClick={() => setSelectedItem({ type: 'Recent activity', title: item.text, details: item.time, action: 'Open notifications', tab: 'notifications' })}>
                <div style={styles.activityBullet} />
                <div style={styles.activityBody}>
                  <div className="dashboard-activity-text" style={styles.activityText}>{item.text}</div>
                  <div className="dashboard-activity-meta" style={styles.activityMeta}>{item.time}</div>
                </div>
                {index === 0 ? <div style={styles.helpBadge}><ArrowUpRight size={14} /></div> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFinanceManager && <div className="dashboard-panel finance-focus-panel" style={styles.financeFocusPanel}>
        <div style={styles.panelTitleRow}><div className="dashboard-panel-icon" style={styles.panelTitleIcon}><BadgeDollarSign size={16} /></div><span className="dashboard-panel-title" style={styles.panelTitle}>Finance Manager workspace</span></div>
        <p style={styles.financeFocusText}>Review collections, post receipts, manage fee invoices, and keep the school ledger reconciled.</p>
        <div style={styles.financeActionRow}>
          <button style={styles.financeAction} onClick={() => navigateTo('fees')}><BadgeDollarSign size={17} /> Fees &amp; invoices <ArrowUpRight size={14} /></button>
          <button style={styles.financeAction} onClick={() => navigateTo('finance')}><TrendingUp size={17} /> Finance &amp; ERP <ArrowUpRight size={14} /></button>
        </div>
      </div>}

      {selectedItem && (
        <div style={styles.modalBackdrop} role="presentation" onClick={() => setSelectedItem(null)}>
          <div className="dashboard-detail-modal" style={styles.detailModal} role="dialog" aria-modal="true" aria-label={selectedItem.type} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div className="dashboard-modal-eyebrow" style={styles.modalEyebrow}>{selectedItem.type}</div>
                <h3 className="dashboard-modal-title" style={styles.modalTitle}>{selectedItem.title}</h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedItem(null)} aria-label="Close details">×</button>
            </div>
            <p className="dashboard-modal-details" style={styles.modalDetails}>{selectedItem.details}</p>
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
    color: '#1f2937',
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  welcomeBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '26px 30px',
    borderRadius: '14px',
    background: 'linear-gradient(115deg, #eef2ff 0%, #eff6ff 100%)',
    border: '1px solid #dbeafe',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  welcomeCopy: {
    minWidth: 0,
  },
  welcomeEyebrow: {
    display: 'block',
    color: '#4f46e5',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  welcomeTitle: {
    color: '#172554',
    fontSize: '28px',
    lineHeight: 1.15,
    fontWeight: 800,
    marginBottom: '7px',
  },
  welcomeText: {
    color: '#475569',
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
    color: '#4f46e5',
    background: '#ffffff',
    border: '1px solid #dbeafe',
    borderRadius: '14px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    background: '#ffffff',
    border: '1px solid #dbe2ea',
    borderRadius: '9px',
    padding: '10px 12px',
    color: '#64748b',
  },
  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#1f2937',
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)',
  },
  searchResult: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 10px',
    border: 'none',
    borderRadius: '7px',
    background: 'transparent',
    color: '#334155',
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)',
  },
  searchText: {
    fontSize: '14px',
    color: '#64748b',
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
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#475569',
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
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
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
    color: '#1f2937',
  },
  userRole: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '16px',
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px 16px',
    minHeight: '110px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    borderStyle: 'solid',
    textAlign: 'left',
    cursor: 'pointer',
  },
  statTitle: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 600,
  },
  statValue: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#111827',
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
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
    background: '#eef2ff',
    color: '#4f46e5',
  },
  panelTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1f2937',
  },
  moreBtn: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
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
    overflowX: 'auto',
  },
  barGroup: {
    flex: 1,
    minWidth: '58px',
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
    textAlign: 'center',
  },
  barValue: {
    fontSize: '10px',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
  },
  chartEmpty: {
    alignSelf: 'center',
    color: '#9aa7bd',
    fontSize: '13px',
    textAlign: 'center',
    width: '100%',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '18px',
  },
  financeFocusPanel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '22px',
  },
  financeFocusText: {
    color: '#64748b',
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
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
    padding: '10px 13px',
    background: '#eef2ff',
    color: '#4338ca',
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
    color: '#64748b',
    padding: '0 4px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.8fr 1fr 1.1fr 0.8fr',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#334155',
    padding: '12px 4px',
    borderTop: '1px solid #e2e8f0',
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
    borderLeft: '2px solid #e2e8f0',
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
    background: '#6366f1',
    marginTop: '7px',
  },
  activityBody: {
    flex: 1,
  },
  activityText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#334155',
  },
  activityMeta: {
    fontSize: '11px',
    color: '#64748b',
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  modalEyebrow: {
    color: '#4f46e5',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  modalTitle: {
    margin: '6px 0 0',
    color: '#111827',
    fontSize: '18px',
  },
  modalDetails: {
    margin: '18px 0',
    color: '#475569',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  closeBtn: {
    width: '30px',
    height: '30px',
    border: 'none',
    borderRadius: '50%',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: '22px',
    cursor: 'pointer',
  },
  modalAction: {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 14px',
    background: '#4f46e5',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
