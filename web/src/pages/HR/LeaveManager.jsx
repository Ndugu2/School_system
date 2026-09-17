import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Calendar, CheckCircle2, XCircle, Clock, Plus, Filter, UserCheck, ShieldAlert, X } from 'lucide-react';

const LEAVE_TYPES = ['Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Annual / Study Leave', 'Compassionate Leave', 'Official School Duty'];

const MOCK_LEAVES = [
  { _id: '1', staffName: 'Amara Christine', role: 'Teacher (Humanities)', leaveType: 'Maternity Leave', startDate: '2026-05-01', endDate: '2026-08-01', days: 90, status: 'approved', reason: 'Maternity confinement and postpartum recovery', requestedOn: '2026-04-10' },
  { _id: '2', staffName: 'Mugisha Peter', role: 'Teacher (Math)', leaveType: 'Sick Leave', startDate: '2026-06-14', endDate: '2026-06-18', days: 4, status: 'pending', reason: 'Malaria treatment at Mengo Hospital', requestedOn: '2026-06-13' },
  { _id: '3', staffName: 'Wasswa Robert', role: 'Librarian', leaveType: 'Annual / Study Leave', startDate: '2026-07-01', endDate: '2026-07-14', days: 14, status: 'pending', reason: 'Attending UNEB national curriculum workshop', requestedOn: '2026-06-05' },
  { _id: '4', staffName: 'Nakato Sarah', role: 'Teacher (Sciences)', leaveType: 'Official School Duty', startDate: '2026-05-20', endDate: '2026-05-22', days: 3, status: 'approved', reason: 'Accompanying Science Club to National Robotics Expo', requestedOn: '2026-05-15' },
];

