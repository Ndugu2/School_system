import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, GraduationCap, School, CreditCard, Bell, TrendingUp, AlertTriangle } from 'lucide-react';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    students: 124,
    teachers: 18,
    classes: 8,
    revenue: '42,500,000'
  });
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Term II Examinations Schedule', content: 'End of Term II examinations will commence on August 15th, 2026. Please ensure all school fees balance is cleared before sitting for exams.', date: '2026-06-12' },
    { id: 2, title: 'Parent-Teacher Consultative Meeting', content: 'There will be a mandatory PTA meeting on Sunday, June 28th, 2026 starting at 10:00 AM at the Main School Hall to discuss the new curriculum assessments.', date: '2026-06-08' }
  ]);
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const students = await api.get('/students');
        const teachers = await api.get('/teachers');
        const classes = await api.get('/classes');
        
        setStats({
          students: students.length || 124,
          teachers: teachers.length || 18,
          classes: classes.length || 8,
          revenue: '42,500,000'
        });
      } catch (err) {
        console.log('Using mock dashboard statistics');
      }

      try {
        const watchlistData = await api.get('/analytics/watchlist');
        setWatchlist(watchlistData);
      } catch (err) {
        console.log('Could not fetch watchlist');
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Enrolled Learners', value: stats.students, icon: Users, color: '#4f46e5', bg: '#e0e7ff' },
    { label: 'Total Instructors / Staff', value: stats.teachers, icon: GraduationCap, color: '#10b981', bg: '#d1fae5' },
    { label: 'Academic Classes', value: stats.classes, icon: School, color: '#fbbf24', bg: '#fef3c7' },
    { label: 'Total Fees Collected (UGX)', value: stats.revenue, icon: CreditCard, color: '#ec4899', bg: '#fce7f3' },
  ];

  return (
    <div style={styles.container}>
      {/* Welcome Banner */}
      <div style={styles.welcomeBanner}>
        <div style={styles.welcomeLeft}>
          <h1 style={styles.welcomeTitle}>Ndugu Academy Management Dashboard</h1>
          <p style={styles.welcomeSubtitle}>Term II, Academic Year 2026 • Kampala, Uganda</p>
        </div>
        <div style={styles.termBadge}>
          <span>Term II Active</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} style={styles.statCard}>
              <div style={styles.statInfo}>
                <span style={styles.statLabel}>{card.label}</span>
                <span style={styles.statValue}>{card.value}</span>
              </div>
              <div style={{ ...styles.statIconWrapper, backgroundColor: card.bg }}>
                <Icon size={24} style={{ color: card.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div style={styles.mainGrid}>
        {/* Notice Board */}
        <div style={styles.noticeBoard}>
          <div style={styles.panelHeader}>
            <Bell size={20} color="var(--primary)" />
            <h3 style={styles.panelTitle}>Notice Board & Announcements</h3>
          </div>
          <div style={styles.announcementsList}>
            {announcements.map((ann) => (
              <div key={ann.id} style={styles.announcementCard}>
                <div style={styles.announcementHeader}>
                  <h4 style={styles.announcementTitle}>{ann.title}</h4>
                  <span style={styles.announcementDate}>{ann.date}</span>
                </div>
                <p style={styles.announcementContent}>{ann.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance & Academic Highlights */}
        <div style={styles.highlightsCard}>
          <div style={styles.panelHeader}>
            <TrendingUp size={20} color="var(--success)" />
            <h3 style={styles.panelTitle}>School Performance Summary</h3>
          </div>
          <div style={styles.performanceContent}>
            <div style={styles.metricItem}>
              <span style={styles.metricName}>Average Term Attendance</span>
              <span style={styles.metricValue}>94.2%</span>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: '94.2%', backgroundColor: 'var(--success)' }} />
              </div>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricName}>PLE Distinction Rate (P7)</span>
              <span style={styles.metricValue}>85.0%</span>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: '85%', backgroundColor: 'var(--primary)' }} />
              </div>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricName}>UCE Division 1 Rate (S4)</span>
              <span style={styles.metricValue}>78.5%</span>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: '78.5%', backgroundColor: 'var(--accent)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Analytics Watchlist */}
      <div style={styles.noticeBoard}>
        <div style={styles.panelHeader}>
          <AlertTriangle size={20} color="#ef4444" />
          <h3 style={styles.panelTitle}>Early-Warning Watchlist (At-Risk Students)</h3>
        </div>
        {watchlist.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>No students currently flagged as at-risk.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {watchlist.map(risk => (
              <div key={risk._id} style={{ padding: '16px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{risk.student?.user?.name || 'Unknown Student'}</strong>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: risk.riskCategory === 'critical' ? '#dc2626' : '#ea580c', textTransform: 'uppercase' }}>
                    {risk.riskCategory} RISK
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                  <p>Attendance Drop: {risk.factors.attendanceDrop.toFixed(1)}%</p>
                  <p>Low Quiz Scores: {risk.factors.lowQuizScores}</p>
                  <p>Missing Assignments: {risk.factors.missingAssignments}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  welcomeBanner: {
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
    borderRadius: 'var(--radius-md)',
    padding: '32px',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-md)',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '14px',
    opacity: 0.85,
  },
  termBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
  },
  statCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    transition: 'var(--transition)',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: 'var(--shadow-md)',
    }
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  statIconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '24px',
    '@media (max-width: 1000px)': {
      gridTemplateColumns: '1fr',
    }
  },
  noticeBoard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  announcementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  announcementCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px',
  },
  announcementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  announcementTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  announcementDate: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  announcementContent: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  highlightsCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  performanceContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metricName: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
  }
};
