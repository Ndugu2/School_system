import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Receipt, Plus, CheckCircle, Clock, XCircle, X } from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const CATEGORIES = ['utilities','maintenance','supplies','transport','salaries','equipment','events','other'];

const statusStyle = {
  pending:  { color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  approved: { color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
  rejected: { color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  paid:     { color: '#4f46e5', bg: '#e0e7ff', icon: CheckCircle },
};

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'utilities', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', description: '', paymentMethod: 'cash', term: '' });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat) params.append('category', filterCat);
      if (filterStatus) params.append('status', filterStatus);
      const data = await api.get(`/finance/expenses?${params}`);
      setExpenses(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, [filterCat, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/expenses', { ...form, amount: parseFloat(form.amount) });
      alert('✅ Expense logged');
      setShowModal(false);
      setForm({ title: '', category: 'utilities', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', description: '', paymentMethod: 'cash', term: '' });
      fetchExpenses();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const handleApprove = async (id, action) => {
    try {
      await api.put(`/finance/expenses/${id}/approve`, { action });
      fetchExpenses();
    } catch (err) { alert(err.message); }
  };

  const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter(e => ['approved','paid'].includes(e.status)).reduce((s, e) => s + e.amount, 0);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Expense Tracker</h2>
          <div style={s.summaryPills}>
            <span style={{ ...s.pill, color: '#f59e0b', backgroundColor: '#fef3c7' }}>Pending: {UGX(totalPending)}</span>
            <span style={{ ...s.pill, color: '#10b981', backgroundColor: '#d1fae5' }}>Approved: {UGX(totalApproved)}</span>
          </div>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Log Expense
        </button>
      </div>

      <div style={s.filterBar}>
        <select style={s.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.keys(statusStyle).map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
        </select>
      </div>

      <div style={s.tableWrap}>
        {loading ? <div style={s.empty}>Loading expenses…</div> : expenses.length === 0 ? (
          <div style={s.empty}>No expense records found.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Title','Category','Vendor','Amount','Date','Method','Submitted By','Status','Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => {
                const st = statusStyle[exp.status] || statusStyle.pending;
                const Icon = st.icon;
                return (
                  <tr key={exp._id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{exp.title}</td>
                    <td style={s.td}><span style={s.catBadge}>{exp.category}</span></td>
                    <td style={s.td}>{exp.vendor || '—'}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#ef4444' }}>{UGX(exp.amount)}</td>
                    <td style={s.td}>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={s.td}>{exp.paymentMethod}</td>
                    <td style={s.td}>{exp.submittedBy?.name || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, color: st.color, backgroundColor: st.bg }}>
                        <Icon size={11} /> {exp.status}
                      </span>
                    </td>
                    <td style={s.td}>
                      {exp.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={s.approveBtn} onClick={() => handleApprove(exp._id, 'approve')}>Approve</button>
                          <button style={s.rejectBtn} onClick={() => handleApprove(exp._id, 'reject')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Log New Expense</h3>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Title</label>
                  <input required style={s.input} placeholder="e.g. UMEME Electricity Bill" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Category</label>
                  <select style={s.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Amount (UGX)</label>
                  <input required type="number" style={s.input} value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Date</label>
                  <input type="date" style={s.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Vendor / Supplier</label>
                  <input style={s.input} placeholder="e.g. Kampala Stationery Ltd" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Payment Method</label>
                  <select style={s.input} value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                    {['cash','bank','momo','cheque'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <label style={s.label}>Description / Notes</label>
              <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <button type="submit" style={s.primaryBtn}>Submit for Approval</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 },
  summaryPills: { display: 'flex', gap: 10 },
  pill: { fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  filterBar: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  select: { padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 },
  tableWrap: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'auto', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 960 },
  thead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  th: { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 16px', fontSize: 13, color: 'var(--text-primary)' },
  catBadge: { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  approveBtn: { backgroundColor: '#d1fae5', color: '#10b981', border: 'none', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  rejectBtn: { backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 12 },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '10px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 13, width: '100%' },
};
