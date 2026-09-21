import React, { useEffect, useState } from 'react';
import { AlertTriangle, Mail, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { analyticsApi } from '../services/api';

const categoryColors = {
  critical: '#b91c1c',
  high: '#c2410c',
  medium: '#a16207',
  low: '#15803d',
};

export default function Analytics() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadWatchlist = async () => {
    setLoading(true);
    setError('');
    try {
      setWatchlist(await analyticsApi.getWatchlist());
    } catch (requestError) {
      setError(requestError.message || 'Unable to load the risk watchlist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const calculateRisk = async () => {
    setCalculating(true);
    setMessage('');
    setError('');
    try {
      const result = await analyticsApi.calculateRisk();
      setMessage(`${result.updated} student profiles recalculated${result.critical ? `; ${result.critical} critical` : ''}.`);
      await loadWatchlist();
    } catch (requestError) {
      setError(requestError.message || 'Risk calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const sendAlert = async (studentId) => {
    setMessage('');
    setError('');
    try {
      const result = await analyticsApi.sendRiskEmail(studentId);
      setMessage(result.message || 'Risk alert sent.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to send the risk alert.');
    }
  };

  const criticalCount = watchlist.filter(profile => profile.riskCategory === 'critical').length;
  const highCount = watchlist.filter(profile => profile.riskCategory === 'high').length;
  const averageRisk = watchlist.length
    ? Math.round(watchlist.reduce((total, profile) => total + (profile.riskScore || 0), 0) / watchlist.length)
    : 0;

  return (
    <div className="analytics-page" style={styles.page}>
      <section className="analytics-hero" style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Student success</p>
          <h1 className="analytics-title" style={styles.title}>Risk watchlist</h1>
          <p style={styles.subtitle}>Use attendance, assessment, and assignment signals to focus support where it matters most.</p>
        </div>
        <button className="analytics-primary-button" style={styles.primaryButton} onClick={calculateRisk} disabled={calculating}>
          <RefreshCw size={16} style={calculating ? styles.spin : undefined} />
          {calculating ? 'Calculating...' : 'Recalculate risk'}
        </button>
      </section>

      {message && <div style={styles.message}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <section className="analytics-stats-grid" style={styles.statsGrid}>
        <div style={styles.stat}><AlertTriangle size={20} color="#b91c1c" /><span style={styles.statContent}><small style={styles.statLabel}>Students flagged</small><strong className="analytics-stat-value" style={styles.statValue}>{watchlist.length}</strong></span></div>
        <div style={styles.stat}><AlertTriangle size={20} color="#c2410c" /><span style={styles.statContent}><small style={styles.statLabel}>High or critical</small><strong className="analytics-stat-value" style={styles.statValue}>{highCount + criticalCount}</strong></span></div>
        <div style={styles.stat}><ShieldCheck size={20} color="#15803d" /><span style={styles.statContent}><small style={styles.statLabel}>Critical cases</small><strong className="analytics-stat-value" style={styles.statValue}>{criticalCount}</strong></span></div>
        <div style={styles.stat}><Users size={20} color="#2563eb" /><span style={styles.statContent}><small style={styles.statLabel}>Average risk score</small><strong className="analytics-stat-value" style={styles.statValue}>{averageRisk}/100</strong></span></div>
      </section>

      <section className="analytics-panel" style={styles.panel}>
        <div className="analytics-panel-header" style={styles.panelHeader}>
          <div><p style={styles.eyebrow}>Needs attention</p><h2 style={styles.panelTitle}>At-risk students</h2></div>
          <button className="analytics-secondary-button" style={styles.secondaryButton} onClick={loadWatchlist} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        </div>
        {loading ? <p style={styles.empty}>Loading the watchlist...</p> : watchlist.length === 0 ? <p style={styles.empty}>No students are currently above the watchlist threshold.</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr><th>Student</th><th>Risk</th><th>Signals</th><th>Last calculated</th><th aria-label="Actions" /></tr></thead>
              <tbody>{watchlist.map(profile => {
                const student = profile.student;
                const factors = profile.factors || {};
                return <tr key={profile._id}>
                  <td><strong>{student?.user?.name || student?.name || 'Unknown student'}</strong><small>{student?.studentId || 'Student profile'}</small></td>
                  <td><span style={{ ...styles.badge, color: categoryColors[profile.riskCategory] || '#475569' }}>{profile.riskCategory || 'unknown'} · {Math.round(profile.riskScore || 0)}</span></td>
                  <td style={styles.signals}>{factors.attendanceDrop ? `${Math.round(factors.attendanceDrop)}% attendance gap` : 'No attendance gap'}; {factors.lowQuizScores || 0} low quizzes; {factors.missingAssignments || 0} missing</td>
                  <td>{profile.lastCalculatedAt ? new Date(profile.lastCalculatedAt).toLocaleDateString() : 'Not available'}</td>
                  <td><button style={styles.iconButton} onClick={() => sendAlert(student?._id)} disabled={!student?._id} title="Send parent risk alert"><Mail size={16} /></button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: '#17233b' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '25px 27px', borderRadius: 16, background: 'linear-gradient(125deg, #fff6e8, #f8fbff)', border: '1px solid #f0dfc3' },
  eyebrow: { margin: 0, color: '#2563eb', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' },
  title: { margin: '7px 0 5px', fontSize: 28, color: '#13213b' },
  subtitle: { margin: 0, color: '#64748b', fontSize: 14, maxWidth: 620 },
  primaryButton: { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 15px', border: 0, borderRadius: 9, background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 11px', border: '1px solid #dbe4ef', borderRadius: 8, background: '#fff', color: '#2563eb', fontWeight: 700, cursor: 'pointer' },
  message: { padding: '11px 14px', border: '1px solid #bbf7d0', borderRadius: 9, background: '#f0fdf4', color: '#166534', fontSize: 13 },
  error: { padding: '11px 14px', border: '1px solid #fecaca', borderRadius: 9, background: '#fef2f2', color: '#991b1b', fontSize: 13 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  stat: { display: 'flex', alignItems: 'center', gap: 12, padding: 17, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 13, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  statContent: { display: 'flex', flexDirection: 'column', gap: 4 },
  statLabel: { color: '#68778d', fontSize: 12 },
  statValue: { color: '#182640', fontSize: 20 },
  panel: { padding: 21, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 14, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 17 },
  panelTitle: { margin: '5px 0 0', fontSize: 18, color: '#182640' },
  empty: { padding: '25px 8px', color: '#7c8ba0', fontSize: 14 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: 13 },
  badge: { fontWeight: 800, textTransform: 'capitalize' },
  signals: { color: '#52627a' },
  iconButton: { display: 'inline-flex', padding: 8, border: '1px solid #dbe4ef', borderRadius: 8, background: '#fff', color: '#2563eb', cursor: 'pointer' },
  spin: { animation: 'spin 1s linear infinite' },
};

Object.assign(styles.table, { textAlign: 'left' });
