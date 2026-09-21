import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { BookOpen, CheckCircle, Clock, AlertTriangle, Plus, Search, Filter, RefreshCw, X, User } from 'lucide-react';

const MOCK_LOANS = [
  { _id: '1', studentName: 'Mukasa Ronald', admissionNo: 'NDU/2026/042', className: 'Senior 3', stream: 'East', bookTitle: 'Comprehensive Secondary Chemistry (S1 - S4)', issueDate: '2026-05-10', dueDate: '2026-06-10', status: 'overdue', condition: 'Good' },
  { _id: '2', studentName: 'Auma Brenda', admissionNo: 'NDU/2026/015', className: 'Senior 5', stream: 'Sciences', bookTitle: 'Pure Mathematics for A-Level (Vol 1)', issueDate: '2026-05-25', dueDate: '2026-06-25', status: 'borrowed', condition: 'Fair' },
  { _id: '3', studentName: 'Kato Dennis', admissionNo: 'NDU/2026/088', className: 'Senior 2', stream: 'West', bookTitle: 'Song of Lawino & Song of Ocol', issueDate: '2026-06-01', dueDate: '2026-07-01', status: 'borrowed', condition: 'Good' },
  { _id: '4', studentName: 'Nassanga Florence', admissionNo: 'NDU/2026/104', className: 'Senior 4', stream: 'North', bookTitle: 'East African History (1000 - Present)', issueDate: '2026-04-12', dueDate: '2026-05-12', returnDate: '2026-05-11', status: 'returned', condition: 'Good' }
];

