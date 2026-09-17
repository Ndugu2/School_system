import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Home, Users, AlertCircle, Building2 } from 'lucide-react';

export default function HostelDashboard({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [dorms, setDorms] = useState([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      api.get(`/hostel/stats?academicYear=${year}`),
      api.get('/hostel/dormitories'),
    ]).then(([s, d]) => {
      setStats(s);
      setDorms(d);
    }).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div style={s.loading}>Loading hostel data...</div>;

  const kpis = [
    { label: 'Dormitories', value: stats?.totalDorms || 0, icon: Building2, color: '#4f46e5', bg: '#e0e7ff' },
    { label: 'Total Rooms', value: stats?.totalRooms || 0, icon: Home, color: '#10b981', bg: '#d1fae5' },
    { label: 'Current Boarders', value: stats?.totalBoarders || 0, icon: Users, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Unpaid Fees', value: stats?.unpaidFees || 0, icon: AlertCircle, color: '#ef4444', bg: '#fee2e2' },
  ];

  return (
    <div style={s.container}>
      <div style={s.kpiGrid}>
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, backgroundColor: k.bg }}><Icon size={22} color={k.color} /></div>
              <div>
                <p style={s.kpiLabel}>{k.label}</p>
                <p style={{ ...s.kpiValue, color: k.color }}>{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.row}>
        {/* Dormitory Cards */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Dormitories</h3>
            <button style={s.linkBtn} onClick={() => setActiveTab('rooms')}>Manage Rooms →</button>
          </div>
          {dorms.length === 0 ? (
            <p style={s.empty}>No dormitories added yet</p>
          ) : (
            <div style={s.dormGrid}>
              {dorms.map(d => {
                const occupancy = (stats?.byDorm || []).find(b => String(b._id) === String(d._id));
                return (
                  <div key={d._id} style={s.dormCard}>
                    <div style={s.dormHeader}>
                      <Building2 size={18} color={d.gender === 'Male' ? '#3b82f6' : '#ec4899'} />
                      <span style={s.dormName}>{d.name}</span>
                      <span style={{ ...s.genderBadge, backgroundColor: d.gender === 'Male' ? '#dbeafe' : '#fce7f3', color: d.gender === 'Male' ? '#1d4ed8' : '#be185d' }}>{d.gender}</span>
                    </div>
                    <div style={s.dormStats}>
                      <span>{d.totalRooms} rooms</span>
                      <span>•</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{occupancy?.count || 0} boarders</span>
                      <span>•</span>
                      <span>Cap: {d.totalCapacity}</span>
                    </div>
                    {d.wardenName && <p style={s.warden}>Warden: {d.wardenName}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Occupancy by Dorm */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Boarders by Dormitory</h3>
          {(stats?.byDorm || []).length === 0 ? (
            <p style={s.empty}>No active boarders</p>
          ) : (
            (stats?.byDorm || []).map(b => (
              <div key={b._id} style={s.barRow}>
                <span style={s.barLabel}>{b.name}</span>
                <div style={s.barTrack}>
                  <div style={{ ...s.barFill, width: `${Math.min(100, (b.count / (stats?.totalBoarders || 1)) * 100)}%` }} />
                </div>
                <span style={s.barCount}>{b.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 24 },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  kpiCard: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' },
  kpiIcon: { borderRadius: 10, padding: 10, flexShrink: 0 },
  kpiLabel: { margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 },
  kpiValue: { margin: 0, fontSize: 24, fontWeight: 700 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 20, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  linkBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 13, marginBottom: 14 },
  empty: { color: 'var(--text-tertiary)', fontSize: 14, margin: 0 },
  dormGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  dormCard: { backgroundColor: 'var(--bg-primary)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' },
  dormHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  dormName: { fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' },
  genderBadge: { borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, marginLeft: 'auto' },
  dormStats: { display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' },
  warden: { margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' },
  barRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabel: { fontSize: 13, width: 120, color: 'var(--text-secondary)' },
  barTrack: { flex: 1, height: 8, backgroundColor: 'var(--border)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: 'var(--primary)', borderRadius: 4, transition: 'width 0.5s ease' },
  barCount: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', width: 30, textAlign: 'right' },
};
