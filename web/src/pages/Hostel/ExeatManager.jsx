import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ShieldCheck, Clock, CheckCircle2, AlertTriangle, KeyRound, Plus, Search, Filter, LogOut, LogIn, X } from 'lucide-react';

const MOCK_EXEATS = [
  { _id: '1', studentName: 'Mukasa Ronald', admissionNo: 'NDU/2026/042', dormName: 'Lumumba Hall', roomNo: 'Room 12B', destination: 'Jinja (Family Funeral)', parentName: 'John Mukasa (0772112233)', departureTime: '2026-06-12 08:30', returnTime: '2026-06-14 17:00', otp: '8492', status: 'active_exit', wardenApproved: true },
  { _id: '2', studentName: 'Kembabazi Joy', admissionNo: 'NDU/2026/073', dormName: 'Mary Stuart Hall', roomNo: 'Room 04', destination: 'Kampala Hospital (Dental Checkup)', parentName: 'Mary Kembabazi (0701998877)', departureTime: '2026-06-16 09:00', returnTime: '2026-06-16 16:00', otp: '4190', status: 'approved', wardenApproved: true },
  { _id: '3', studentName: 'Ssemwogerere Paul', admissionNo: 'NDU/2026/119', dormName: 'Kabalega Hall', roomNo: 'Room 21A', destination: 'Entebbe (Medical Convalescence)', parentName: 'David Ssemwo (0782334455)', departureTime: '2026-06-17 10:00', returnTime: '2026-06-20 18:00', otp: 'Pending SMS', status: 'pending_parent', wardenApproved: false },
  { _id: '4', studentName: 'Atuhaire Diana', admissionNo: 'NDU/2026/054', dormName: 'Complex Hall', roomNo: 'Room 08', destination: 'Wakiso (Sister Wedding)', departureTime: '2026-06-05 08:00', returnTime: '2026-06-07 16:00', parentName: 'Grace Atuhaire (0752119900)', otp: '6128', status: 'returned', wardenApproved: true, actualReturn: '2026-06-07 15:45' }
];