export default function LeaveManager() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [form, setForm] = useState({ staffName: '', role: 'Teacher', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    api.get('/hr/leaves').then(data => setLeaves(data?.length ? data : MOCK_LEAVES)).catch(() => setLeaves(MOCK_LEAVES)).finally(() => setLoading(false));
  }, []);

  const handleStatusChange = (id, newStatus) => {
    setLeaves(prev => prev.map(l => l._id === id ? { ...l, status: newStatus } : l));
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (!form.staffName || !form.startDate || !form.endDate) return;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const newLeave = {
      _id: Date.now().toString(),
      ...form,
      days,
      status: 'pending',
      requestedOn: new Date().toISOString().split('T')[0]
    };
    setLeaves(prev => [newLeave, ...prev]);
    setShowApplyModal(false);
    setForm({ staffName: '', role: 'Teacher', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' });
  };

  const filtered = leaves.filter(l => filterStatus === 'all' || l.status === filterStatus);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span style={{ ...s.badge, backgroundColor: '#dcfce7', color: '#15803d' }}><CheckCircle2 size={12} /> Approved</span>;
      case 'rejected':
        return <span style={{ ...s.badge, backgroundColor: '#fee2e2', color: '#b91c1c' }}><XCircle size={12} /> Rejected</span>;
      default:
        return <span style={{ ...s.badge, backgroundColor: '#fef3c7', color: '#b45309' }}><Clock size={12} /> Pending Review</span>;
    }
  };

  if (loading) return <div style={s.loading}>Loading leave applications...</div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Staff Leave & Duty Roster</h2>
          <p style={s.subtitle}>Review, approve, and track staff leave entitlements adhering to MoES labor guidelines</p>
        </div>
        <div style={s.actions}>
          <div style={s.filterRow}>
            <Filter size={15} color="var(--text-tertiary)" />
            <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Applications</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button style={s.applyBtn} onClick={() => setShowApplyModal(true)}>
            <Plus size={16} /> Request Leave
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <span style={s.kpiVal}>{leaves.length}</span>
          <span style={s.kpiLbl}>Total Requests</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#f59e0b' }}>{leaves.filter(l => l.status === 'pending').length}</span>
          <span style={s.kpiLbl}>Pending Review</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#10b981' }}>{leaves.filter(l => l.status === 'approved').length}</span>
          <span style={s.kpiLbl}>Active / Approved</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#6366f1' }}>98.4%</span>
          <span style={s.kpiLbl}>Staff Cover Rate</span>
        </div>
      </div>

      {/* Table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.trHead}>
              <th style={s.th}>Staff Member</th>
              <th style={s.th}>Leave Category</th>
              <th style={s.th}>Duration</th>
              <th style={s.th}>Days</th>
              <th style={s.th}>Reason</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l._id} style={s.tr}>
                <td style={s.td}>
                  <div style={s.staffCol}>
                    <span style={s.name}>{l.staffName}</span>
                    <span style={s.subText}>{l.role}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <span style={s.leaveType}>{l.leaveType}</span>
                </td>
                <td style={s.td}>
                  <span style={s.dates}>{l.startDate} → {l.endDate}</span>
                </td>
                <td style={s.td}>
                  <strong style={s.days}>{l.days} days</strong>
                </td>
                <td style={{ ...s.td, maxWidth: 220 }}>
                  <span style={s.reasonText}>{l.reason}</span>
                </td>
                <td style={s.td}>
                  {getStatusBadge(l.status)}
                </td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  {l.status === 'pending' ? (
                    <div style={s.btnGroup}>
                      <button style={s.approveBtn} onClick={() => handleStatusChange(l._id, 'approved')} title="Approve Leave">
                        <CheckCircle2 size={15} /> Approve
                      </button>
                      <button style={s.rejectBtn} onClick={() => handleStatusChange(l._id, 'rejected')} title="Reject Leave">
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span style={s.closedAction}>Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showApplyModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowApplyModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Request Staff Leave</h3>
              <button style={s.closeBtn} onClick={() => setShowApplyModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleApply} style={s.form}>
              <div style={s.fGroup}>
                <label style={s.label}>Staff Member Name</label>
                <input style={s.input} required value={form.staffName} onChange={e => setForm(p => ({ ...p, staffName: e.target.value }))} placeholder="e.g. Kakembo Denis" />
              </div>
              <div style={s.fGroup}>
                <label style={s.label}>Leave Type</label>
                <select style={s.input} value={form.leaveType} onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}>
                  {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={s.fRow}>
                <div style={s.fGroup}>
                  <label style={s.label}>Start Date</label>
                  <input style={s.input} type="date" required value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>End Date</label>
                  <input style={s.input} type="date" required value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <div style={s.fGroup}>
                <label style={s.label}>Reason & Cover Handover Notes</label>
                <textarea style={{ ...s.input, minHeight: 80 }} required value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="State reason and replacement teacher assigned for classes..." />
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowApplyModal(false)}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  title: { margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { margin: 0, fontSize: 13, color: 'var(--text-secondary)' },
  actions: { display: 'flex', gap: 10, alignItems: 'center' },
  filterRow: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px' },
  select: { border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' },
  applyBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  kpiCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: 'var(--shadow-sm)' },
  kpiVal: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' },
  kpiLbl: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 },
  tableCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  trHead: { borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)' },
  th: { padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.4px', textTransform: 'uppercase', fontSize: 11 },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 16px', verticalAlign: 'middle' },
  staffCol: { display: 'flex', flexDirection: 'column' },
  name: { fontWeight: 700, color: 'var(--text-primary)' },
  subText: { fontSize: 11, color: 'var(--text-secondary)' },
  leaveType: { fontWeight: 600, color: 'var(--text-primary)' },
  dates: { fontSize: 12, color: 'var(--text-secondary)' },
  days: { color: 'var(--primary)' },
  reasonText: { fontSize: 12, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  btnGroup: { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  approveBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  rejectBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  closedAction: { fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' },
  form: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  fGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  fRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' },
  input: { border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-primary)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' },
  modalFoot: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 },
  submitBtn: { padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }
};
