import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  Landmark,
  Plus,
  Search,
  RefreshCw,
  FolderTree,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  WalletCards,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Building2,
  Receipt
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;

const ACCOUNT_TYPE_CONFIG = {
  Asset: { label: 'Assets (1000s)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: WalletCards, normalBalance: 'Debit' },
  Liability: { label: 'Liabilities (2000s)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: Scale, normalBalance: 'Credit' },
  Equity: { label: 'Equity (3000s)', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', icon: Building2, normalBalance: 'Credit' },
  Income: { label: 'Revenue & Income (4000s)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: ArrowUpRight, normalBalance: 'Credit' },
  Expense: { label: 'Operating Expenses (5000s)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: ArrowDownRight, normalBalance: 'Debit' }
};

export default function ChartOfAccountsTab({ readOnly = false }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'Asset',
    subType: 'Bank Account',
    description: '',
    openingBalance: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/finance/accounts');
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      showToast('error', err.message || 'Error loading Chart of Accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openLedgerModal = async (account) => {
    setSelectedLedgerAccount(account);
    setLedgerLoading(true);
    try {
      const data = await api.get(`/finance/accounts/${account.code}/ledger`);
      setLedgerData(data);
    } catch (err) {
      showToast('error', err.message || 'Error loading account ledger history');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      showToast('error', 'Please enter account code and name');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/finance/accounts', form);
      showToast('success', `Account ${form.code} - ${form.name} created successfully!`);
      setShowAddModal(false);
      setForm({
        code: '',
        name: '',
        type: 'Asset',
        subType: 'Bank Account',
        description: '',
        openingBalance: 0
      });
      fetchAccounts();
    } catch (err) {
      showToast('error', err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  // Group accounts by Type
  const groupedAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = accounts.filter(acc => {
      const matchQ = !q || acc.code.toLowerCase().includes(q) || acc.name.toLowerCase().includes(q) || acc.subType?.toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || acc.type === typeFilter;
      return matchQ && matchT;
    });

    const groups = {
      Asset: [],
      Liability: [],
      Equity: [],
      Income: [],
      Expense: []
    };

    filtered.forEach(acc => {
      if (groups[acc.type]) groups[acc.type].push(acc);
    });

    return groups;
  }, [accounts, search, typeFilter]);

  // Totals
  const totalAssets = useMemo(() => accounts.filter(a => a.type === 'Asset').reduce((acc, a) => acc + (a.currentBalance || 0), 0), [accounts]);
  const totalLiabilities = useMemo(() => accounts.filter(a => a.type === 'Liability').reduce((acc, a) => acc + (a.currentBalance || 0), 0), [accounts]);
  const totalIncome = useMemo(() => accounts.filter(a => a.type === 'Income').reduce((acc, a) => acc + (a.currentBalance || 0), 0), [accounts]);
  const totalExpenses = useMemo(() => accounts.filter(a => a.type === 'Expense').reduce((acc, a) => acc + (a.currentBalance || 0), 0), [accounts]);

  return (
    <div style={s.container}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981' }}>
          {toast.message}
        </div>
      )}

      {/* Summary Row */}
      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <span style={s.summaryLbl}>Total Assets</span>
          <span style={{ ...s.summaryVal, color: '#3b82f6' }}>{UGX(totalAssets)}</span>
          <span style={s.summarySub}>Cash, Bank, A/R &amp; Equipment</span>
        </div>
        <div style={s.summaryCard}>
          <span style={s.summaryLbl}>Total Liabilities</span>
          <span style={{ ...s.summaryVal, color: '#f59e0b' }}>{UGX(totalLiabilities)}</span>
          <span style={s.summarySub}>A/P, Payroll &amp; Prepaid Fees</span>
        </div>
        <div style={s.summaryCard}>
          <span style={s.summaryLbl}>Total Revenue</span>
          <span style={{ ...s.summaryVal, color: '#10b981' }}>{UGX(totalIncome)}</span>
          <span style={s.summarySub}>Tuition, Tours &amp; Boarding</span>
        </div>
        <div style={s.summaryCard}>
          <span style={s.summaryLbl}>Total Operating Expenses</span>
          <span style={{ ...s.summaryVal, color: '#ef4444' }}>{UGX(totalExpenses)}</span>
          <span style={s.summarySub}>Salaries, Food, Utilities &amp; Tours</span>
        </div>
      </div>

      {/* Header and Controls */}
      <div style={s.headerBar}>
        <div style={s.controlsGroup}>
          <div style={s.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              style={s.searchInput}
              placeholder="Search account code, name, or sub-type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            style={s.selectInput}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">All Account Categories</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Income">Revenue / Income</option>
            <option value="Expense">Expenses</option>
          </select>

          <button onClick={fetchAccounts} style={s.iconBtn} title="Refresh accounts">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {!readOnly && (
          <button onClick={() => setShowAddModal(true)} style={s.addBtn}>
            <Plus size={15} />
            <span>Add New Account</span>
          </button>
        )}
      </div>

      {/* Chart of Accounts Categorized Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(ACCOUNT_TYPE_CONFIG).map(([typeKey, cfg]) => {
          const list = groupedAccounts[typeKey] || [];
          if (list.length === 0 && typeFilter !== 'all' && typeFilter !== typeKey) return null;
          const Icon = cfg.icon;

          return (
            <div key={typeKey} style={s.accountSection}>
              <div style={s.sectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ ...s.sectionIconWrap, backgroundColor: cfg.bg, color: cfg.color }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 style={s.sectionTitle}>{cfg.label}</h3>
                    <span style={s.sectionMeta}>Normal Balance: {cfg.normalBalance}</span>
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
                  {UGX(list.reduce((acc, a) => acc + (a.currentBalance || 0), 0))}
                </span>
              </div>

              {list.length === 0 ? (
                <div style={s.emptyRow}>No accounts found in this category matching your search.</div>
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Account Code</th>
                        <th>Account Name</th>
                        <th>Sub-Type</th>
                        <th style={{ textAlign: 'right' }}>Total Debit</th>
                        <th style={{ textAlign: 'right' }}>Total Credit</th>
                        <th style={{ textAlign: 'right' }}>Current Balance</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Ledger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(acc => (
                        <tr key={acc.code} style={s.tableRow}>
                          <td style={{ fontWeight: 800, color: '#fff' }}>{acc.code}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{acc.name}</div>
                            {acc.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{acc.description}</div>}
                          </td>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{acc.subType || 'General'}</td>
                          <td style={{ textAlign: 'right', color: '#94a3b8' }}>{UGX(acc.totalDebit || 0)}</td>
                          <td style={{ textAlign: 'right', color: '#94a3b8' }}>{UGX(acc.totalCredit || 0)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: acc.currentBalance < 0 ? '#ef4444' : cfg.color }}>
                            {UGX(acc.currentBalance || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => openLedgerModal(acc)}
                              style={s.ledgerBtn}
                              title="View General Ledger Transactions"
                            >
                              <FileText size={13} />
                              <span>Card</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MODAL: ADD ACCOUNT ── */}
      {showAddModal && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Add Account to Chart of Accounts</h3>
              <button style={s.closeBtn} onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateAccount} style={s.modalBody}>
              <div style={s.formGrid}>
                <div style={s.formField}>
                  <label style={s.label}>Account Code *</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. 1025, 4035, 5025"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    required
                  />
                </div>

                <div style={s.formField}>
                  <label style={s.label}>Account Category *</label>
                  <select
                    style={s.formInput}
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="Asset">Asset (1000s)</option>
                    <option value="Liability">Liability (2000s)</option>
                    <option value="Equity">Equity (3000s)</option>
                    <option value="Income">Revenue / Income (4000s)</option>
                    <option value="Expense">Expense (5000s)</option>
                  </select>
                </div>
              </div>

              <div style={s.formField}>
                <label style={s.label}>Account Name *</label>
                <input
                  style={s.formInput}
                  placeholder="e.g. Senior Four Geography Jinja Tour Fund"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div style={s.formGrid}>
                <div style={s.formField}>
                  <label style={s.label}>Sub-Type / Detail Type</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. Bank Account, Activities Revenue, Payroll Expense"
                    value={form.subType}
                    onChange={e => setForm({ ...form, subType: e.target.value })}
                  />
                </div>

                <div style={s.formField}>
                  <label style={s.label}>Opening Balance (UGX)</label>
                  <input
                    type="number"
                    style={s.formInput}
                    value={form.openingBalance}
                    onChange={e => setForm({ ...form, openingBalance: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={s.formField}>
                <label style={s.label}>Description (Optional)</label>
                <input
                  style={s.formInput}
                  placeholder="Purpose of this account..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" disabled={submitting} style={s.submitBtn}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: GENERAL LEDGER CARD VIEW ── */}
      {selectedLedgerAccount && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setSelectedLedgerAccount(null)}>
          <div style={{ ...s.modalBox, maxWidth: 780 }}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>General Ledger Card: {selectedLedgerAccount.code} - {selectedLedgerAccount.name}</h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Category: <strong>{selectedLedgerAccount.type}</strong> ({selectedLedgerAccount.subType})
                </span>
              </div>
              <button style={s.closeBtn} onClick={() => setSelectedLedgerAccount(null)}><X size={16} /></button>
            </div>

            <div style={{ padding: '16px 20px', maxHeight: '500px', overflowY: 'auto' }}>
              {ledgerLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <RefreshCw size={20} className="animate-spin" /> Loading transactions...
                </div>
              ) : !ledgerData || ledgerData.transactions.length === 0 ? (
                <div style={s.emptyRow}>No journal transactions recorded for this account yet.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Entry #</th>
                      <th>Description</th>
                      <th>Ref</th>
                      <th style={{ textAlign: 'right' }}>Debit (UGX)</th>
                      <th style={{ textAlign: 'right' }}>Credit (UGX)</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.transactions.map((t, idx) => (
                      <tr key={idx} style={s.tableRow}>
                        <td style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td style={{ fontWeight: 700, color: '#d8b257', whiteSpace: 'nowrap' }}>{t.entryNumber}</td>
                        <td style={{ color: '#fff', fontSize: 12.5 }}>{t.description}</td>
                        <td style={{ color: '#94a3b8', fontSize: 11 }}>{t.reference || '—'}</td>
                        <td style={{ textAlign: 'right', color: t.debit > 0 ? '#60a5fa' : '#64748b' }}>
                          {t.debit > 0 ? UGX(t.debit) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', color: t.credit > 0 ? '#34d399' : '#64748b' }}>
                          {t.credit > 0 ? UGX(t.credit) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#fff' }}>
                          {UGX(t.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 },
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
  addBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#080e1a', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  accountSection: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' },
  sectionMeta: { fontSize: 11, color: '#64748b' },
  emptyRow: { padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12.5 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' },
  tableRow: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  ledgerBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: '#d8b257', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(4,7,15,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalBox: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  modalTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  formField: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#070c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  submitBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#080e1a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
};
