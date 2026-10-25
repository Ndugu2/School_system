import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Sparkles,
  Calendar,
  Landmark,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const ALL_CLASSES = ['Nursery', 'Baby', 'Middle', 'Top', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEAR = new Date().getFullYear();

const DEFAULT_ACCOUNT_MAPPING = {
  tuition: '4010',
  development: '4080',
  functional: '4100',
  boarding: '4020',
  transport: '4070',
  exam: '4060',
  registration: '4040'
};

const CORE_FEE_ROWS = [
  { amountKey: 'tuitionFee', accountKey: 'tuition', label: 'Tuition Fee', required: true },
  { amountKey: 'developmentFee', accountKey: 'development', label: 'Development Levy' },
  { amountKey: 'functionalFee', accountKey: 'functional', label: 'Functional / Activities Fee' },
  { amountKey: 'examFee', accountKey: 'exam', label: 'Examination & UNEB Fee' },
  { amountKey: 'registrationFee', accountKey: 'registration', label: 'Registration Fee' },
  { amountKey: 'transportFee', accountKey: 'transport', label: 'Transport Fee' },
  { amountKey: 'boardingFee', accountKey: 'boarding', label: 'Boarding / Hostel Accommodation' }
];

// Matches the published 2026 fee table. Used as a convenience preset in the
// editor; the actual source of truth remains the saved fee structure records.
const CLASS_PRESETS = {
  S1: {
    tuitionFee: 500000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 20000,
    registrationFee: 0,
    transportFee: 0,
    boardingFee: 670000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S2: {
    tuitionFee: 500000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 20000,
    registrationFee: 0,
    transportFee: 0,
    boardingFee: 670000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S3: {
    tuitionFee: 540000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 40000,
    registrationFee: 0,
    transportFee: 0,
    boardingFee: 710000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S4: {
    tuitionFee: 540000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 40000,
    registrationFee: 0,
    transportFee: 0,
    boardingFee: 710000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S5: {
    tuitionFee: 600000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 50000,
    registrationFee: 0,
    transportFee: 0,
    boardingFee: 730000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 100000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 20000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S6: {
    tuitionFee: 620000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 60000,
    registrationFee: 0,
    transportFee: 0,
    boardingFee: 760000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 100000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  }
};

const normalizeTerm = (value) => {
  if (!value) return '';
  const key = String(value).trim().toUpperCase().replace(/\s+/g, ' ');
  const aliases = {
    'TERM 1': 'Term 1', 'TERM I': 'Term 1', 'TERM ONE': 'Term 1', '1': 'Term 1',
    'TERM 2': 'Term 2', 'TERM II': 'Term 2', 'TERM TWO': 'Term 2', '2': 'Term 2',
    'TERM 3': 'Term 3', 'TERM III': 'Term 3', 'TERM THREE': 'Term 3', '3': 'Term 3'
  };
  return aliases[key] || '';
};

const blankForm = (term, year) => ({
  classLevel: 'S1',
  term,
  academicYear: year,
  tuitionFee: 0,
  developmentFee: 0,
  functionalFee: 0,
  boardingFee: 0,
  transportFee: 0,
  registrationFee: 0,
  examFee: 0,
  accountMapping: { ...DEFAULT_ACCOUNT_MAPPING },
  otherFees: [],
  notes: ''
});

export default function FeeStructureTab({ readOnly = false }) {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('Term 3');
  const [selectedYear, setSelectedYear] = useState(YEAR);

  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form State
  const [form, setForm] = useState(() => blankForm('Term 3', YEAR));
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchIncomeAccounts = async () => {
    setAccountsLoading(true);
    try {
      const data = await api.get('/finance/accounts');
      const list = Array.isArray(data) ? data : (data.accounts || []);
      setIncomeAccounts(
        list
          .filter(account => account.type === 'Income')
          .sort((a, b) => String(a.code).localeCompare(String(b.code)))
      );
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Could not load revenue accounts from the Chart of Accounts');
    } finally {
      setAccountsLoading(false);
    }
  };

  const loadStructures = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/finance/fee-structures?academicYear=${selectedYear}&term=${encodeURIComponent(selectedTerm)}`);
      setStructures(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Error loading fee structures');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentTerm = async () => {
    try {
      const res = await api.get('/academic-years');
      const list = Array.isArray(res) ? res : (res.academicYears || []);
      const active = list.find(year => year.isActive) || list[0];
      if (!active) return;
      const current = active.terms?.find(term => term.isCurrent)
        || active.terms?.find(term => term.isActive)
        || active.terms?.[0];
      const term = normalizeTerm(current?.name);
      if (term) setSelectedTerm(term);
      if (active.year) setSelectedYear(Number(active.year));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncomeAccounts();
    loadCurrentTerm();
  }, []);

  useEffect(() => {
    loadStructures();
  }, [selectedYear, selectedTerm]);

  const accountLabel = (code) => {
    if (!code) return 'Unmapped';
    const account = incomeAccounts.find(item => item.code === code);
    return account ? `${account.code} — ${account.name}` : `Account ${code}`;
  };

  const accountName = (code) => {
    const account = incomeAccounts.find(item => item.code === code);
    return account?.name || 'Revenue account';
  };

  const addOtherFee = () => {
    setForm(prev => ({
      ...prev,
      otherFees: [
        ...prev.otherFees,
        { name: '', amount: 0, applicableTo: 'all', accountCode: '4090' }
      ]
    }));
  };

  const removeOtherFee = (index) => {
    setForm(prev => ({
      ...prev,
      otherFees: prev.otherFees.filter((_, i) => i !== index)
    }));
  };

  const updateOtherFee = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.otherFees];
      updated[index] = {
        ...updated[index],
        [field]: field === 'amount' ? Number(value) || 0 : value
      };
      return { ...prev, otherFees: updated };
    });
  };

  const updateAccountMapping = (key, code) => {
    setForm(prev => ({
      ...prev,
      accountMapping: { ...prev.accountMapping, [key]: code }
    }));
  };

  const applyPreset = (classLevel = form.classLevel) => {
    const preset = CLASS_PRESETS[classLevel];
    if (!preset) {
      showToast('error', `No standard preset is defined for ${classLevel}. Enter the amounts manually.`);
      return;
    }
    setForm(prev => ({
      ...prev,
      ...preset,
      otherFees: preset.otherFees.map(fee => ({ ...fee }))
    }));
    showToast('success', `Loaded the 2026 standard fee preset for ${classLevel}`);
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm({
      ...blankForm(selectedTerm, selectedYear),
      ...(CLASS_PRESETS.S1 || {}),
      otherFees: (CLASS_PRESETS.S1?.otherFees || []).map(fee => ({ ...fee }))
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditId(item._id);
    setForm({
      classLevel: item.classLevel,
      term: item.term,
      academicYear: item.academicYear,
      tuitionFee: item.tuitionFee || 0,
      developmentFee: item.developmentFee || 0,
      functionalFee: item.functionalFee || 0,
      boardingFee: item.boardingFee || 0,
      transportFee: item.transportFee || 0,
      registrationFee: item.registrationFee || 0,
      examFee: item.examFee || 0,
      accountMapping: { ...DEFAULT_ACCOUNT_MAPPING, ...(item.accountMapping || {}) },
      otherFees: (item.otherFees || []).map(fee => ({
        ...fee,
        accountCode: fee.accountCode || '4090'
      })),
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/finance/fee-structures', form);
      showToast('success', `Fee structure saved for ${form.classLevel} (${form.term}). Invoice lines are linked to their revenue accounts.`);
      setShowModal(false);
      loadStructures();
    } catch (err) {
      showToast('error', err.message || 'Failed to save fee structure');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete fee structure configuration for ${item.classLevel} (${item.term})?`)) return;
    try {
      await api.delete(`/finance/fee-structures/${item._id}`);
      showToast('success', 'Fee structure deleted');
      loadStructures();
    } catch (err) {
      showToast('error', err.message || 'Failed to delete fee structure');
    }
  };

  const yearOptions = useMemo(
    () => [...new Set([selectedYear, YEAR, YEAR - 1])].sort((a, b) => b - a),
    [selectedYear]
  );

  const otherFeesTotal = useMemo(
    () => form.otherFees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0),
    [form.otherFees]
  );

  const formDayTotal = useMemo(() => (
    Number(form.tuitionFee || 0) +
    Number(form.developmentFee || 0) +
    Number(form.functionalFee || 0) +
    Number(form.examFee || 0) +
    Number(form.registrationFee || 0) +
    Number(form.transportFee || 0) +
    otherFeesTotal
  ), [form, otherFeesTotal]);

  const formBoardingTotal = formDayTotal + Number(form.boardingFee || 0);

  return (
    <div style={s.container}>
      {toast && (
        <div style={{ ...s.toast, backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981' }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.message}
        </div>
      )}

      {/* Header Bar */}
      <div style={s.headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select style={s.selectInput} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {TERMS.map(term => <option key={term} value={term}>{term}</option>)}
          </select>

          <select style={s.selectInput} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {yearOptions.map(year => (
              <option key={year} value={year}>{year} Academic Year</option>
            ))}
          </select>

          <button onClick={loadStructures} style={s.iconBtn} title="Refresh fee structures">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <span style={s.accountCount}>
            <Landmark size={13} />
            {accountsLoading ? 'Loading revenue accounts…' : `${incomeAccounts.length} revenue accounts linked`}
          </span>
        </div>

        {!readOnly && (
          <button onClick={openCreateModal} style={s.addBtn}>
            <Plus size={15} />
            <span>Configure Class Fees</span>
          </button>
        )}
      </div>

      {/* Fee Structures Grid / Cards */}
      {structures.length === 0 ? (
        <div style={s.emptyBox}>
          <Layers size={36} color="#d8b257" />
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>No Class Fee Structures Configured</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, maxWidth: 500 }}>
            Configure tuition, development, functional, boarding, tours and other charges for each class.
            Every charge is linked to a revenue account in the Chart of Accounts so invoices post correctly.
          </p>
          {!readOnly && (
            <button onClick={openCreateModal} style={s.addBtn}>
              <Plus size={15} /> Configure First Class Fee
            </button>
          )}
        </div>
      ) : (
        <div style={s.grid}>
          {structures.map(item => {
            const mapping = { ...DEFAULT_ACCOUNT_MAPPING, ...(item.accountMapping || {}) };
            return (
              <div key={item._id} style={s.card}>
                <div style={s.cardHead}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={s.classBadge}>{item.classLevel}</div>
                    <div>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 800 }}>
                        Class {item.classLevel}
                      </h4>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {item.term} • {item.academicYear}
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEditModal(item)} style={s.iconActionBtn} title="Edit Fees">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(item)} style={{ ...s.iconActionBtn, color: '#ef4444' }} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={s.feeList}>
                  {CORE_FEE_ROWS.map(row => {
                    const amount = Number(item[row.amountKey] || 0);
                    if (amount <= 0) return null;
                    return (
                      <div key={row.amountKey} style={s.feeItem}>
                        <span style={{ color: '#94a3b8' }}>{row.label}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <code style={s.accountBadge}>{mapping[row.accountKey]}</code>
                          <strong style={{ color: row.amountKey === 'boardingFee' ? '#d8b257' : '#fff' }}>
                            {UGX(amount)}
                          </strong>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {(item.otherFees || []).length > 0 && (
                  <div style={s.auxSection}>
                    <span style={s.auxTitle}>Other Charges &amp; Activities:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5 }}>
                      {item.otherFees.map((fee, idx) => (
                        <div key={idx} style={s.auxRow}>
                          <span style={{ color: '#fff', fontSize: 11.5, flex: 1 }}>{fee.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <code style={s.accountBadge}>{fee.accountCode || '4090'}</code>
                            <strong style={{ color: '#34d399', fontSize: 11.5 }}>{UGX(fee.amount)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={s.cardFoot}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>Day Scholar Total:</span>
                    <strong style={{ color: '#fff' }}>{UGX(item.totalDayStudent)}</strong>
                  </div>
                  {item.boardingFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 3 }}>
                      <span style={{ color: '#94a3b8' }}>Boarder Total:</span>
                      <strong style={{ color: '#10b981' }}>{UGX(item.totalBoardingStudent)}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CONFIGURE CLASS FEES ── */}
      {showModal && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ ...s.modalBox, maxWidth: 820 }}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#d8b257" />
                <h3 style={s.modalTitle}>{editId ? 'Edit Class Fee Structure' : 'Configure Class Fees & Revenue Accounts'}</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveStructure} style={s.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
                <div style={s.formField}>
                  <label style={s.label}>Class Level *</label>
                  <select
                    style={s.formInput}
                    value={form.classLevel}
                    onChange={e => setForm({ ...form, classLevel: e.target.value })}
                  >
                    {ALL_CLASSES.map(className => <option key={className} value={className}>{className}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Term *</label>
                  <select
                    style={s.formInput}
                    value={form.term}
                    onChange={e => setForm({ ...form, term: e.target.value })}
                  >
                    {TERMS.map(term => <option key={term} value={term}>{term}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Year *</label>
                  <input
                    type="number"
                    style={s.formInput}
                    value={form.academicYear}
                    onChange={e => setForm({ ...form, academicYear: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div style={s.infoBox}>
                <Info size={15} color="#d8b257" style={{ flexShrink: 0 }} />
                <span>
                  Each fee line is attached to an Income account. When a cohort invoice is raised, the amount is credited
                  to that account while Accounts Receivable (1200) is debited.
                </span>
                <button type="button" onClick={() => applyPreset()} style={s.presetBtn}>
                  Use standard {form.classLevel} fees
                </button>
              </div>

              <div style={s.sectionBox}>
                <div style={s.sectionHead}>
                  <span style={s.sectionTitle}>Core Fees</span>
                  <span style={s.sectionHint}>Amount (UGX)</span>
                  <span style={s.sectionHint}>Revenue Account</span>
                </div>

                {CORE_FEE_ROWS.map(row => (
                  <div key={row.amountKey} style={s.feeEditRow}>
                    <label style={s.feeEditLabel}>
                      {row.label}
                      {row.required && <span style={{ color: '#ef4444' }}> *</span>}
                    </label>
                    <input
                      type="number"
                      min="0"
                      style={{ ...s.formInput, textAlign: 'right', color: row.amountKey === 'tuitionFee' ? '#34d399' : '#fff' }}
                      value={form[row.amountKey]}
                      onChange={e => setForm({ ...form, [row.amountKey]: Number(e.target.value) || 0 })}
                      required={row.required}
                    />
                    <select
                      style={s.formInput}
                      value={form.accountMapping[row.accountKey] || DEFAULT_ACCOUNT_MAPPING[row.accountKey]}
                      onChange={e => updateAccountMapping(row.accountKey, e.target.value)}
                      title={accountName(form.accountMapping[row.accountKey])}
                    >
                      {accountsLoading && <option value={form.accountMapping[row.accountKey]}>Loading accounts…</option>}
                      {incomeAccounts.map(account => (
                        <option key={account.code} value={account.code}>
                          {account.code} — {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={s.auxContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <label style={s.label}>Other Charges &amp; Activities</label>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Tours, science kits, ICT, medical welfare, uniforms and any other charge.
                    </div>
                  </div>
                  <button type="button" onClick={addOtherFee} style={s.addAuxBtn}>
                    <Plus size={13} /> Add Charge
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {form.otherFees.length === 0 && (
                    <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0' }}>
                      No extra charges yet. Use “Add Charge” for tours, lab kits, ICT, medical or uniforms.
                    </div>
                  )}
                  {form.otherFees.map((fee, idx) => (
                    <div key={idx} style={s.otherFeeRow}>
                      <input
                        style={{ ...s.formInput, minWidth: 150 }}
                        placeholder="Charge name (e.g. S4 Geography Tour)"
                        value={fee.name}
                        onChange={e => updateOtherFee(idx, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        style={{ ...s.formInput, textAlign: 'right' }}
                        placeholder="UGX"
                        value={fee.amount}
                        onChange={e => updateOtherFee(idx, 'amount', e.target.value)}
                        required
                      />
                      <select
                        style={{ ...s.formInput, minWidth: 220 }}
                        value={fee.accountCode || '4090'}
                        onChange={e => updateOtherFee(idx, 'accountCode', e.target.value)}
                        title={accountName(fee.accountCode)}
                      >
                        {incomeAccounts.map(account => (
                          <option key={account.code} value={account.code}>
                            {account.code} — {account.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeOtherFee(idx)}
                        style={s.delItemBtn}
                        title="Remove charge"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={s.formField}>
                <label style={s.label}>Notes</label>
                <input
                  style={s.formInput}
                  placeholder="Optional notes for this fee structure"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div style={s.summaryBox}>
                <div style={s.summaryItem}>
                  <span style={s.summaryLabel}>Day Scholar Total</span>
                  <strong style={{ ...s.summaryValue, color: '#fff' }}>{UGX(formDayTotal)}</strong>
                </div>
                <div style={s.summaryItem}>
                  <span style={s.summaryLabel}>Boarder Total</span>
                  <strong style={{ ...s.summaryValue, color: '#10b981' }}>{UGX(formBoardingTotal)}</strong>
                </div>
                <div style={s.summaryItem}>
                  <span style={s.summaryLabel}>Other Charges</span>
                  <strong style={{ ...s.summaryValue, color: '#d8b257' }}>{UGX(otherFeesTotal)}</strong>
                </div>
              </div>

              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" disabled={submitting} style={s.submitBtn}>
                  {submitting ? 'Saving...' : 'Save Class Fee Structure'}
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
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  toast: { padding: '10px 16px', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 8 },
  headerBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  selectInput: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' },
  iconBtn: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer' },
  accountCount: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#64748b' },
  addBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#080e1a', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  emptyBox: { backgroundColor: '#0d1527', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 },
  card: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.22)' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  classBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(197, 155, 39, 0.15)', color: '#d8b257', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 },
  iconActionBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 },
  feeList: { display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  feeItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, gap: 8 },
  accountBadge: { fontSize: 9.5, color: '#d8b257', backgroundColor: 'rgba(197,155,39,0.1)', border: '1px solid rgba(197,155,39,0.18)', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace' },
  auxSection: { backgroundColor: '#070c18', borderRadius: 7, padding: '8px 10px' },
  auxTitle: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  auxRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardFoot: { marginTop: 'auto', paddingTop: 4 },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(4,7,15,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalBox: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: '100%', maxWidth: 580, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  modalTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '78vh', overflowY: 'auto' },
  formField: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#070c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' },
  infoBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(197,155,39,0.08)', border: '1px solid rgba(197,155,39,0.18)', borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 },
  presetBtn: { marginLeft: 'auto', flexShrink: 0, background: 'transparent', border: '1px solid rgba(197,155,39,0.35)', borderRadius: 6, color: '#d8b257', fontSize: 11, fontWeight: 700, padding: '6px 9px', cursor: 'pointer' },
  sectionBox: { backgroundColor: '#070c18', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  sectionHead: { display: 'grid', gridTemplateColumns: '1fr 140px 260px', gap: 8, alignItems: 'center', marginBottom: 2 },
  sectionTitle: { fontSize: 10.5, fontWeight: 800, color: '#d8b257', textTransform: 'uppercase', letterSpacing: '0.06em' },
  sectionHint: { fontSize: 9.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' },
  feeEditRow: { display: 'grid', gridTemplateColumns: '1fr 140px 260px', gap: 8, alignItems: 'center' },
  feeEditLabel: { fontSize: 12, color: '#cbd5e1' },
  auxContainer: { backgroundColor: '#070c18', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 },
  addAuxBtn: { background: 'none', border: 'none', color: '#d8b257', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  otherFeeRow: { display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 120px minmax(200px, 1.3fr) 32px', gap: 8, alignItems: 'center' },
  delItemBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 },
  summaryBox: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, backgroundColor: '#070c18', borderRadius: 8, padding: 12 },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  summaryLabel: { fontSize: 9.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  summaryValue: { fontSize: 15, fontWeight: 800 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  submitBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#080e1a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
};
