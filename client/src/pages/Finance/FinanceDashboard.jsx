import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  FileText, Users, CheckCircle, Clock, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function FinanceDashboard({ setActiveFinanceTab }) {
  const [summary, setSummary] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      api.get(`/finance/reports/summary?academicYear=${year}`),
      api.get(`/finance/reports/cashflow-forecast?academicYear=${year}`)
    ])
      .then(([summaryData, cashflowData]) => {
        setSummary(summaryData);
        setCashflow(cashflowData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div style={s.loading}>Loading financial data...</div>;

  const revenueCards = [
    { label: 'Total Revenue', value: UGX(summary?.revenue?.totalRevenue), icon: TrendingUp, color: '#10b981', bg: '#d1fae5' },
    { label: 'Total Expenses', value: UGX(summary?.expenses?.totalExpenses), icon: TrendingDown, color: '#ef4444', bg: '#fee2e2' },
    { label: 'Payroll Cost', value: UGX(summary?.payroll?.totalPayroll), icon: Users, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Net Position', value: UGX(summary?.netPosition), icon: BarChart2, color: '#4f46e5', bg: '#e0e7ff' },
  ];

  const invoiceBreakdown = (summary?.revenue?.breakdown || []).map(b => ({
    name: b._id?.toUpperCase() || 'N/A',
    invoiced: b.totalAmount || 0,
    paid: b.paidAmount || 0,
    count: b.count,
  }));

  const expensePieData = (summary?.expenses?.breakdown || []).map(e => ({
    name: e._id?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: e.total,
  }));

  return (
    <div style={s.container}>
      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        {revenueCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, backgroundColor: card.bg }}>
                <Icon size={22} color={card.color} />
              </div>
              <div>
                <p style={s.kpiLabel}>{card.label}</p>
                <p style={{ ...s.kpiValue, color: card.color }}>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={s.chartsRow}>
        {/* Invoice Status Bar Chart */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Invoice Status — {year}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={invoiceBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(val) => UGX(val)} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="invoiced" fill="#e0e7ff" name="Invoiced" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" fill="#4f46e5" name="Paid" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Pie Chart */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Expense Categories</h3>
          {expensePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val) => UGX(val)} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={s.empty}>No expense data for {year}</div>
          )}
        </div>

        {/* Cash Flow Forecast Graph */}
        <div style={{ ...s.chartCard, gridColumn: '1 / -1' }}>
          <h3 style={s.chartTitle}>Smart Cash Flow Projection (Next 3 Months)</h3>
          {cashflow && cashflow.forecast.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cashflow.forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(val) => UGX(val)} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="projectedCollection" fill="#10b981" name="Projected Inflow" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={s.empty}>Insufficient data to calculate cash flow projections.</div>
          )}
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div style={s.quickActions}>
        {[
          { label: 'Generate Invoices', icon: FileText, tab: 'invoices', desc: 'Bulk-generate by grade cohort' },
          { label: 'Record Payment', icon: CheckCircle, tab: 'invoices', desc: 'Apply payment to an invoice' },
          { label: 'Run Payroll', icon: Users, tab: 'payroll', desc: 'Process monthly staff salaries' },
          { label: 'Log Expense', icon: AlertCircle, tab: 'expenses', desc: 'Record operational costs' },
        ].map(action => {
          const Icon = action.icon;
          return (
            <button key={action.label} style={s.actionTile} onClick={() => setActiveFinanceTab(action.tab)}>
              <div style={s.actionIcon}><Icon size={20} color="var(--primary)" /></div>
              <div>
                <p style={s.actionLabel}>{action.label}</p>
                <p style={s.actionDesc}>{action.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 24 },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  kpiCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-sm)' },
  kpiIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiLabel: { fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: 800 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  chartCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: 'var(--shadow-sm)' },
  chartTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 },
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  quickActions: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  actionTile: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)', boxShadow: 'var(--shadow-sm)' },
  actionIcon: { width: 40, height: 40, backgroundColor: 'var(--primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionLabel: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' },
  actionDesc: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 },
};
