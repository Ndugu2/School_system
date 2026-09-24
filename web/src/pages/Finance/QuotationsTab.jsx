import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  ArrowRight,
  Clock,
  Printer,
  Calendar,
  Sparkles,
  Compass
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const CLASSES = ['Nursery', 'Baby', 'Middle', 'Top', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEAR = new Date().getFullYear();

export default function QuotationsTab({ readOnly = false }) {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [converting, setConverting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    classLevel: 'S1',
    term: 'Term 1',
    academicYear: YEAR,
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    lineItems: [
      { name: 'Tuition Fee (Term 1)', category: 'Tuition', amount: 950000, quantity: 1, total: 950000 },
      { name: 'Senior Class Tour & Field Excursion', category: 'Tour', amount: 150000, quantity: 1, total: 150000 }
    ],
    discounts: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const data = await api.get('/finance/quotations');
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const addLineItem = () => {
    setForm(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { name: '', category: 'Tour', amount: 0, quantity: 1, total: 0 }
      ]
    }));
  };

  const removeLineItem = (index) => {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const updateLineItem = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.lineItems];
      const item = { ...updated[index], [field]: value };
      if (field === 'amount' || field === 'quantity') {
        const amt = field === 'amount' ? Number(value) || 0 : item.amount;
        const qty = field === 'quantity' ? Number(value) || 1 : item.quantity;
        item.total = amt * qty;
      }
      updated[index] = item;
      return { ...prev, lineItems: updated };
    });
  };

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    if (!form.recipientName || form.lineItems.length === 0) {
      showToast('error', 'Please enter recipient name and at least one quote line item');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/finance/quotations', form);
      showToast('success', 'Fee Quotation created successfully!');
      setShowCreateModal(false);
      fetchQuotes();
    } catch (err) {
      showToast('error', err.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToInvoice = async (quote) => {
    if (!window.confirm(`Convert Quotation ${quote.quoteNumber} into an official billing Invoice? This will automatically debit Accounts Receivable (A/R) and credit revenue accounts in the double ledger.`)) {
      return;
    }

    setConverting(true);
    try {
      const res = await api.post(`/finance/quotations/${quote._id}/convert-to-invoice`);
      showToast('success', res.message || 'Converted to invoice!');
      fetchQuotes();
    } catch (err) {
      showToast('error', err.message || 'Failed to convert quote to invoice');
    } finally {
      setConverting(false);
    }
  };

  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter(item => {
      const matchQ =
        !q ||
        item.quoteNumber?.toLowerCase().includes(q) ||
        item.recipientName?.toLowerCase().includes(q) ||
        item.classLevel?.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || item.status === statusFilter;
      return matchQ && matchS;
    });
  }, [quotations, search, statusFilter]);

  const formSubtotal = form.lineItems.reduce((acc, i) => acc + (i.total || 0), 0);

  return (
    <div style={s.container}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981' }}>
          {toast.message}
        </div>
      )}

      {/* Header and Controls */}
      <div style={s.headerBar}>
        <div style={s.controlsGroup}>
          <div style={s.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              style={s.searchInput}
              placeholder="Search quotation #, parent or class..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            style={s.selectInput}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Quote Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="converted">Converted to Invoice</option>
            <option value="expired">Expired</option>
          </select>

          <button onClick={fetchQuotes} style={s.iconBtn} title="Refresh quotations">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {!readOnly && (
          <button onClick={() => setShowCreateModal(true)} style={s.addBtn}>
            <Plus size={15} />
            <span>Create Fee Quotation</span>
          </button>
        )}
      </div>

      {/* Quotations List */}
      {filteredQuotes.length === 0 ? (
        <div style={s.emptyBox}>
          <FileText size={36} color="#d8b257" />
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>No Fee Quotations Found</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, maxWidth: 400 }}>
            Generate pro-forma fee estimates for prospective parents, educational tours, or scholarship sponsors with one-click conversion to active invoices.
          </p>
          {!readOnly && (
            <button onClick={() => setShowCreateModal(true)} style={s.addBtn}>
              <Plus size={15} /> Create First Quotation
            </button>
          )}
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Recipient / Parent</th>
                <th>Class &amp; Term</th>
                <th>Items Included</th>
                <th style={{ textAlign: 'right' }}>Total (UGX)</th>
                <th>Expiry</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map(q => {
                const isConverted = q.status === 'converted';
                return (
                  <tr key={q._id} style={s.tableRow}>
                    <td style={{ fontWeight: 800, color: '#d8b257' }}>{q.quoteNumber}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{q.recipientName}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{q.recipientPhone || q.recipientEmail || 'Direct'}</div>
                    </td>
                    <td style={{ color: '#fff' }}>
                      {q.classLevel} • {q.term} ({q.academicYear})
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      {(q.lineItems || []).map(li => li.name).slice(0, 2).join(', ')}
                      {(q.lineItems || []).length > 2 ? ` +${q.lineItems.length - 2} more` : ''}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                      {UGX(q.totalAmount)}
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(q.expiryDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        style={{
                          ...s.statusBadge,
                          backgroundColor: isConverted ? 'rgba(52, 211, 153, 0.15)' : 'rgba(197, 155, 39, 0.15)',
                          color: isConverted ? '#34d399' : '#d8b257'
                        }}
                      >
                        {isConverted ? 'Converted to Invoice' : q.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => setSelectedQuote(q)}
                          style={s.actionBtn}
                          title="View / Print Quote"
                        >
                          View
                        </button>
                        {!isConverted && !readOnly && (
                          <button
                            onClick={() => handleConvertToInvoice(q)}
                            disabled={converting}
                            style={s.convertBtn}
                            title="Convert directly to Active Invoice"
                          >
                            <ArrowRight size={12} /> Convert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: CREATE QUOTATION ── */}
      {showCreateModal && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div style={{ ...s.modalBox, maxWidth: 640 }}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#d8b257" />
                <h3 style={s.modalTitle}>New Fee Quotation / Pro-Forma Estimate</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setShowCreateModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateQuote} style={s.modalBody}>
              <div style={s.formGrid}>
                <div style={s.formField}>
                  <label style={s.label}>Recipient / Parent Name *</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. Mr. Charles Kigozi (Parent)"
                    value={form.recipientName}
                    onChange={e => setForm({ ...form, recipientName: e.target.value })}
                    required
                  />
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Recipient Phone / WhatsApp</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. +256 772 123456"
                    value={form.recipientPhone}
                    onChange={e => setForm({ ...form, recipientPhone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={s.formField}>
                  <label style={s.label}>Class Level *</label>
                  <select
                    style={s.formInput}
                    value={form.classLevel}
                    onChange={e => setForm({ ...form, classLevel: e.target.value })}
                  >
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Academic Term *</label>
                  <select
                    style={s.formInput}
                    value={form.term}
                    onChange={e => setForm({ ...form, term: e.target.value })}
                  >
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Valid Until (Expiry) *</label>
                  <input
                    type="date"
                    style={s.formInput}
                    value={form.expiryDate}
                    onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div style={s.lineItemsWrap}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={s.label}>Quote Line Items (Tuition, Tours, Boarding, etc.)</label>
                  <button type="button" onClick={addLineItem} style={s.addItemBtn}>
                    <Plus size={13} /> Add Fee Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {form.lineItems.map((item, idx) => (
                    <div key={idx} style={s.itemRow}>
                      <input
                        style={{ ...s.formInput, flex: 2 }}
                        placeholder="Item name (e.g. S4 Geography Tour, Tuition)"
                        value={item.name}
                        onChange={e => updateLineItem(idx, 'name', e.target.value)}
                        required
                      />
                      <select
                        style={{ ...s.formInput, width: 120 }}
                        value={item.category}
                        onChange={e => updateLineItem(idx, 'category', e.target.value)}
                      >
                        <option value="Tuition">Tuition</option>
                        <option value="Tour">Tour/Trip</option>
                        <option value="Boarding">Boarding</option>
                        <option value="Uniform">Uniform</option>
                        <option value="Exam">Exam</option>
                        <option value="Other">Other</option>
                      </select>
                      <input
                        type="number"
                        style={{ ...s.formInput, width: 130, textAlign: 'right' }}
                        placeholder="UGX Amount"
                        value={item.amount}
                        onChange={e => updateLineItem(idx, 'amount', e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        style={s.delItemBtn}
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={s.totalBanner}>
                  <span>Total Quote Amount:</span>
                  <strong style={{ color: '#10b981', fontSize: 16 }}>{UGX(formSubtotal)}</strong>
                </div>
              </div>

              <div style={s.formField}>
                <label style={s.label}>Remarks / Payment Terms</label>
                <input
                  style={s.formInput}
                  placeholder="e.g. 50% required before beginning of term, balance cleared by midterm"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" disabled={submitting} style={s.submitBtn}>
                  {submitting ? 'Generating...' : 'Issue Fee Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW / PRINT QUOTATION ── */}
      {selectedQuote && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setSelectedQuote(null)}>
          <div style={{ ...s.modalBox, maxWidth: 580, backgroundColor: '#070c18' }}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#d8b257" />
                <h3 style={s.modalTitle}>{selectedQuote.quoteNumber} — Official Quotation</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setSelectedQuote(null)}><X size={16} /></button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: 16 }}>NDUGU ACADEMY</h4>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Official Pro-Forma Fee Quote</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#d8b257' }}>{selectedQuote.quoteNumber}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Date: {new Date(selectedQuote.date).toLocaleDateString()}</div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Prepared For:</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{selectedQuote.recipientName}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Target Class: <strong>{selectedQuote.classLevel}</strong> • {selectedQuote.term} ({selectedQuote.academicYear})
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#94a3b8' }}>Fee Item</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', color: '#94a3b8' }}>Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedQuote.lineItems || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 0', color: '#fff' }}>
                        <div>{item.name}</div>
                        <span style={{ fontSize: 11, color: '#d8b257' }}>[{item.category || 'Tuition'}]</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 700, color: '#fff' }}>
                        {UGX(item.total || item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#0d1527', borderRadius: 8 }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>Total Amount Due:</span>
                <strong style={{ fontSize: 18, color: '#10b981' }}>{UGX(selectedQuote.totalAmount)}</strong>
              </div>

              {selectedQuote.termsAndConditions && (
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                  {selectedQuote.termsAndConditions}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => window.print()}
                  style={{ ...s.cancelBtn, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer size={14} /> Print Quote
                </button>
                {selectedQuote.status !== 'converted' && !readOnly && (
                  <button
                    onClick={() => {
                      handleConvertToInvoice(selectedQuote);
                      setSelectedQuote(null);
                    }}
                    style={s.submitBtn}
                  >
                    Convert to Live Invoice
                  </button>
                )}
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
  headerBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  controlsGroup: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px', minWidth: 260, flex: 1 },
  searchInput: { border: 'none', background: 'none', outline: 'none', color: '#fff', fontSize: 13, width: '100%' },
  selectInput: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' },
  iconBtn: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer' },
  addBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#080e1a', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  emptyBox: { backgroundColor: '#0d1527', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10 },
  tableWrap: { overflowX: 'auto', backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' },
  tableRow: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' },
  actionBtn: { padding: '4px 10px', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  convertBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, backgroundColor: '#c59b27', border: 'none', color: '#080e1a', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(4,7,15,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalBox: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  modalTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  formField: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#070c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' },
  lineItemsWrap: { backgroundColor: '#070c18', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow: { display: 'flex', alignItems: 'center', gap: 8 },
  addItemBtn: { background: 'none', border: 'none', color: '#d8b257', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  delItemBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 },
  totalBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 4 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  submitBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#080e1a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
};