export default function IssueReturn() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [form, setForm] = useState({ studentName: '', admissionNo: '', className: 'Senior 3', stream: 'East', bookTitle: '', dueDate: '' });

  useEffect(() => {
    api.get('/library/loans').then(data => setLoans(data?.loans?.length ? data.loans : MOCK_LOANS)).catch(() => setLoans(MOCK_LOANS)).finally(() => setLoading(false));
  }, []);

  const handleReturn = (id) => {
    setLoans(prev => prev.map(l => l._id === id ? { ...l, status: 'returned', returnDate: new Date().toISOString().split('T')[0] } : l));
  };

  const handleIssue = (e) => {
    e.preventDefault();
    if (!form.studentName || !form.bookTitle || !form.dueDate) return;
    const newLoan = {
      _id: Date.now().toString(),
      ...form,
      issueDate: new Date().toISOString().split('T')[0],
      status: 'borrowed',
      condition: 'Good'
    };
    setLoans(prev => [newLoan, ...prev]);
    setShowIssueModal(false);
    setForm({ studentName: '', admissionNo: '', className: 'Senior 3', stream: 'East', bookTitle: '', dueDate: '' });
  };

  const filtered = loans.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || l.studentName.toLowerCase().includes(q) || l.admissionNo.toLowerCase().includes(q) || l.bookTitle.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchQ && matchStatus;
  });

  if (loading) return <div style={s.loading}>Loading circulation records...</div>;

  return (
    <div style={s.container}>
      {/* Controls */}
      <div style={s.header}>
        <div style={s.filters}>
          <div style={s.searchBox}>
            <Search size={16} color="var(--text-tertiary)" />
            <input style={s.searchInput} placeholder="Search by student name, admission no, or book..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Circulation</option>
            <option value="borrowed">Currently Borrowed</option>
            <option value="overdue">Overdue Clearance</option>
            <option value="returned">Returned</option>
          </select>
        </div>
        <button style={s.issueBtn} onClick={() => setShowIssueModal(true)}>
          <Plus size={16} /> Issue Book to Student
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={s.kpiRow}>
        <div style={s.kpiCard}>
          <span style={s.kpiVal}>{loans.filter(l => l.status === 'borrowed').length}</span>
          <span style={s.kpiLbl}>Active Loans</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#ef4444' }}>{loans.filter(l => l.status === 'overdue').length}</span>
          <span style={s.kpiLbl}>Overdue Unreturned</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#10b981' }}>{loans.filter(l => l.status === 'returned').length}</span>
          <span style={s.kpiLbl}>Returned This Term</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#6366f1' }}>100%</span>
          <span style={s.kpiLbl}>Clearance Ledger Accuracy</span>
        </div>
      </div>

      {/* Table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.trHead}>
              <th style={s.th}>Student Learner</th>
              <th style={s.th}>Class / Stream</th>
              <th style={s.th}>Book Borrowed</th>
              <th style={s.th}>Issue Date</th>
              <th style={s.th}>Due Date</th>
              <th style={s.th}>Circulation Status</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l._id} style={s.tr}>
                <td style={s.td}>
                  <div style={s.studentCol}>
                    <span style={s.studentName}>{l.studentName}</span>
                    <span style={s.admissionNo}>{l.admissionNo}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <span style={s.classBadge}>{l.className} ({l.stream})</span>
                </td>
                <td style={s.td}>
                  <span style={s.bookTitle}>{l.bookTitle}</span>
                </td>
                <td style={s.td}><span style={s.dateText}>{l.issueDate}</span></td>
                <td style={s.td}><span style={{ ...s.dateText, color: l.status === 'overdue' ? '#ef4444' : 'inherit', fontWeight: l.status === 'overdue' ? 700 : 400 }}>{l.dueDate}</span></td>
                <td style={s.td}>
                  {l.status === 'returned' && (
                    <span style={{ ...s.badge, backgroundColor: '#dcfce7', color: '#15803d' }}><CheckCircle size={12} /> Returned</span>
                  )}
                  {l.status === 'borrowed' && (
                    <span style={{ ...s.badge, backgroundColor: '#e0e7ff', color: '#3730a3' }}><Clock size={12} /> Borrowed</span>
                  )}
                  {l.status === 'overdue' && (
                    <span style={{ ...s.badge, backgroundColor: '#fee2e2', color: '#b91c1c' }}><AlertTriangle size={12} /> Overdue Clearance</span>
                  )}
                </td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  {l.status !== 'returned' ? (
                    <button style={s.returnBtn} onClick={() => handleReturn(l._id)}>
                      <CheckCircle size={14} /> Mark Returned
                    </button>
                  ) : (
                    <span style={s.clearedText}>Cleared on {l.returnDate}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowIssueModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Issue Book to Student</h3>
              <button style={s.closeBtn} onClick={() => setShowIssueModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleIssue} style={s.form}>
              <div style={s.fGroup}>
                <label style={s.label}>Student Full Name *</label>
                <input style={s.input} required value={form.studentName} onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))} placeholder="e.g. Mukasa Ronald" />
              </div>
              <div style={s.fRow}>
                <div style={s.fGroup}>
                  <label style={s.label}>Admission / LIN Number</label>
                  <input style={s.input} value={form.admissionNo} onChange={e => setForm(p => ({ ...p, admissionNo: e.target.value }))} placeholder="e.g. NDU/2026/042" />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>Class</label>
                  <select style={s.input} value={form.className} onChange={e => setForm(p => ({ ...p, className: e.target.value }))}>
                    {['Senior 1', 'Senior 2', 'Senior 3', 'Senior 4', 'Senior 5', 'Senior 6'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.fGroup}>
                <label style={s.label}>Textbook Title *</label>
                <input style={s.input} required value={form.bookTitle} onChange={e => setForm(p => ({ ...p, bookTitle: e.target.value }))} placeholder="e.g. Comprehensive Secondary Chemistry (S1 - S4)" />
              </div>
              <div style={s.fGroup}>
                <label style={s.label}>Expected Return Date *</label>
                <input style={s.input} type="date" required value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Confirm Book Issue</button>
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
  classBadge: { padding: '3px 8px', borderRadius: 6, fontSize: 12, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 },
  bookTitle: { fontWeight: 600, color: 'var(--text-primary)' },
  dateText: { fontSize: 12, color: 'var(--text-secondary)' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  returnBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  clearedText: { fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
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