export default function ExeatManager() {
  const [exeats, setExeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ studentName: '', admissionNo: '', dormName: 'Lumumba Hall', roomNo: '', destination: '', parentName: '', departureTime: '', returnTime: '' });

  useEffect(() => {
    api.get('/hostel/exeats').then(data => setExeats(data?.length ? data : MOCK_EXEATS)).catch(() => setExeats(MOCK_EXEATS)).finally(() => setLoading(false));
  }, []);

  const handleAction = (id, newStatus, extra = {}) => {
    setExeats(prev => prev.map(e => e._id === id ? { ...e, status: newStatus, ...extra } : e));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.studentName || !form.destination || !form.parentName) return;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const newExeat = {
      _id: Date.now().toString(),
      ...form,
      otp,
      status: 'approved',
      wardenApproved: true
    };
    setExeats(prev => [newExeat, ...prev]);
    setShowModal(false);
    setForm({ studentName: '', admissionNo: '', dormName: 'Lumumba Hall', roomNo: '', destination: '', parentName: '', departureTime: '', returnTime: '' });
  };

  const filtered = exeats.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.studentName.toLowerCase().includes(q) || e.admissionNo.toLowerCase().includes(q) || e.destination.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchQ && matchStatus;
  });

  if (loading) return <div style={s.loading}>Loading exeat gate passes...</div>;

  return (
    <div style={s.container}>
      {/* Top controls */}
      <div style={s.header}>
        <div style={s.filters}>
          <div style={s.searchBox}>
            <Search size={16} color="var(--text-tertiary)" />
            <input style={s.searchInput} placeholder="Search student name, admission, destination..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Gate Passes</option>
            <option value="active_exit">Currently Outside School</option>
            <option value="approved">Approved (Awaiting Gate Exit)</option>
            <option value="pending_parent">Pending Parent OTP</option>
            <option value="returned">Safely Returned</option>
          </select>
        </div>
        <button style={s.issueBtn} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Request Boarding Exeat
        </button>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiRow}>
        <div style={s.kpiCard}>
          <span style={s.kpiVal}>{exeats.length}</span>
          <span style={s.kpiLbl}>Total Passes</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#ef4444' }}>{exeats.filter(e => e.status === 'active_exit').length}</span>
          <span style={s.kpiLbl}>Active Off-Campus</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#f59e0b' }}>{exeats.filter(e => e.status === 'pending_parent').length}</span>
          <span style={s.kpiLbl}>Awaiting Parent OTP</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#10b981' }}>{exeats.filter(e => e.status === 'returned').length}</span>
          <span style={s.kpiLbl}>Safely Returned</span>
        </div>
      </div>

      {/* Exeat Table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.trHead}>
              <th style={s.th}>Student Boarder</th>
              <th style={s.th}>Dormitory & Room</th>
              <th style={s.th}>Destination & Reason</th>
              <th style={s.th}>Parent Contact</th>
              <th style={s.th}>Authorized Window</th>
              <th style={s.th}>Parent OTP</th>
              <th style={s.th}>Gate Status</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Warden Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e._id} style={s.tr}>
                <td style={s.td}>
                  <div style={s.studentCol}>
                    <span style={s.studentName}>{e.studentName}</span>
                    <span style={s.admissionNo}>{e.admissionNo}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <span style={s.dormText}>{e.dormName}</span>
                  <span style={s.subText}>{e.roomNo}</span>
                </td>
                <td style={{ ...s.td, maxWidth: 200 }}>
                  <span style={s.destText}>{e.destination}</span>
                </td>
                <td style={s.td}><span style={s.subText}>{e.parentName}</span></td>
                <td style={s.td}>
                  <span style={s.timeText}>Exit: {e.departureTime}</span>
                  <span style={s.timeText}>Exp: {e.returnTime}</span>
                </td>
                <td style={s.td}>
                  <div style={s.otpWrap}>
                    <KeyRound size={13} color="#4f46e5" />
                    <code style={s.otpCode}>{e.otp}</code>
                  </div>
                </td>
                <td style={s.td}>
                  {e.status === 'active_exit' && (
                    <span style={{ ...s.badge, backgroundColor: '#fee2e2', color: '#b91c1c' }}><LogOut size={12} /> Off-Campus</span>
                  )}
                  {e.status === 'approved' && (
                    <span style={{ ...s.badge, backgroundColor: '#dcfce7', color: '#15803d' }}><CheckCircle2 size={12} /> Approved</span>
                  )}
                  {e.status === 'pending_parent' && (
                    <span style={{ ...s.badge, backgroundColor: '#fef3c7', color: '#b45309' }}><Clock size={12} /> Awaiting OTP</span>
                  )}
                  {e.status === 'returned' && (
                    <span style={{ ...s.badge, backgroundColor: '#e0e7ff', color: '#3730a3' }}><CheckCircle2 size={12} /> Back in Dorm</span>
                  )}
                </td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  {e.status === 'approved' && (
                    <button style={s.gateOutBtn} onClick={() => handleAction(e._id, 'active_exit')}>
                      <LogOut size={13} /> Gate Exit
                    </button>
                  )}
                  {e.status === 'active_exit' && (
                    <button style={s.gateInBtn} onClick={() => handleAction(e._id, 'returned', { actualReturn: new Date().toISOString() })}>
                      <LogIn size={13} /> Gate Return
                    </button>
                  )}
                  {e.status === 'pending_parent' && (
                    <button style={s.verifyOtpBtn} onClick={() => handleAction(e._id, 'approved', { otp: '8821' })}>
                      Verify OTP
                    </button>
                  )}
                  {e.status === 'returned' && (
                    <span style={s.clearedText}>Logged Safe</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={s.overlay} onClick={ev => ev.target === ev.currentTarget && setShowModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Issue Digital Exeat Pass</h3>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={s.form}>
              <div style={s.fGroup}>
                <label style={s.label}>Student Full Name *</label>
                <input style={s.input} required value={form.studentName} onChange={ev => setForm(p => ({ ...p, studentName: ev.target.value }))} placeholder="e.g. Mukasa Ronald" />
              </div>
              <div style={s.fRow}>
                <div style={s.fGroup}>
                  <label style={s.label}>Admission No</label>
                  <input style={s.input} value={form.admissionNo} onChange={ev => setForm(p => ({ ...p, admissionNo: ev.target.value }))} placeholder="e.g. NDU/2026/042" />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>Dormitory</label>
                  <select style={s.input} value={form.dormName} onChange={ev => setForm(p => ({ ...p, dormName: ev.target.value }))}>
                    {['Lumumba Hall', 'Mary Stuart Hall', 'Kabalega Hall', 'Complex Hall'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.fGroup}>
                <label style={s.label}>Destination & Detailed Reason *</label>
                <input style={s.input} required value={form.destination} onChange={ev => setForm(p => ({ ...p, destination: ev.target.value }))} placeholder="e.g. Jinja - Medical consultation at referral clinic" />
              </div>
              <div style={s.fGroup}>
                <label style={s.label}>Parent / Guardian Phone & Name *</label>
                <input style={s.input} required value={form.parentName} onChange={ev => setForm(p => ({ ...p, parentName: ev.target.value }))} placeholder="e.g. Sarah Mukasa (0772123456)" />
              </div>
              <div style={s.fRow}>
                <div style={s.fGroup}>
                  <label style={s.label}>Departure Date/Time</label>
                  <input style={s.input} type="datetime-local" required value={form.departureTime} onChange={ev => setForm(p => ({ ...p, departureTime: ev.target.value }))} />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>Return Date/Time</label>
                  <input style={s.input} type="datetime-local" required value={form.returnTime} onChange={ev => setForm(p => ({ ...p, returnTime: ev.target.value }))} />
                </div>
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Generate Exeat & OTP</button>
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
  filters: { display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 240 },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', flex: 1 },
  select: { border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' },
  issueBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  kpiCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: 'var(--shadow-sm)' },
  kpiVal: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' },
  kpiLbl: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 },
  tableCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  trHead: { borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)' },
  th: { padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.4px', textTransform: 'uppercase', fontSize: 11 },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 16px', verticalAlign: 'middle' },
  studentCol: { display: 'flex', flexDirection: 'column' },
  studentName: { fontWeight: 700, color: 'var(--text-primary)' },
  admissionNo: { fontSize: 11, color: 'var(--text-secondary)' },
  dormText: { fontWeight: 600, color: 'var(--text-primary)', display: 'block' },
  subText: { fontSize: 12, color: 'var(--text-secondary)' },
  destText: { fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 },
  timeText: { fontSize: 11, color: 'var(--text-secondary)', display: 'block' },
  otpWrap: { display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' },
  otpCode: { fontSize: 12, fontWeight: 700, color: 'var(--primary)' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  gateOutBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  gateInBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  verifyOtpBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', color: '#b45309', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  clearedText: { fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' },
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
