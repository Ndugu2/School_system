import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Receipt, Plus, Search, Filter, CheckCircle, Clock, AlertCircle,
  Building, DollarSign, Calendar, RefreshCw, X, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const YEAR = new Date().getFullYear();
const YEARS = [YEAR, YEAR - 1, YEAR - 2];

export default function PayBillsTab({ readOnly = false }) {
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState(String(YEAR));

  // Enter Bill Modal
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [enterSaving, setEnterSaving] = useState(false);
  const [billForm, setBillForm] = useState({
    vendor: '',
    title: '',
    category: 'supplies',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    expenseAccountCode: '5020',
    description: '',
    academicYear: YEAR,
    term: 'Term 1'
  });

  // Pay Bill Modal
  const [payModal, setPayModal] = useState(null);
  const [paySaving, setPaySaving] = useState(false);
  const [payForm, setPayForm] = useState({
    paymentAmount: '',
    paidFromAccountCode: '1020',
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterYear) params.append('academicYear', filterYear);

      const [billsData, accData] = await Promise.all([
        api.get(`/finance/bills?${params}`),
        api.get('/finance/accounts')
      ]);

      setBills(billsData || []);
      setAccounts(accData.accounts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterYear]);

  const handleEnterBill = async (e) => {
    e.preventDefault();
    if (!billForm.vendor || !billForm.title || !billForm.amount) {
      return alert('Please fill in vendor, title, and amount');
    }
    setEnterSaving(true);
    try {
      const res = await api.post('/finance/bills', billForm);
      alert(`✅ ${res.message}`);
      setShowEnterModal(false);
      setBillForm({
        vendor: '',
        title: '',
        category: 'supplies',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        expenseAccountCode: '5020',
        description: '',
        academicYear: YEAR,
        term: 'Term 1'
      });
      fetchData();
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setEnterSaving(false);
    }
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    if (!payModal) return;
    setPaySaving(true);
    try {
      const res = await api.post(`/finance/bills/${payModal._id}/pay`, payForm);
      alert(`✅ ${res.message}`);
      setPayModal(null);
      fetchData();
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setPaySaving(false);
    }
  };

  const bankAccounts = accounts.filter(a =>
    a.type === 'Asset' && (a.subType === 'Bank Account' || a.subType === 'Cash and Cash Equivalents' || a.subType === 'Current Asset')
  );

  const expenseAccounts = accounts.filter(a => a.type === 'Expense');

  const filteredBills = bills.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.vendor?.toLowerCase().includes(q) ||
      b.title?.toLowerCase().includes(q) ||
      b.billNumber?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
    );
  });

  const totalPayables = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.balance ?? b.amount), 0);
  const totalPaid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={24} color="var(--primary)" />
            <h2 style={s.title}>QuickBooks Pay Bills & Accounts Payable</h2>
          </div>
          <p style={s.subtitle}>
            Enter vendor bills, track supplier payables (Account 2010), and settle disbursements from Stanbic, Centenary, or Cash Vault.
          </p>
        </div>
        {!readOnly && (
          <button style={s.primaryBtn} onClick={() => setShowEnterModal(true)}>
            <Plus size={16} /> + Enter Vendor Bill
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <span style={s.kpiLabel}>Outstanding Accounts Payable (2010)</span>
          <strong style={{ ...s.kpiVal, color: '#ef4444' }}>{UGX(totalPayables)}</strong>
          <span style={s.kpiSub}>Supplier liabilities pending settlement</span>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiLabel}>Paid Vendor Bills ({filterYear})</span>
          <strong style={{ ...s.kpiVal, color: '#10b981' }}>{UGX(totalPaid)}</strong>
          <span style={s.kpiSub}>Disbursed via bank transfer & cash</span>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiLabel}>Total Vendor Invoices</span>
          <strong style={{ ...s.kpiVal, color: 'var(--primary)' }}>{bills.length} bills</strong>
          <span style={s.kpiSub}>Suppliers, food, utilities, tour logistics</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} style={s.searchIcon} />
          <input
            style={s.searchInput}
            placeholder="Search vendor, bill #, title, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Bill Statuses</option>
          <option value="approved">Approved & Unpaid</option>
          <option value="partial">Partially Paid</option>
          <option value="paid">Fully Settled</option>
        </select>
        <select style={s.select} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All Academic Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button style={s.refreshBtn} onClick={fetchData} title="Refresh bills">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Bills Table */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.empty}>Loading Accounts Payable ledger...</div>
        ) : filteredBills.length === 0 ? (
          <div style={s.empty}>No vendor bills found. Click "+ Enter Vendor Bill" to record a supplier invoice.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Bill #</th>
                <th style={s.th}>Vendor / Supplier</th>
                <th style={s.th}>Bill Description</th>
                <th style={s.th}>Expense Account (Debit)</th>
                <th style={s.th}>Bill Date</th>
                <th style={s.th}>Due Date</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Total (UGX)</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Balance Due (UGX)</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => {
                const bal = bill.balance ?? bill.amount;
                const isOverdue = bal > 0 && bill.dueDate && new Date() > new Date(bill.dueDate);
                return (
                  <tr key={bill._id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                      {bill.billNumber || bill.referenceNumber || 'BILL'}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building size={14} color="var(--text-tertiary)" />
                        {bill.vendor || 'Vendor'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Category: {bill.category}</div>
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{bill.title}</div>
                      {bill.description && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{bill.description}</div>}
                    </td>
                    <td style={s.td}>
                      <span style={s.accountTag}>
                        {bill.expenseAccountCode || '5040'} · {bill.expenseAccountName || 'Expense'}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(bill.date).toLocaleDateString()}
                    </td>
                    <td style={{ ...s.td, fontSize: 12, whiteSpace: 'nowrap', color: isOverdue ? '#ef4444' : 'var(--text-secondary)', fontWeight: isOverdue ? 700 : 500 }}>
                      {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '—'}
                      {isOverdue && <span style={{ display: 'block', fontSize: 10, color: '#ef4444' }}>Overdue</span>}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>
                      {UGX(bill.amount)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 800, color: bal > 0 ? '#ef4444' : '#10b981' }}>
                      {UGX(bal)}
                    </td>
                    <td style={s.td}>
                      {bill.status === 'paid' && <span style={s.statusPaid}>Paid</span>}
                      {bill.status === 'partial' && <span style={s.statusPartial}>Partial</span>}
                      {bill.status !== 'paid' && bill.status !== 'partial' && <span style={s.statusUnpaid}>Unpaid</span>}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {!readOnly && bill.status !== 'paid' && (
                        <button
                          style={s.payBtn}
                          onClick={() => {
                            setPayModal(bill);
                            setPayForm({
                              paymentAmount: String(bal),
                              paidFromAccountCode: '1020',
                              paymentMethod: 'Bank Transfer',
                              referenceNumber: '',
                              paymentDate: new Date().toISOString().split('T')[0],
                              notes: `Settlement for ${bill.billNumber || bill.title}`
                            });
                          }}
                        >
                          <DollarSign size={13} style={{ marginRight: 2 }} /> Pay Bill
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Enter Bill Modal */}
      {showEnterModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} color="var(--primary)" />
                <h3 style={s.modalTitle}>Enter Vendor Bill (Accounts Payable)</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setShowEnterModal(false)}>✕</button>
            </div>

            <form onSubmit={handleEnterBill} style={s.form}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Vendor / Supplier Name</label>
                  <input
                    required
                    style={s.input}
                    placeholder="e.g. Kalerwe Food Wholesalers Ltd"
                    value={billForm.vendor}
                    onChange={e => setBillForm({ ...billForm, vendor: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Bill Title / Subject</label>
                  <input
                    required
                    style={s.input}
                    placeholder="e.g. Rice, Posho & Cooking Oil Supplies"
                    value={billForm.title}
                    onChange={e => setBillForm({ ...billForm, title: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Bill Amount (UGX)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    style={s.input}
                    placeholder="UGX"
                    value={billForm.amount}
                    onChange={e => setBillForm({ ...billForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Expense Account (Debit in Ledger)</label>
                  <select
                    style={s.input}
                    value={billForm.expenseAccountCode}
                    onChange={e => setBillForm({ ...billForm, expenseAccountCode: e.target.value })}
                  >
                    {expenseAccounts.map(a => (
                      <option key={a.code} value={a.code}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Bill Category</label>
                  <select
                    style={s.input}
                    value={billForm.category}
                    onChange={e => setBillForm({ ...billForm, category: e.target.value })}
                  >
                    {['supplies', 'utilities', 'maintenance', 'transport', 'tours', 'welfare', 'equipment', 'salaries', 'other'].map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Bill Date</label>
                  <input
                    type="date"
                    required
                    style={s.input}
                    value={billForm.date}
                    onChange={e => setBillForm({ ...billForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Payment Due Date</label>
                  <input
                    type="date"
                    required
                    style={s.input}
                    value={billForm.dueDate}
                    onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={s.label}>Description / Invoice Memo</label>
                <input
                  style={s.input}
                  placeholder="e.g. Term 1 hostel provisions, 50 bags of maize flour"
                  value={billForm.description}
                  onChange={e => setBillForm({ ...billForm, description: e.target.value })}
                />
              </div>

              <div style={s.ledgerNotice}>
                ⚡ <strong>QuickBooks Double-Entry Posting:</strong> Debits selected Expense Account (e.g. 5020 Food Supplies) & Credits <strong>Account 2010 (Accounts Payable - Suppliers)</strong>. Bill will be recorded in books as an approved liability.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" style={{ ...s.primaryBtn, flex: 1 }} disabled={enterSaving}>
                  {enterSaving ? 'Posting Bill...' : 'Record Bill & Post to Accounts Payable'}
                </button>
                <button type="button" style={{ ...s.primaryBtn, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => setShowEnterModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {payModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={20} color="#10b981" />
                <h3 style={s.modalTitle}>Pay Vendor Bill — {payModal.billNumber || payModal.title}</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setPayModal(null)}>✕</button>
            </div>

            <form onSubmit={handlePayBill} style={s.form}>
              <div style={s.paySummaryBox}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Vendor</span>
                  <strong style={{ display: 'block', fontSize: 14 }}>{payModal.vendor}</strong>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Amount</span>
                  <strong style={{ display: 'block', fontSize: 14 }}>{UGX(payModal.amount)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Outstanding Payable</span>
                  <strong style={{ display: 'block', fontSize: 16, color: '#ef4444' }}>{UGX(payModal.balance ?? payModal.amount)}</strong>
                </div>
              </div>

              <div>
                <label style={s.label}>Payment Amount (UGX)</label>
                <input
                  type="number"
                  min="1"
                  max={payModal.balance ?? payModal.amount}
                  required
                  style={s.input}
                  value={payForm.paymentAmount}
                  onChange={e => setPayForm({ ...payForm, paymentAmount: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Disburse From Account (Credit in Ledger)</label>
                  <select
                    style={s.input}
                    value={payForm.paidFromAccountCode}
                    onChange={e => setPayForm({ ...payForm, paidFromAccountCode: e.target.value })}
                  >
                    {bankAccounts.map(a => (
                      <option key={a.code} value={a.code}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Payment Method</label>
                  <select
                    style={s.input}
                    value={payForm.paymentMethod}
                    onChange={e => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  >
                    {['Bank Transfer', 'Cheque', 'Cash', 'MTN Mobile Money', 'Airtel Money'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Reference / Cheque #</label>
                  <input
                    style={s.input}
                    placeholder="e.g. CHQ-8921 or TXN-4421"
                    value={payForm.referenceNumber}
                    onChange={e => setPayForm({ ...payForm, referenceNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Payment Date</label>
                  <input
                    type="date"
                    required
                    style={s.input}
                    value={payForm.paymentDate}
                    onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={s.ledgerNotice}>
                ⚡ <strong>QuickBooks Double-Entry Posting:</strong> Debits <strong>Account 2010 (Accounts Payable)</strong> and Credits selected Bank/Cash Account (e.g. 1020 Stanbic Bank). Clears the supplier liability from your balance sheet.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" style={{ ...s.primaryBtn, flex: 1, backgroundColor: '#10b981' }} disabled={paySaving}>
                  {paySaving ? 'Executing Disbursement...' : `Confirm Payment of ${UGX(payForm.paymentAmount)}`}
                </button>
                <button type="button" style={{ ...s.primaryBtn, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => setPayModal(null)}>
                  Cancel
                </button>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },
  kpiCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: 'var(--shadow-sm)' },
  kpiLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' },
  kpiVal: { fontSize: 20, fontWeight: 800 },
  kpiSub: { fontSize: 11, color: 'var(--text-tertiary)' },
  filterBar: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 240 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' },
  searchInput: { width: '100%', padding: '10px 12px 10px 36px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  select: { padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tableWrap: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 950 },
  thead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  th: { padding: '12px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 16px', fontSize: 13, color: 'var(--text-primary)' },
  accountTag: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  statusPaid: { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, backgroundColor: '#d1fae5', color: '#047857' },
  statusPartial: { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, backgroundColor: '#fef3c7', color: '#b45309' },
  statusUnpaid: { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, backgroundColor: '#fee2e2', color: '#b91c1c' },
  payBtn: { display: 'inline-flex', alignItems: 'center', backgroundColor: '#d1fae5', color: '#047857', border: 'none', padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  empty: { padding: 60, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 26, width: '100%', maxWidth: 580, boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-tertiary)' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 },
  input: { width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  ledgerNotice: { backgroundColor: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 },
  paySummaryBox: { display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-tertiary)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }
};
