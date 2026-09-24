import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FileText, Plus, Search, Filter, Download, ChevronDown, X, CheckCircle, Clock, AlertCircle, XCircle, Send, Printer, DollarSign, Trash2 } from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const CLASSES = ['Nursery','P1','P2','P3','P4','P5','P6','P7','S1','S2','S3','S4','S5','S6'];
const TERMS = ['Term 1','Term 2','Term 3'];
const YEAR = new Date().getFullYear();
const YEARS = [YEAR, YEAR - 1, YEAR - 2];

const statusConfig = {
  paid:    { color: '#10b981', bg: '#d1fae5', icon: CheckCircle,  label: 'Paid' },
  partial: { color: '#f59e0b', bg: '#fef3c7', icon: Clock,        label: 'Partial' },
  unpaid:  { color: '#6366f1', bg: '#e0e7ff', icon: FileText,     label: 'Unpaid' },
  overdue: { color: '#ef4444', bg: '#fee2e2', icon: AlertCircle,  label: 'Overdue' },
  waived:  { color: '#94a3b8', bg: '#f1f5f9', icon: XCircle,      label: 'Waived' },
};

export default function InvoiceManager({ readOnly = false, onReceivePayment }) {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterYear, setFilterYear] = useState(String(YEAR));
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate cohort modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ classLevel: 'S1', term: 'Term 1', academicYear: YEAR, dueDate: '' });
  const [genLoading, setGenLoading] = useState(false);

  // Single Custom Invoice modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [customForm, setCustomForm] = useState({
    studentId: '',
    classLevel: 'S1',
    term: 'Term 1',
    academicYear: YEAR,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    lineItems: [
      { name: 'Tuition Fee', amount: 850000 },
      { name: 'School Tour / Educational Excursion', amount: 150000 }
    ],
  });
  const [customLoading, setCustomLoading] = useState(false);

  // Pay modal state
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('MTN Mobile Money');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositAccounts, setDepositAccounts] = useState([]);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payReceipt, setPayReceipt] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filterStatus) params.append('status', filterStatus);
      if (filterTerm) params.append('term', filterTerm);
      if (filterYear) params.append('academicYear', filterYear);
      const data = await api.get(`/finance/invoices?${params}`);
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students?limit=200');
      setStudents(res.students || []);
    } catch (err) { console.error(err); }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/finance/accounts?type=Asset');
      const filtered = (res.accounts || []).filter(a => a.subType === 'Cash & Bank' || a.subType === 'Mobile Money' || a.subType === 'Current Asset');
      setDepositAccounts(filtered);
      if (filtered.length > 0 && !depositAccountId) {
        setDepositAccountId(filtered[0]._id);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStudents();
    fetchAccounts();
  }, [filterStatus, filterTerm, filterYear]);

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

  const handleCreateCustom = async (e) => {
    e.preventDefault();
    if (!customForm.studentId) return alert('Please select a student');
    if (customForm.lineItems.length === 0) return alert('Please add at least one line item');
    setCustomLoading(true);
    try {
      const res = await api.post('/finance/invoices', customForm);
      alert(`✅ Invoice ${res.invoice?.invoiceNumber || ''} created & posted to General Ledger!`);
      setShowCustomModal(false);
      fetchInvoices();
    } catch (err) { alert(`❌ ${err.message}`); }
    finally { setCustomLoading(false); }
  };

  const handleAddLineItem = () => {
    setCustomForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { name: '', amount: 0 }]
    }));
  };

  const handleUpdateLine = (index, field, value) => {
    setCustomForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, idx) => idx === index ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : item)
    }));
  };

  const handleRemoveLine = (index) => {
    setCustomForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, idx) => idx !== index)
    }));
  };

  const handlePay = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return alert('Enter a valid amount');
    try {
      const res = await api.post('/finance/payments', {
        invoiceId: payModal._id,
        amount: parseFloat(payAmount),
        method: payMethod,
        depositAccountId: depositAccountId || undefined,
        transactionRef: payRef,
        notes: payNotes,
      });
      setPayReceipt(res.payment);
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

  const customTotal = customForm.lineItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div style={{ ...s.container, gap: isMobile ? 16 : 20 }}>
      {/* Header */}
      <div style={{ ...s.header, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
        <div>
          <h2 style={s.title}>Student Fees Receivables</h2>
          <p style={s.subtitle}>{total} fee accounts in the receivables ledger (Double-entry integrated)</p>
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ ...s.primaryBtn, backgroundColor: '#c59b27' }} onClick={() => setShowCustomModal(true)}>
              <Plus size={16} /> + Create Custom Invoice
            </button>
            <button style={s.primaryBtn} onClick={() => setShowGenModal(true)}>
              <Plus size={16} /> Raise Cohort Invoices
            </button>
            {onReceivePayment && (
              <button style={{ ...s.primaryBtn, backgroundColor: '#10b981' }} onClick={onReceivePayment}>
                <DollarSign size={16} /> Receive Payment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ ...s.filterBar, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(200px, 1.5fr) repeat(3, minmax(140px, 1fr))' }}>
        <div style={s.searchWrap}>
          <Search size={16} style={s.searchIcon} />
          <input style={s.searchInput} placeholder="Search account holder or invoice number…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Ledger Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={s.select} value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
          <option value="">All Academic Terms</option>
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={s.select} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All Academic Years</option>
          {YEARS.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...s.tableWrap, overflowX: 'auto' }}>
        {loading ? (
          <div style={s.empty}>Loading invoices…</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>No invoices found. Generate invoices by clicking the button above.</div>
        ) : (
          <table style={{ ...s.table, minWidth: isMobile ? 720 : 900 }}>
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
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{inv.student?.user?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{inv.student?.admissionNumber || ''}</div>
                    </td>
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
                        {!readOnly && inv.status !== 'paid' && inv.status !== 'waived' && (
                          <>
                            <button style={s.payBtn} onClick={() => { setPayModal(inv); setPayAmount(String(inv.balance)); }}>
                              Post Payment
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

      {/* Cohort Bulk Generate Modal */}
      {showGenModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: isMobile ? 'min(100%, 420px)' : 480, padding: isMobile ? 18 : 28 }}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Generate Class Fee Invoices</h3>
              <button style={s.closeBtn} onClick={() => setShowGenModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerate} style={s.form}>
              <label style={s.label}>Student Class</label>
              <select style={s.input} value={genForm.classLevel} onChange={e => setGenForm({...genForm, classLevel: e.target.value})}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={s.label}>Academic Term</label>
              <select style={s.input} value={genForm.term} onChange={e => setGenForm({...genForm, term: e.target.value})}>
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label style={s.label}>Financial Year</label>
              <input type="number" style={s.input} value={genForm.academicYear} onChange={e => setGenForm({...genForm, academicYear: parseInt(e.target.value)})} />
              <label style={s.label}>Due Date</label>
              <input type="date" required style={s.input} value={genForm.dueDate} onChange={e => setGenForm({...genForm, dueDate: e.target.value})} />
              <p style={s.hint}>⚡ Fee invoices will be auto-generated from the approved fee structure for {genForm.classLevel} and auto-posted to Accounts Receivable (1200) and Revenue (4000s).</p>
              <button type="submit" style={s.primaryBtn} disabled={genLoading}>
                {genLoading ? 'Generating…' : 'Raise Fee Invoices'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Single Custom Invoice Modal */}
      {showCustomModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Create Custom Student Invoice</h3>
              <button style={s.closeBtn} onClick={() => setShowCustomModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCustom} style={s.form}>
              <label style={s.label}>Select Student</label>
              <select
                required
                style={s.input}
                value={customForm.studentId}
                onChange={e => {
                  const st = students.find(s => s._id === e.target.value);
                  setCustomForm({
                    ...customForm,
                    studentId: e.target.value,
                    classLevel: st?.classLevel || customForm.classLevel
                  });
                }}
              >
                <option value="">-- Choose Student --</option>
                {students.map(st => (
                  <option key={st._id} value={st._id}>
                    {st.user?.name || 'Unnamed'} ({st.admissionNumber || 'No ID'}) - {st.classLevel || 'Unassigned'}
                  </option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={s.label}>Class</label>
                  <select style={s.input} value={customForm.classLevel} onChange={e => setCustomForm({...customForm, classLevel: e.target.value})}>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Term</label>
                  <select style={s.input} value={customForm.term} onChange={e => setCustomForm({...customForm, term: e.target.value})}>
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Due Date</label>
                  <input type="date" required style={s.input} value={customForm.dueDate} onChange={e => setCustomForm({...customForm, dueDate: e.target.value})} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={s.label}>Invoice Line Items (Tuition, Tours, etc.)</label>
                  <button type="button" onClick={handleAddLineItem} style={{ ...s.payBtn, backgroundColor: '#c59b2722', color: '#c59b27' }}>
                    + Add Item
                  </button>
                </div>
                {customForm.lineItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input
                      placeholder="e.g. Tuition Fee, Tour to Queen Elizabeth, Uniform"
                      style={s.input}
                      value={item.name}
                      onChange={e => handleUpdateLine(idx, 'name', e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      placeholder="UGX"
                      style={s.input}
                      value={item.amount || ''}
                      onChange={e => handleUpdateLine(idx, 'amount', e.target.value)}
                      required
                    />
                    {customForm.lineItems.length > 1 && (
                      <button type="button" onClick={() => handleRemoveLine(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)', fontWeight: 800 }}>
                  <span>Total Amount</span>
                  <span style={{ color: '#c59b27', fontSize: 16 }}>{UGX(customTotal)}</span>
                </div>
              </div>

              <p style={s.hint}>
                ⚡ Double-Entry Posting: Debit 1200 Accounts Receivable & Credit matching Revenue Accounts (4010 Tuition, 4030 Tour/Excursions, 4020 Boarding).
              </p>

              <button type="submit" style={s.primaryBtn} disabled={customLoading}>
                {customLoading ? 'Creating Invoice...' : `Issue & Post Invoice (${UGX(customTotal)})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Posting Modal */}
      {payModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: isMobile ? 'min(100%, 420px)' : 500, padding: isMobile ? 18 : 28 }}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>Receive Payment</h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Invoice: {payModal.invoiceNumber} · {payModal.student?.user?.name}</span>
              </div>
              <button style={s.closeBtn} onClick={() => setPayModal(null)}><X size={18} /></button>
            </div>
            <div style={s.form}>
              <div style={s.balanceRow}>
                <span style={s.label}>Outstanding Balance</span>
                <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 18 }}>{UGX(payModal.balance)}</span>
              </div>
              <label style={s.label}>Payment Amount (UGX)</label>
              <input type="number" style={s.input} value={payAmount} onChange={e => setPayAmount(e.target.value)} />

              <label style={s.label}>Deposit To Account (Chart of Accounts)</label>
              <select style={s.input} value={depositAccountId} onChange={e => setDepositAccountId(e.target.value)}>
                {depositAccounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.code} - {acc.name} ({acc.subType})
                  </option>
                ))}
              </select>

              <label style={s.label}>Payment Method</label>
              <select style={s.input} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                {['MTN Mobile Money','Airtel Money','Bank Deposit','Cash','Cheque','Credit Card'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <label style={s.label}>Reference / Cheque Number</label>
              <input type="text" placeholder="e.g. STANBIC-DEP-9942 or MTN-TXN-102" style={s.input} value={payRef} onChange={e => setPayRef(e.target.value)} />

              <label style={s.label}>Accounting Memo / Notes</label>
              <input type="text" placeholder="e.g. Term fee instalment" style={s.input} value={payNotes} onChange={e => setPayNotes(e.target.value)} />

              <p style={s.hint}>
                ⚡ QuickBooks Engine Rule: Debit selected Asset Account, Credit 1200 Accounts Receivable. Auto-generates official receipt.
              </p>

              <button style={s.primaryBtn} onClick={handlePay}>Post Payment & Generate Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* Official Payment Receipt Modal */}
      {payReceipt && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 520, border: '2px solid #10b981' }}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={22} color="#10b981" />
                <h3 style={s.modalTitle}>Official Payment Receipt</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setPayReceipt(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Receipt Number:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{payReceipt.receiptNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Amount Received:</span>
                <span style={{ fontWeight: 800, color: '#10b981', fontSize: 16 }}>{UGX(payReceipt.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Deposit Account:</span>
                <span style={{ fontWeight: 600 }}>{payReceipt.depositAccount?.name || 'Bank/Cash'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Method:</span>
                <span style={{ fontWeight: 600 }}>{payReceipt.method}</span>
              </div>
              {payReceipt.transactionRef && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Reference:</span>
                  <span style={{ fontFamily: 'monospace' }}>{payReceipt.transactionRef}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Double-Entry Journal:</span>
                <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>Balanced (Entry posted)</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button style={{ ...s.primaryBtn, flex: 1, backgroundColor: '#10b981' }} onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button style={{ ...s.primaryBtn, flex: 1, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => setPayReceipt(null)}>
                Done
              </button>
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
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'var(--transition)' },
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
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
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
