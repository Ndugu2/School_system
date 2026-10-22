import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  Layers,
  Plus,
  Compass,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Building,
  School,
  Sparkles,
  Calendar
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const ALL_CLASSES = ['Nursery', 'Baby', 'Middle', 'Top', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEAR = new Date().getFullYear();

export default function FeeStructureTab({ readOnly = false }) {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState(YEAR);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    classLevel: 'S1',
    term: 'Term 1',
    academicYear: YEAR,
    tuitionFee: 950000,
    developmentFee: 50000,
    functionalFee: 30000,
    boardingFee: 450000,
    transportFee: 0,
    examFee: 20000,
    otherFees: [
      { name: 'Senior Geography Tour to Jinja', amount: 120000, applicableTo: 'all' },
      { name: 'Science Laboratory Reagents Kit', amount: 40000, applicableTo: 'all' }
    ],
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStructures = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/finance/fee-structures?academicYear=${selectedYear}&term=${selectedTerm}`);
      setStructures(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Error loading fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructures();
  }, [selectedYear, selectedTerm]);

  const addOtherFee = () => {
    setForm(prev => ({
      ...prev,
      otherFees: [
        ...prev.otherFees,
        { name: '', amount: 0, applicableTo: 'all' }
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
      updated[index] = { ...updated[index], [field]: field === 'amount' ? Number(value) || 0 : value };
      return { ...prev, otherFees: updated };
    });
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm({
      classLevel: 'S1',
      term: selectedTerm,
      academicYear: selectedYear,
      tuitionFee: 950000,
      developmentFee: 50000,
      functionalFee: 30000,
      boardingFee: 450000,
      transportFee: 0,
      examFee: 20000,
      otherFees: [
        { name: 'Senior Geography Tour to Jinja', amount: 120000, applicableTo: 'all' }
      ],
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditId(item._id);
    setForm({
      classLevel: item.classLevel,
      term: item.term,
      academicYear: item.academicYear,
      tuitionFee: item.tuitionFee,
      developmentFee: item.developmentFee,
      functionalFee: item.functionalFee,
      boardingFee: item.boardingFee,
      transportFee: item.transportFee || 0,
      examFee: item.examFee || 0,
      otherFees: item.otherFees || [],
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/finance/fee-structures', form);
      showToast('success', `Tuition & Fee structure saved for ${form.classLevel} (${form.term})!`);
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

  return (
    <div style={s.container}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981' }}>
          {toast.message}
        </div>
      )}

      {/* Header Bar */}
      <div style={s.headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            style={s.selectInput}
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
          >
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            style={s.selectInput}
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            <option value={YEAR}>{YEAR} Academic Year</option>
            <option value={YEAR - 1}>{YEAR - 1} Academic Year</option>
          </select>

          <button onClick={loadStructures} style={s.iconBtn} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {!readOnly && (
          <button onClick={openCreateModal} style={s.addBtn}>
            <Plus size={15} />
            <span>Configure Class Tuition &amp; Tours</span>
          </button>
        )}
      </div>

      {/* Fee Structures Grid / Cards */}
      {structures.length === 0 ? (
        <div style={s.emptyBox}>
          <Layers size={36} color="#d8b257" />
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>No Class Tuition Structures Configured</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, maxWidth: 460 }}>
            Configure dynamic Tuition Fees per class (e.g. S1, S2, S3, S4, S5, S6) alongside Tours &amp; Excursions, Boarding, Development, and Exam fees.
          </p>
          {!readOnly && (
            <button onClick={openCreateModal} style={s.addBtn}>
              <Plus size={15} /> Configure First Class Fee
            </button>
          )}
        </div>
      ) : (
        <div style={s.grid}>
          {structures.map(item => (
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

              {/* Core Breakdown */}
              <div style={s.feeList}>
                <div style={s.feeItem}>
                  <span style={{ color: '#94a3b8' }}>Tuition Fee:</span>
                  <strong style={{ color: '#fff' }}>{UGX(item.tuitionFee)}</strong>
                </div>
                {item.developmentFee > 0 && (
                  <div style={s.feeItem}>
                    <span style={{ color: '#94a3b8' }}>Development Levy:</span>
                    <span>{UGX(item.developmentFee)}</span>
                  </div>
                )}
                {item.functionalFee > 0 && (
                  <div style={s.feeItem}>
                    <span style={{ color: '#94a3b8' }}>Functional Fee:</span>
                    <span>{UGX(item.functionalFee)}</span>
                  </div>
                )}
                {item.boardingFee > 0 && (
                  <div style={s.feeItem}>
                    <span style={{ color: '#94a3b8' }}>Boarding &amp; Hostel:</span>
                    <span style={{ color: '#d8b257' }}>+{UGX(item.boardingFee)}</span>
                  </div>
                )}
              </div>

              {/* Tours & Auxiliary Fees */}
              {(item.otherFees || []).length > 0 && (
                <div style={s.auxSection}>
                  <span style={s.auxTitle}>Tours &amp; Auxiliary Activities:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                    {item.otherFees.map((f, idx) => (
                      <div key={idx} style={s.auxRow}>
                        <span style={{ color: '#fff', fontSize: 11.5 }}>{f.name}</span>
                        <strong style={{ color: '#34d399', fontSize: 11.5 }}>{UGX(f.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals Banner */}
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
          ))}
        </div>
      )}

      {/* ── MODAL: CONFIGURE TUITION & TOURS ── */}
      {showModal && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ ...s.modalBox, maxWidth: 600 }}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#d8b257" />
                <h3 style={s.modalTitle}>{editId ? 'Edit Class Fee Structure' : 'Configure Class Tuition & Tours'}</h3>
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
                    {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Term *</label>
                  <select
                    style={s.formInput}
                    value={form.term}
                    onChange={e => setForm({ ...form, term: e.target.value })}
                  >
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
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

              {/* Core Tuition & Boarding Fees */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={s.formField}>
                  <label style={s.label}>Core Tuition Fee (UGX) *</label>
                  <input
                    type="number"
                    style={{ ...s.formInput, fontWeight: 700, color: '#34d399' }}
                    value={form.tuitionFee}
                    onChange={e => setForm({ ...form, tuitionFee: Number(e.target.value) })}
                    required
                  />
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Boarding / Hostel Accommodation</label>
                  <input
                    type="number"
                    style={s.formInput}
                    value={form.boardingFee}
                    onChange={e => setForm({ ...form, boardingFee: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={s.formField}>
                  <label style={s.label}>Development Levy</label>
                  <input
                    type="number"
                    style={s.formInput}
                    value={form.developmentFee}
                    onChange={e => setForm({ ...form, developmentFee: Number(e.target.value) })}
                  />
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Functional Fee</label>
                  <input
                    type="number"
                    style={s.formInput}
                    value={form.functionalFee}
                    onChange={e => setForm({ ...form, functionalFee: Number(e.target.value) })}
                  />
                </div>
                <div style={s.formField}>
                  <label style={s.label}>Exam &amp; UNEB Fee</label>
                  <input
                    type="number"
                    style={s.formInput}
                    value={form.examFee}
                    onChange={e => setForm({ ...form, examFee: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Tours, Trips & Auxiliary Fees Catalog */}
              <div style={s.auxContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={s.label}>Educational Tours &amp; Auxiliary Activity Items</label>
                  <button type="button" onClick={addOtherFee} style={s.addAuxBtn}>
                    <Plus size={13} /> Add Tour / Fee
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {form.otherFees.map((fee, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        style={{ ...s.formInput, flex: 2 }}
                        placeholder="Activity name (e.g. S4 Geography Tour Jinja)"
                        value={fee.name}
                        onChange={e => updateOtherFee(idx, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        style={{ ...s.formInput, width: 140, textAlign: 'right' }}
                        placeholder="UGX Amount"
                        value={fee.amount}
                        onChange={e => updateOtherFee(idx, 'amount', e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeOtherFee(idx)}
                        style={s.delItemBtn}
                        title="Remove activity fee"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
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
  toast: { padding: '10px 16px', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  headerBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  selectInput: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' },
  iconBtn: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer' },
  addBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#080e1a', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  emptyBox: { backgroundColor: '#0d1527', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 },
  card: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.22)' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  classBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(197, 155, 39, 0.15)', color: '#d8b257', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 },
  iconActionBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 },
  feeList: { display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  feeItem: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5 },
  auxSection: { backgroundColor: '#070c18', borderRadius: 7, padding: '8px 10px' },
  auxTitle: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  auxRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardFoot: { marginTop: 'auto', paddingTop: 4 },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(4,7,15,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalBox: { backgroundColor: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: '100%', maxWidth: 580, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  modalTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  formField: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#070c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' },
  auxContainer: { backgroundColor: '#070c18', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 },
  addAuxBtn: { background: 'none', border: 'none', color: '#d8b257', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  delItemBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  submitBtn: { backgroundColor: '#c59b27', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#080e1a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
};
