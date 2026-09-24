import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, BadgeDollarSign, CheckCircle2, ClipboardList, FileText, Landmark, Receipt, TrendingUp } from 'lucide-react';

const UGX = value => `UGX ${Number(value || 0).toLocaleString('en-UG')}`;

export default function FinanceManagerDashboard({ setCurrentTab }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get(`/finance/reports/summary?academicYear=${year}`),
      api.get(`/finance/reports/cashflow-forecast?academicYear=${year}`),
    ]).then(([summaryData, cashflowData]) => {
      if (!mounted) return;
      setSummary(summaryData);
      setCashflow(cashflowData);
    }).catch(() => {}).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [year]);

  const breakdown = summary?.revenue?.breakdown || [];
  const invoiced = breakdown.reduce((total, item) => total + (item.totalAmount || 0), 0);
  const receivable = breakdown.reduce((total, item) => total + Math.max((item.totalAmount || 0) - (item.paidAmount || 0), 0), 0);
  const collected = summary?.revenue?.totalRevenue || 0;
  const collectionRate = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;
  const forecastTotal = (cashflow?.forecast || []).reduce((total, item) => total + (item.projectedCollection || 0), 0);

  const stats = [
    { label: 'Fees Collected', value: loading ? '...' : UGX(collected), icon: BadgeDollarSign, accent: '#2563eb' },
    { label: 'Fees Receivable', value: loading ? '...' : UGX(receivable), icon: Receipt, accent: '#0f9f79' },
    { label: 'Operating Expenses', value: loading ? '...' : UGX(summary?.expenses?.totalExpenses), icon: ClipboardList, accent: '#d97706' },
    { label: 'Net Cash Position', value: loading ? '...' : UGX(summary?.netPosition), icon: TrendingUp, accent: '#c2410c' },
  ];

  const navigateTo = tab => setCurrentTab(tab);

  return (
    <div style={styles.page}>
      <section style={styles.welcome}>
        <div>
          <p style={styles.eyebrow}>Finance Manager workspace</p>
          <h1 style={styles.title}>Good morning, {user?.name || 'Finance Manager'}</h1>
          <p style={styles.subtitle}>Collections, expenses, payroll, and school accounts in one place.</p>
        </div>
        <div style={styles.dateBadge}>{new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </section>

      <section style={styles.statsGrid}>
        {stats.map(({ label, value, icon: Icon, accent }) => <div key={label} style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: accent, background: `${accent}14` }}><Icon size={19} /></div>
          <div><div style={styles.statLabel}>{label}</div><strong style={styles.statValue}>{value}</strong></div>
        </div>)}
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}><div><p style={styles.eyebrow}>Receivables control</p><h2 style={styles.panelTitle}>Fee collection progress</h2></div><BadgeDollarSign size={22} color="#2563eb" /></div>
          <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${collectionRate}%` }} /></div>
          <div style={styles.progressMeta}><span>{collectionRate}% collected</span><span>{UGX(invoiced)} invoiced</span></div>
          <p style={styles.helper}>{UGX(receivable)} remains outstanding across the current academic year.</p>
          <button style={styles.primaryButton} onClick={() => navigateTo('fees')}>Open receivables ledger <ArrowRight size={16} /></button>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}><div><p style={styles.eyebrow}>Cash planning</p><h2 style={styles.panelTitle}>Upcoming collections</h2></div><Landmark size={22} color="#0f9f79" /></div>
          <div style={styles.forecastValue}>{loading ? '...' : UGX(forecastTotal)}</div>
          <p style={styles.helper}>Projected fee collections for the next three months.</p>
          <button style={styles.secondaryButton} onClick={() => navigateTo('finance')}>Open accounting centre <ArrowRight size={16} /></button>
        </div>
      </section>

      <section style={styles.actionStrip}>
        <button style={styles.actionButton} onClick={() => navigateTo('fees')}><FileText size={18} /><span><strong>Raise fee invoices</strong><small>Generate term invoices by class</small></span><ArrowRight size={16} /></button>
        <button style={styles.actionButton} onClick={() => navigateTo('fees')}><BadgeDollarSign size={18} /><span><strong>Post cash receipt</strong><small>Apply a payment to the ledger</small></span><ArrowRight size={16} /></button>
        <button style={styles.actionButton} onClick={() => navigateTo('finance')}><Landmark size={18} /><span><strong>Review accounts</strong><small>Reconcile the school books</small></span><ArrowRight size={16} /></button>
      </section>

      <section style={styles.notice}><CheckCircle2 size={18} color="#0f9f79" /><span>{loading ? 'Loading finance controls...' : `${UGX(receivable)} in student receivables needs attention.`}</span><button onClick={() => navigateTo('finance')}>View reports</button></section>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: '#17233b' },
  welcome: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '24px 26px', borderRadius: 16, background: 'linear-gradient(125deg, #e8f2ff, #f8fbff)', border: '1px solid #d7e5f5' },
  eyebrow: { margin: 0, color: '#2563eb', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' },
  title: { margin: '7px 0 5px', fontSize: 28, color: '#13213b' },
  subtitle: { margin: 0, color: '#5d6c83', fontSize: 14 },
  dateBadge: { padding: '9px 12px', borderRadius: 9, background: '#fff', border: '1px solid #d7e5f5', color: '#52627a', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  statCard: { display: 'flex', alignItems: 'center', gap: 13, padding: 17, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 13, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  statIcon: { width: 39, height: 39, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  statLabel: { color: '#68778d', fontSize: 12, marginBottom: 4 },
  statValue: { color: '#182640', fontSize: 18 },
  grid: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 },
  panel: { padding: 21, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 14, boxShadow: '0 5px 18px rgba(31, 53, 82, 0.06)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 17 },
  panelTitle: { margin: '5px 0 0', fontSize: 18, color: '#182640' },
  progressTrack: { height: 11, overflow: 'hidden', borderRadius: 99, background: '#e9eff6' },
  progressFill: { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #2563eb, #0f9f79)', transition: 'width 400ms ease' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#63738a', fontSize: 12, fontWeight: 700 },
  helper: { margin: '18px 0', color: '#66758a', fontSize: 13, lineHeight: 1.5 },
  forecastValue: { color: '#182640', fontSize: 25, fontWeight: 800 },
  primaryButton: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid #dce6f0', borderRadius: 8, background: '#fafdff', color: '#2563eb', fontWeight: 700, cursor: 'pointer' },
  actionStrip: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  actionButton: { display: 'flex', alignItems: 'center', gap: 11, padding: 15, border: '1px solid #dce6f0', borderRadius: 11, background: '#fafdff', color: '#2563eb', textAlign: 'left', cursor: 'pointer' },
  notice: { display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px', borderRadius: 10, background: '#edfaf5', border: '1px solid #c9efdf', color: '#22634e', fontSize: 13 },
};
