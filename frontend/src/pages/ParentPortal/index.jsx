import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, Calendar, BookOpen, CreditCard, Activity, TrendingUp, CheckCircle, Clock, AlertTriangle, MapPin, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // In a real app, we'd fetch the parent's children. For this demo, let's just fetch all students and pick the first one to simulate.
    api.get('/students')
      .then(res => {
        setChildren(res);
        if (res.length > 0) setSelectedChild(res[0]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    setLoading(true);
    // Simulate fetching aggregated dashboard data for the specific child
    Promise.all([
      api.get(`/grades/student/${selectedChild._id}`),
      api.get(`/attendance/student/${selectedChild._id}`),
      api.get(`/finance/invoices?student=${selectedChild._id}`),
      api.get(`/finance/wallets/${selectedChild._id}`).catch(() => ({ balance: 0, dailyLimit: 10000, transactions: [] })),
    ]).then(([grades, attendance, financeRes, walletRes]) => {
      setDashboardData({ grades, attendance, finance: financeRes.invoices || [], wallet: walletRes });
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedChild]);

  if (!children.length) return <div style={s.empty}>No children records found for this parent account.</div>;
  if (loading || !dashboardData) return <div style={s.loading}>Loading student profile…</div>;

  const { grades, attendance, finance } = dashboardData;

  // Process grades for chart
  const gradeData = grades.map(g => ({
    subject: g.subject?.name || 'Unknown',
    score: g.score,
  }));

  // Process attendance
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  // Process finance
  const unpaidInvoices = finance.filter(i => i.status !== 'paid' && i.status !== 'waived');
  const totalBalance = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0);

  return (
    <div style={s.container}>
      {/* Header & Child Selector */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Parent Portal</h2>
          <p style={s.subtitle}>Welcome back! Here is your child's progress.</p>
        </div>
        <select style={s.select} value={selectedChild?._id} onChange={e => setSelectedChild(children.find(c => c._id === e.target.value))}>
          {children.map(child => (
            <option key={child._id} value={child._id}>{child.user?.name || 'Student'} ({child.studentId})</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: 'overview', label: 'At a Glance', icon: Activity },
          { id: 'academics', label: 'Academics', icon: BookOpen },
          { id: 'finance', label: 'Financials', icon: CreditCard },
          { id: 'wallet', label: 'Digital Wallet', icon: Wallet },
          { id: 'transport', label: 'Bus Tracking', icon: MapPin },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} style={{ ...s.tabBtn, ...(active ? s.tabActive : {}) }} onClick={() => setActiveTab(tab.id)}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={s.grid}>
          {/* Attendance KPI */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <Calendar size={18} color="var(--primary)" />
              <h3 style={s.cardTitle}>Attendance</h3>
            </div>
            <div style={s.kpiValue}>{attendanceRate}%</div>
            <p style={s.kpiDesc}>{presentDays} of {totalDays} days present</p>
            <div style={s.progressBg}>
              <div style={{ ...s.progressFill, width: `${attendanceRate}%`, backgroundColor: attendanceRate > 85 ? '#10b981' : '#f59e0b' }} />
            </div>
          </div>

          {/* Finance KPI */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <CreditCard size={18} color="#ef4444" />
              <h3 style={s.cardTitle}>Outstanding Balance</h3>
            </div>
            <div style={{ ...s.kpiValue, color: totalBalance > 0 ? '#ef4444' : '#10b981' }}>
              UGX {totalBalance.toLocaleString()}
            </div>
            <p style={s.kpiDesc}>{unpaidInvoices.length} unpaid invoice(s)</p>
            {totalBalance > 0 && <button style={s.payBtn} onClick={() => setActiveTab('finance')}>Pay Now</button>}
          </div>

          {/* Academic Summary Chart */}
          <div style={{ ...s.card, gridColumn: '1 / -1' }}>
            <div style={s.cardHeader}>
              <TrendingUp size={18} color="#8b5cf6" />
              <h3 style={s.cardTitle}>Recent Grades</h3>
            </div>
            {gradeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gradeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={s.empty}>No grades recorded for this term yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Academics Tab */}
      {activeTab === 'academics' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}><BookOpen size={18} color="var(--primary)" style={{ marginRight: 8 }} /> Detailed Grades</h3>
          {grades.length === 0 ? <p style={s.empty}>No grades available.</p> : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Subject</th>
                  <th style={s.th}>Term</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Score</th>
                  <th style={s.th}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {grades.map(g => (
                  <tr key={g._id} style={s.tr}>
                    <td style={s.td}>{g.subject?.name}</td>
                    <td style={s.td}>{g.term}</td>
                    <td style={{ ...s.td, textTransform: 'capitalize' }}>{g.assessmentType}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: g.score >= 50 ? '#10b981' : '#ef4444' }}>{g.score}%</td>
                    <td style={s.td}>{g.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Finance Tab */}
      {activeTab === 'finance' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}><CreditCard size={18} color="var(--primary)" style={{ marginRight: 8 }} /> Financial Ledger</h3>
          {finance.length === 0 ? <p style={s.empty}>No financial records.</p> : (
            <div style={s.invoiceList}>
              {finance.map(inv => (
                <div key={inv._id} style={s.invoiceItem}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{inv.invoiceNumber}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, backgroundColor: inv.balance > 0 ? '#fee2e2' : '#d1fae5', color: inv.balance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        {inv.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{inv.term} · Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total: UGX {inv.totalAmount.toLocaleString()}</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: inv.balance > 0 ? '#ef4444' : '#10b981' }}>Bal: UGX {inv.balance.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Digital Wallet Tab */}
      {activeTab === 'wallet' && (
        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <Wallet size={18} color="#10b981" />
              <h3 style={s.cardTitle}>Digital Cafeteria Wallet</h3>
            </div>
            <div style={{ ...s.kpiValue, color: '#10b981' }}>UGX {(dashboardData.wallet?.balance || 0).toLocaleString()}</div>
            <p style={s.kpiDesc}>Available Balance</p>
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#d1fae5', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>Daily Spending Limit:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>UGX {(dashboardData.wallet?.dailyLimit || 10000).toLocaleString()}</span>
            </div>
            <button style={{ ...s.payBtn, backgroundColor: '#10b981', marginTop: 16 }}>Top Up Wallet</button>
          </div>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <Activity size={18} color="var(--primary)" />
              <h3 style={s.cardTitle}>Recent Spending</h3>
            </div>
            {dashboardData.wallet?.transactions?.length > 0 ? (
              <div style={s.invoiceList}>
                {dashboardData.wallet.transactions.slice(0, 5).map((t, idx) => (
                  <div key={idx} style={{ ...s.invoiceItem, backgroundColor: 'transparent', padding: '12px 0', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.itemDescription}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(t.date).toLocaleDateString()} · {t.vendor}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: t.type === 'purchase' ? '#ef4444' : '#10b981' }}>
                      {t.type === 'purchase' ? '-' : '+'} UGX {t.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={s.empty}>No recent transactions.</p>
            )}
          </div>
        </div>
      )}

      {/* Bus Tracking Tab */}
      {activeTab === 'transport' && (
        <div style={{ ...s.card, height: '500px', display: 'flex', flexDirection: 'column' }}>
          <div style={s.cardHeader}>
            <MapPin size={18} color="#f59e0b" />
            <h3 style={s.cardTitle}>Live Bus Tracking</h3>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, alignItems: 'center' }}>
            <AlertTriangle size={20} color="#b45309" />
            <p style={{ fontSize: 14, color: '#92400e', fontWeight: 600 }}>Bus 4 is currently 2 km away. ETA: 5 mins to pick-up point.</p>
          </div>
          {/* Simulated Map Background */}
          <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'url("https://www.transparenttextures.com/patterns/cartographer.png")' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'bounce 2s infinite' }}>
              <MapPin size={48} color="#ef4444" fill="#fecaca" />
              <div style={{ backgroundColor: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: 4 }}>
                Route 4 - Kampala Road
              </div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `}} />
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 },
  select: { padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--primary)', outline: 'none', fontSize: 14, fontWeight: 600, minWidth: 200 },
  tabs: { display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '10px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'var(--transition)' },
  tabActive: { backgroundColor: 'var(--primary-light)', color: 'var(--primary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  card: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' },
  kpiValue: { fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 },
  kpiDesc: { fontSize: 13, color: 'var(--text-secondary)' },
  progressBg: { width: '100%', height: 8, backgroundColor: 'var(--bg-tertiary)', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 1s ease-out' },
  payBtn: { marginTop: 16, width: '100%', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  th: { padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 16px', fontSize: 14, color: 'var(--text-primary)' },
  invoiceList: { display: 'flex', flexDirection: 'column', gap: 12 },
  invoiceItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 15, fontWeight: 600 },
};
