import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Monitor, Package, AlertTriangle, ArrowLeftRight, TrendingUp } from 'lucide-react';

export default function InventoryDashboard({ setActiveTab }) {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/inventory/summary'),
      api.get('/inventory/consumables/low-stock'),
      api.get('/inventory/assets/overdue'),
    ]).then(([sum, low, od]) => {
      setSummary(sum);
      setLowStock(low);
      setOverdue(od);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={s.loading}>Loading inventory data…</div>;

  const kpis = [
    { label: 'Total Assets',      value: summary?.totalAssets ?? '—',     icon: Monitor,       color: '#4f46e5', bg: '#e0e7ff', tab: 'assets'     },
    { label: 'On Loan',           value: summary?.checkedOutAssets ?? '—', icon: ArrowLeftRight, color: '#f59e0b', bg: '#fef3c7', tab: 'checkout'   },
    { label: 'Available Assets',  value: summary?.availableAssets ?? '—',  icon: TrendingUp,    color: '#10b981', bg: '#d1fae5', tab: 'assets'     },
    { label: 'Overdue Items',     value: summary?.overdueCheckouts ?? '—', icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2', tab: 'checkout'   },
    { label: 'Consumable Lines',  value: summary?.totalConsumables ?? '—', icon: Package,       color: '#8b5cf6', bg: '#ede9fe', tab: 'consumables'},
    { label: 'Low Stock Alerts',  value: summary?.lowStockItems ?? '—',    icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2', tab: 'consumables'},
  ];

  return (
    <div style={s.container}>
      {/* KPI Grid */}
      <div style={s.kpiGrid}>
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <button key={k.label} style={s.kpiCard} onClick={() => setActiveTab(k.tab)}>
              <div style={{ ...s.kpiIcon, backgroundColor: k.bg }}>
                <Icon size={20} color={k.color} />
              </div>
              <div>
                <p style={s.kpiLabel}>{k.label}</p>
                <p style={{ ...s.kpiValue, color: k.color }}>{k.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div style={s.panels}>
        {/* Low Stock Alerts */}
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <AlertTriangle size={18} color="#ef4444" />
            <h3 style={s.panelTitle}>Low Stock Items</h3>
            <span style={s.badge}>{lowStock.length}</span>
          </div>
          {lowStock.length === 0 ? (
            <p style={s.empty}>✅ All consumables are adequately stocked.</p>
          ) : (
            <div style={s.listScroll}>
              {lowStock.map(item => (
                <div key={item._id} style={s.alertRow}>
                  <div>
                    <p style={s.alertName}>{item.name}</p>
                    <p style={s.alertMeta}>{item.category} · {item.location || 'Store'}</p>
                  </div>
                  <div style={s.stockIndicator}>
                    <span style={s.stockBad}>{item.quantity} {item.unit}</span>
                    <span style={s.stockTarget}>/ {item.reorderLevel} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Checkouts */}
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <ArrowLeftRight size={18} color="#f59e0b" />
            <h3 style={s.panelTitle}>Overdue Checkouts</h3>
            <span style={s.badgeOrange}>{overdue.length}</span>
          </div>
          {overdue.length === 0 ? (
            <p style={s.empty}>✅ No overdue items currently.</p>
          ) : (
            <div style={s.listScroll}>
              {overdue.map(r => (
                <div key={r._id} style={s.alertRow}>
                  <div>
                    <p style={s.alertName}>{r.itemName}</p>
                    <p style={s.alertMeta}>Borrower: {r.borrowerName} ({r.borrowerType})</p>
                  </div>
                  <div style={s.overdueDate}>
                    Due: {new Date(r.dueDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 24 },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  kpiCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' },
  kpiIcon: { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiLabel: { fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: 800 },
  panels: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  panel: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 22, boxShadow: 'var(--shadow-sm)' },
  panelHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' },
  panelTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', flex: 1 },
  badge: { backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 },
  badgeOrange: { backgroundColor: '#fef3c7', color: '#f59e0b', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 },
  listScroll: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' },
  alertRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 8 },
  alertName: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' },
  alertMeta: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, textTransform: 'capitalize' },
  stockIndicator: { display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 },
  stockBad: { color: '#ef4444', fontWeight: 800, fontSize: 15 },
  stockTarget: { color: 'var(--text-tertiary)', fontSize: 11 },
  overdueDate: { color: '#ef4444', fontWeight: 700, fontSize: 12, flexShrink: 0 },
  empty: { color: 'var(--text-tertiary)', fontSize: 13, padding: '20px 0', textAlign: 'center' },
};
