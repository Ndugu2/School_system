import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  Calendar,
  Landmark,
  FileText,
  User,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'MTN Mobile Money', 'Airtel Money', 'Cheque', 'POS / Card', 'Other'];

export default function PaymentsTab({ readOnly = false, onOpenStatement }) {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [depositAccounts, setDepositAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modals
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Form State
  const [form, setForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'Bank Transfer',
    depositAccount: '1020',
    transactionReference: '',
    payerName: '',
    payerPhone: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pmts, invs, accs] = await Promise.all([
        api.get('/finance/payments'),
        api.get('/finance/invoices?status=unpaid,partial&limit=150'),
        api.get('/finance/accounts')
      ]);

      setPayments(Array.isArray(pmts) ? pmts : []);
      setInvoices(Array.isArray(invs.invoices) ? invs.invoices : (Array.isArray(invs) ? invs : []));
      
      // Filter asset accounts that can receive funds (Bank/Cash)
      const assetAccs = (Array.isArray(accs) ? accs : []).filter(a => a.type === 'Asset');
      setDepositAccounts(assetAccs.length > 0 ? assetAccs : [
        { code: '1020', name: 'Stanbic Bank Main Operating' },
        { code: '1010', name: 'Cash on Hand (Vault)' },
        { code: '1040', name: 'MTN & Airtel Mobile Money Clearing' }
      ]);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Error loading payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedInvoice = useMemo(() => {
    return invoices.find(inv => inv._id === form.invoiceId);
  }, [invoices, form.invoiceId]);

  const handleInvoiceChange = (invId) => {
    const inv = invoices.find(i => i._id === invId);
    setForm(prev => ({
      ...prev,
      invoiceId: invId,
      amount: inv ? inv.balance : '',
      payerName: inv?.student?.user?.name || ''
    }));
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    if (!form.invoiceId || !form.amount || Number(form.amount) <= 0) {
      showToast('error', 'Please select an invoice and enter a valid payment amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/finance/payments', form);
      showToast('success', res.message || 'Payment received and journal posted!');
      setShowReceiveModal(false);
      setSelectedReceipt(res.payment);
      loadData();
    } catch (err) {
      showToast('error', err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(p => {
      const matchQ =
        !q ||
        p.paymentNumber?.toLowerCase().includes(q) ||
        p.invoiceNumber?.toLowerCase().includes(q) ||
        p.studentName?.toLowerCase().includes(q) ||
        p.transactionReference?.toLowerCase().includes(q);
      const matchM = methodFilter === 'all' || p.paymentMethod === methodFilter;
      return matchQ && matchM;
    });
  }, [payments, search, methodFilter]);

  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [payments]);

  return (
    <div style={s.container}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981' }}>
          {toast.message}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <span style={s.summaryLbl}>Total Payments Collected</span>
          <span style={{ ...s.summaryVal, color: '#10b981' }}>{UGX(totalCollected)}</span>
          <span style={s.summarySub}>{payments.length} Transaction Receipts</span>
        </div>
        <div style={s.summaryCard}>
          <span style={s.summaryLbl}>Pending Uncollected A/R</span>
          <span style={{ ...s.summaryVal, color: '#f59e0b' }}>
            {UGX(invoices.reduce((acc, inv) => acc + (inv.balance || 0), 0))}
          </span>
          <span style={s.summarySub}>{invoices.length} Invoices with Open Balances</span>
        </div>
        <div style={s.summaryCard}>
          <span style={s.summaryLbl}>Primary Deposit Account</span>
          <span style={{ ...s.summaryVal, color: '#3b82f6', fontSize: 16 }}>
            Stanbic Bank (1020)
          </span>
          <span style={s.summarySub}>Auto-reconciles in Double Ledger</span>
        </div>
      </div>

      {/* Header and Controls */}
      <div style={s.headerBar}>
        <div style={s.controlsGroup}>
          <div style={s.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              style={s.searchInput}
              placeholder="Search receipt #, invoice, student, or bank reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            style={s.selectInput}
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
          >
            <option value="all">All Payment Methods</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <button onClick={loadData} style={s.iconBtn} title="Refresh payments">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {!readOnly && (
          <button onClick={() => setShowReceiveModal(true)} style={s.receiveBtn}>
            <Plus size={15} />
            <span>Receive Payment</span>
          </button>
        )}
      </div>

      {/* Payments List Table */}
      {filteredPayments.length === 0 ? (
        <div style={s.emptyBox}>
          <CreditCard size={36} color="#d8b257" />
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>No Payment Records Found</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, maxWidth: 420 }}>
            Use the "Receive Payment" action to record student fee deposits, mobile money payments, or bank wires against pending invoices.
          </p>
          {!readOnly && (
            <button onClick={() => setShowReceiveModal(true)} style={s.receiveBtn}>
              <Plus size={15} /> Receive First Payment
            </button>
          )}
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Payment Date</th>
                <th>Student / Payer</th>
                <th>Invoice Ref</th>
                <th>Method</th>
                <th>Deposit Account</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
                <th style={{ textAlign: 'center' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => (
                <tr key={p._id} style={s.tableRow}>
                  <td style={{ fontWeight: 800, color: '#d8b257' }}>{p.paymentNumber}</td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{p.studentName}</div>
                    {p.transactionReference && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Ref: {p.transactionReference}</span>
                    )}
                  </td>
                  <td style={{ color: '#60a5fa', fontWeight: 600 }}>{p.invoiceNumber}</td>
                  <td>
                    <span style={s.methodPill}>{p.paymentMethod}</span>
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>
                    {p.depositAccountName || p.depositAccount}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                    {UGX(p.amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedReceipt(p)}
                      style={s.receiptBtn}
                      title="Print Official Payment Receipt"
                    >
                      <Printer size={13} />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: RECEIVE PAYMENT ── */}
      {showReceiveModal && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setShowReceiveModal(false)}>
          <div style={{ ...s.modalBox, maxWidth: 560 }}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={18} color="#d8b257" />
                <h3 style={s.modalTitle}>Receive Customer / Student Payment</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setShowReceiveModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleReceivePayment} style={s.modalBody}>
              {/* Invoice Selection */}
              <div style={s.formField}>
                <label style={s.label}>Select Outstanding Invoice *</label>
                <select
                  style={s.formInput}
                  value={form.invoiceId}
                  onChange={e => handleInvoiceChange(e.target.value)}
                  required
                >
                  <option value="">-- Choose Invoice with Open Balance --</option>
                  {invoices.map(inv => (
                    <option key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} — {inv.student?.user?.name || inv.studentId} ({inv.classLevel}) • Balance: {UGX(inv.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <div style={s.invoiceBanner}>
                  <div>
                    <strong>{selectedInvoice.invoiceNumber}</strong>: {selectedInvoice.student?.user?.name || selectedInvoice.studentId}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Total: {UGX(selectedInvoice.totalAmount)} • Paid: {UGX(selectedInvoice.paidAmount)} • Balance Due: <strong style={{ color: '#ef4444' }}>{UGX(selectedInvoice.balance)}</strong>
                  </div>
                </div>
              )}

              {/* Amount and Date */}
              <div style={s.formGrid}>
                <div style={s.formField}>
                  <label style={s.label}>Payment Amount (UGX) *</label>
                  <input
                    type="number"
                    style={{ ...s.formInput, fontWeight: 700, color: '#10b981' }}
                    placeholder="Enter amount"
                    value={form.amount}
                    max={selectedInvoice ? selectedInvoice.balance : undefined}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>

                <div style={s.formField}>
                  <label style={s.label}>Payment Date *</label>
                  <input
                    type="date"
                    style={s.formInput}
                    value={form.paymentDate}
                    onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Method and Deposit Account */}
              <div style={s.formGrid}>
                <div style={s.formField}>
                  <label style={s.label}>Payment Method *</label>
                  <select
                    style={s.formInput}
                    value={form.paymentMethod}
                    onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div style={s.formField}>
                  <label style={s.label}>Deposit To Account (Double Ledger) *</label>
                  <select
                    style={s.formInput}
                    value={form.depositAccount}
                    onChange={e => setForm({ ...form, depositAccount: e.target.value })}
                  >
                    {depositAccounts.map(acc => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transaction Reference & Payer Name */}
              <div style={s.formGrid}>
                <div style={s.formField}>
                  <label style={s.label}>Bank Slip / MoMo TxID Reference</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. STB-998822, MTN-091823"
                    value={form.transactionReference}
                    onChange={e => setForm({ ...form, transactionReference: e.target.value })}
                  />
                </div>

                <div style={s.formField}>
                  <label style={s.label}>Payer Name</label>
                  <input
                    style={s.formInput}
                    placeholder="Parent / Sponsor name"
                    value={form.payerName}
                    onChange={e => setForm({ ...form, payerName: e.target.value })}
                  />
                </div>
              </div>

              <div style={s.formField}>
                <label style={s.label}>Remarks / Memo</label>
                <input
                  style={s.formInput}
                  placeholder="e.g. Cleared 50% tuition deposit for Term 1"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowReceiveModal(false)}>Cancel</button>
                <button type="submit" disabled={submitting} style={s.submitBtn}>
                  {submitting ? 'Recording...' : 'Receive & Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: OFFICIAL PAYMENT RECEIPT ── */}
      {selectedReceipt && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setSelectedReceipt(null)}>
          <div style={{ ...s.modalBox, maxWidth: 520, backgroundColor: '#070c18' }}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#34d399" />
                <h3 style={s.modalTitle}>Official School Fee Receipt</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setSelectedReceipt(null)}><X size={16} /></button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>NDUGU ACADEMY</h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>P.O. Box 7062, Kampala, Uganda • Official Receipt</span>
                <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: '#d8b257' }}>
                  {selectedReceipt.paymentNumber}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>STUDENT / PAYER:</span>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{selectedReceipt.studentName}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>ID: {selectedReceipt.studentId || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>PAYMENT DATE:</span>
                  <div style={{ color: '#fff' }}>{new Date(selectedReceipt.paymentDate).toLocaleDateString()}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Invoice: {selectedReceipt.invoiceNumber}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#0d1527', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#94a3b8' }}>
                  <span>Payment Method:</span>
                  <strong style={{ color: '#fff' }}>{selectedReceipt.paymentMethod}</strong>
                </div>
                {selectedReceipt.transactionReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#94a3b8' }}>
                    <span>Reference / Slip:</span>
                    <strong style={{ color: '#fff' }}>{selectedReceipt.transactionReference}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#94a3b8' }}>
                  <span>Deposit Account:</span>
                  <strong style={{ color: '#fff' }}>{selectedReceipt.depositAccountName || selectedReceipt.depositAccount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                  <span style={{ fontWeight: 800, color: '#fff' }}>AMOUNT RECEIVED:</span>
                  <strong style={{ fontSize: 18, color: '#10b981' }}>{UGX(selectedReceipt.amount)}</strong>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                Thank you for your payment. This receipt is digitally generated by Ndugu Academy Double Ledger Accounting Engine.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => window.print()}
                  style={{ ...s.submitBtn, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  toast: { padding: '10px 16px', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  summaryCard: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  summaryLbl: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  summaryVal: { fontSize: 20, fontWeight: 800, lineHeight: 1.2 },
  summarySub: { fontSize: 11, color: '#64748b' },
  headerBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  controlsGroup: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px', minWidth: 260, flex: 1 },
  searchInput: { border: 'none', background: 'none', outline: 'none', color: '#fff', fontSize: 13, width: '100%' },
  selectInput: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' },
  iconBtn: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer' },
  receiveBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#080e1a', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  emptyBox: { backgroundColor: '#0d1527', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10 },
  tableWrap: { overflowX: 'auto', backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' },
  tableRow: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  methodPill: { padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', fontSize: 11, color: '#fff' },
  receiptBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: '#d8b257', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(4,7,15,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalBox: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  modalTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  invoiceBanner: { backgroundColor: 'rgba(197, 155, 39, 0.1)', border: '1px solid rgba(197, 155, 39, 0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#fff' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  formField: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#070c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  submitBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#080e1a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
};
