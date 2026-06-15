import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FileText, Plus, Search, Filter, Download, ChevronDown, X, CheckCircle, Clock, AlertCircle, XCircle, Send } from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const CLASSES = ['Nursery','P1','P2','P3','P4','P5','P6','P7','S1','S2','S3','S4','S5','S6'];
const TERMS = ['Term 1','Term 2','Term 3'];
const YEAR = new Date().getFullYear();

const statusConfig = {
  paid:    { color: '#10b981', bg: '#d1fae5', icon: CheckCircle,  label: 'Paid' },
  partial: { color: '#f59e0b', bg: '#fef3c7', icon: Clock,        label: 'Partial' },
  unpaid:  { color: '#6366f1', bg: '#e0e7ff', icon: FileText,     label: 'Unpaid' },
  overdue: { color: '#ef4444', bg: '#fee2e2', icon: AlertCircle,  label: 'Overdue' },
  waived:  { color: '#94a3b8', bg: '#f1f5f9', icon: XCircle,      label: 'Waived' },
};

export default function InvoiceManager() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [search, setSearch] = useState('');

  // Generate modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ classLevel: 'S1', term: 'Term 1', academicYear: YEAR, dueDate: '' });
  const [genLoading, setGenLoading] = useState(false);

  // Pay modal state
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('MTN Mobile Money');
  const [payRef, setPayRef] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filterStatus) params.append('status', filterStatus);
      if (filterTerm) params.append('term', filterTerm);
      const data = await api.get(`/finance/invoices?${params}`);
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [filterStatus, filterTerm]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    try {
      const res = await api.post('/finance/invoices/generate-bulk', genForm);
      alert(`✅ ${res.message}`);
      setShowGenModal(false);
      fetchInvoices();
    } catch (err) { alert(`❌ ${err.message}`); }
    finally { setGenLoading(false); }
  };

  const handlePay = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return alert('Enter a valid amount');
    try {
      await api.post(`/finance/invoices/${payModal._id}/pay`, { amount: parseFloat(payAmount), method: payMethod, transactionRef: payRef });
      alert('✅ Payment recorded!');
      setPayModal(null);
      setPayAmount('');
      fetchInvoices();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const handleSendReminder = async (invoiceId) => {
    try {
      const res = await api.post(`/finance/invoices/${invoiceId}/remind-sms`);
      alert(`✅ ${res.message}`);
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const name = inv.student?.user?.name?.toLowerCase() || '';
    const num = inv.invoiceNumber?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || num.includes(search.toLowerCase());
  });

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Invoices & Payments</h2>
          <p style={s.subtitle}>{total} total invoices</p>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowGenModal(true)}>
          <Plus size={16} /> Generate Invoices
        </button>
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={16} style={s.searchIcon} />
          <input style={s.searchInput} placeholder="Search by student or invoice number…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={s.select} value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
          <option value="">All Terms</option>
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.empty}>Loading invoices…</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>No invoices found. Generate invoices by clicking the button above.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Invoice #','Student','Class','Term','Total','Paid','Balance','Status','Action'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const st = statusConfig[inv.status] || statusConfig.unpaid;
                const Icon = st.icon;
                return (
                  <tr key={inv._id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{inv.invoiceNumber}</td>
                    <td style={s.td}>{inv.student?.user?.name || '—'}</td>
                    <td style={s.td}>{inv.classLevel}</td>
                    <td style={s.td}>{inv.term}</td>
                    <td style={s.td}>{UGX(inv.totalAmount)}</td>
                    <td style={{ ...s.td, color: '#10b981', fontWeight: 600 }}>{UGX(inv.paidAmount)}</td>
                    <td style={{ ...s.td, color: inv.balance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{UGX(inv.balance)}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, backgroundColor: st.bg, color: st.color }}>
                        <Icon size={11} /> {st.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {inv.status !== 'paid' && inv.status !== 'waived' && (
                          <>
                            <button style={s.payBtn} onClick={() => { setPayModal(inv); setPayAmount(String(inv.balance)); }}>
                              Pay
                            </button>
                            <button style={{ ...s.payBtn, backgroundColor: '#fee2e2', color: '#ef4444' }} onClick={() => handleSendReminder(inv._id)}>
                              <Send size={12} style={{ marginRight: 4 }} /> Remind
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Modal */}
      {showGenModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Generate Bulk Invoices</h3>
              <button style={s.closeBtn} onClick={() => setShowGenModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerate} style={s.form}>
              <label style={s.label}>Class Level</label>
              <select style={s.input} value={genForm.classLevel} onChange={e => setGenForm({...genForm, classLevel: e.target.value})}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={s.label}>Term</label>
              <select style={s.input} value={genForm.term} onChange={e => setGenForm({...genForm, term: e.target.value})}>
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label style={s.label}>Academic Year</label>
              <input type="number" style={s.input} value={genForm.academicYear} onChange={e => setGenForm({...genForm, academicYear: parseInt(e.target.value)})} />
              <label style={s.label}>Payment Due Date</label>
              <input type="date" required style={s.input} value={genForm.dueDate} onChange={e => setGenForm({...genForm, dueDate: e.target.value})} />
              <p style={s.hint}>⚡ Invoices will be auto-generated from the fee structure for {genForm.classLevel}. Students already having an invoice for this term will be skipped.</p>
              <button type="submit" style={s.primaryBtn} disabled={genLoading}>
                {genLoading ? 'Generating…' : 'Generate Invoices'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Record Payment — {payModal.invoiceNumber}</h3>
              <button style={s.closeBtn} onClick={() => setPayModal(null)}><X size={18} /></button>
            </div>
            <div style={s.form}>
              <div style={s.balanceRow}>
                <span style={s.label}>Outstanding Balance</span>
                <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 18 }}>{UGX(payModal.balance)}</span>
              </div>
              <label style={s.label}>Amount Paid (UGX)</label>
              <input type="number" style={s.input} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              <label style={s.label}>Payment Method</label>
              <select style={s.input} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                {['MTN Mobile Money','Airtel Money','Bank Deposit','Cash','Card'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <label style={s.label}>Transaction Reference</label>
              <input type="text" placeholder="e.g. MTN-REF-12345" style={s.input} value={payRef} onChange={e => setPayRef(e.target.value)} />
              <button style={s.primaryBtn} onClick={handlePay}>Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'var(--transition)' },
  filterBar: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 200 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' },
  searchInput: { width: '100%', padding: '10px 12px 10px 38px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 14 },
  select: { padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 },
  tableWrap: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'auto', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  thead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  th: { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'var(--transition)' },
  td: { padding: '13px 16px', fontSize: 13, color: 'var(--text-primary)' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  payBtn: { backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '10px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 14, width: '100%' },
  hint: { fontSize: 12, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 8, lineHeight: 1.6 },
  balanceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' },
};
