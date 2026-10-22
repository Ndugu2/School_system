import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Award, Plus, Search, Filter, CheckCircle, XCircle, AlertCircle,
  HelpCircle, Trash2, ShieldAlert, Sparkles, BookOpen, User, RefreshCw
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEAR = new Date().getFullYear();
const YEARS = [YEAR, YEAR - 1, YEAR - 2];

const BURSARY_CATEGORIES = [
  { id: 'academic_excellence', label: 'Academic Excellence (Top Performers)' },
  { id: 'sports_scholarship', label: 'Sports & Athletics Scholarship' },
  { id: 'staff_child', label: 'Staff Child Fee Concession (50%)' },
  { id: 'need_based_hardship', label: 'Need-Based & Hardship Aid' },
  { id: 'director_bursary', label: 'Managing Director Special Bursary' },
  { id: 'ngo_sponsor', label: 'NGO / Foundation Sponsor Grant' },
  { id: 'district_grant', label: 'District Local Government Grant' },
  { id: 'other', label: 'Other Special Remission' },
];

export default function BursariesTab({ readOnly = false }) {
  const [bursaries, setBursaries] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(String(YEAR));
  const [filterTerm, setFilterTerm] = useState('');
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    studentId: '',
    name: 'Sports Excellence Scholarship (50%)',
    category: 'sports_scholarship',
    amountType: 'percentage', // percentage or fixed_amount
    value: 50,
    academicYear: YEAR,
    term: 'Term 1',
    sponsorName: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.append('academicYear', filterYear);
      if (filterTerm) params.append('term', filterTerm);

      const [bursaryData, studentData] = await Promise.all([
        api.get(`/finance/bursaries?${params}`),
        api.get('/students?limit=200')
      ]);

      setBursaries(bursaryData || []);
      setStudents(studentData.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterYear, filterTerm]);

  const handleAward = async (e) => {
    e.preventDefault();
    if (!form.studentId) return alert('Please select a student');
    if (!form.value || Number(form.value) <= 0) return alert('Please enter a valid percentage or amount');

    setSaving(true);
    try {
      const res = await api.post('/finance/bursaries', form);
      alert(`✅ ${res.message}`);
      setShowAwardModal(false);
      fetchData();
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id, code) => {
    if (!window.confirm(`Are you sure you want to revoke bursary ${code}? This will reverse the credit on the student ledger and re-instate their outstanding fee balance.`)) {
      return;
    }
    try {
      await api.post(`/finance/bursaries/${id}/revoke`);
      alert(`✅ Bursary ${code} revoked and reversing journal entry posted!`);
      fetchData();
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  const filtered = bursaries.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.bursaryCode?.toLowerCase().includes(q) ||
      b.name?.toLowerCase().includes(q) ||
      b.studentName?.toLowerCase().includes(q) ||
      b.studentId?.toLowerCase().includes(q)
    );
  });

  const totalAwarded = bursaries.reduce((sum, b) => sum + (b.calculatedAmount || 0), 0);
  const activeCount = bursaries.filter(b => b.status !== 'revoked').length;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={24} color="#c59b27" />
            <h2 style={s.title}>Bursaries & Scholarships Engine</h2>
          </div>
          <p style={s.subtitle}>
            Award institutional aid, sponsor grants, and fee remissions with automatic double-entry General Ledger postings.
          </p>
        </div>
        {!readOnly && (
          <button style={s.primaryBtn} onClick={() => setShowAwardModal(true)}>
            <Plus size={16} /> + Award New Bursary
          </button>
        )}
      </div>

      {/* Accounting Rule Info Box */}
      <div style={s.ruleBox}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Sparkles size={20} color="#c59b27" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: '#c59b27', fontSize: 13, textTransform: 'uppercase' }}>
              HOW TO CHARGE A BURSARY (QUICKBOOKS DOUBLE-ENTRY RULE)
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              When a student receives a bursary or scholarship, the school funds their education. The accounting engine automatically charges (debits) 
              <strong> Account 5095 (Bursaries, Scholarships & Fee Remissions Expense)</strong> and credits 
              <strong> Account 1200 (Accounts Receivable - Student Fees)</strong>. 
              The student's fee balance immediately drops, their Statement of Account shows the bursary credit, and the institutional aid is recognized as an operating expenditure on the school Profit & Loss Statement.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <span style={s.kpiLabel}>Total Bursary Aid Awarded</span>
          <strong style={{ ...s.kpiVal, color: '#c59b27' }}>{UGX(totalAwarded)}</strong>
          <span style={s.kpiSub}>Debited to Account 5095</span>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiLabel}>Active Scholarships</span>
          <strong style={{ ...s.kpiVal, color: 'var(--primary)' }}>{activeCount} students</strong>
          <span style={s.kpiSub}>Beneficiaries currently enrolled</span>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiLabel}>Average Remission</span>
          <strong style={{ ...s.kpiVal, color: '#10b981' }}>
            {activeCount > 0 ? UGX(Math.round(totalAwarded / activeCount)) : 'UGX 0'}
          </strong>
          <span style={s.kpiSub}>Per subsidized student</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} style={s.searchIcon} />
          <input
            style={s.searchInput}
            placeholder="Search by bursary code, scheme, student name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select style={s.select} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All Academic Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={s.select} value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
          <option value="">All Academic Terms</option>
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button style={s.refreshBtn} onClick={fetchData} title="Refresh bursaries">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Bursary Table */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.empty}>Loading bursaries and scholarship ledger...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>No bursaries recorded. Click "+ Award New Bursary" to grant a fee remission.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Bursary Code</th>
                <th style={s.th}>Student Beneficiary</th>
                <th style={s.th}>Bursary Scheme & Category</th>
                <th style={s.th}>Term / Year</th>
                <th style={s.th}>Award Rate</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Credited Amount (UGX)</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b._id} style={{ ...s.tr, opacity: b.status === 'revoked' ? 0.6 : 1 }}>
                  <td style={{ ...s.td, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {b.bursaryCode}
                  </td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 700 }}>{b.studentName || b.student?.user?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{b.studentId || b.student?.admissionNumber}</div>
                  </td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      Category: {b.category?.replace(/_/g, ' ')}
                      {b.sponsorName && ` · Sponsor: ${b.sponsorName}`}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={s.termTag}>{b.term} {b.academicYear}</span>
                  </td>
                  <td style={s.td}>
                    {b.amountType === 'percentage' ? (
                      <span style={s.rateBadgeGold}>{b.value}% of Fees</span>
                    ) : (
                      <span style={s.rateBadgeGreen}>Fixed {UGX(b.value)}</span>
                    )}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                    {UGX(b.calculatedAmount)}
                  </td>
                  <td style={s.td}>
                    {b.status === 'applied' && <span style={s.statusApplied}>Applied to Invoice</span>}
                    {b.status === 'active' && <span style={s.statusActive}>Active Grant</span>}
                    {b.status === 'revoked' && <span style={s.statusRevoked}>Revoked</span>}
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    {!readOnly && b.status !== 'revoked' && (
                      <button
                        style={s.revokeBtn}
                        onClick={() => handleRevoke(b._id, b.bursaryCode)}
                        title="Revoke Bursary & Reverse Ledger"
                      >
                        <Trash2 size={13} style={{ marginRight: 4 }} /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Award Bursary Modal */}
      {showAwardModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={20} color="#c59b27" />
                <h3 style={s.modalTitle}>Award Bursary / Fee Remission</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setShowAwardModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAward} style={s.form}>
              <div>
                <label style={s.label}>Select Student Account</label>
                <select
                  required
                  style={s.input}
                  value={form.studentId}
                  onChange={e => setForm({ ...form, studentId: e.target.value })}
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(st => (
                    <option key={st._id} value={st._id}>
                      {st.user?.name || 'Unnamed'} ({st.admissionNumber || st.studentId}) — {st.currentClassLevel || st.currentClass?.name || 'Class'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Bursary Scheme Name</label>
                  <input
                    required
                    style={s.input}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sports Excellence 50% Subsidy"
                  />
                </div>
                <div>
                  <label style={s.label}>Scheme Category</label>
                  <select
                    style={s.input}
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {BURSARY_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Remission Calculation</label>
                  <select
                    style={s.input}
                    value={form.amountType}
                    onChange={e => setForm({ ...form, amountType: e.target.value })}
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed_amount">Fixed Amount (UGX)</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>
                    {form.amountType === 'percentage' ? 'Percentage Rate (%)' : 'Amount (UGX)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.amountType === 'percentage' ? 100 : 10000000}
                    required
                    style={s.input}
                    value={form.value}
                    onChange={e => setForm({ ...form, value: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Academic Term</label>
                  <select
                    style={s.input}
                    value={form.term}
                    onChange={e => setForm({ ...form, term: e.target.value })}
                  >
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={s.label}>Sponsor / Donor / Foundation (Optional)</label>
                <input
                  style={s.input}
                  placeholder="e.g. Mastercard Foundation, District Bursary Board, Director Aid"
                  value={form.sponsorName}
                  onChange={e => setForm({ ...form, sponsorName: e.target.value })}
                />
              </div>

              <div>
                <label style={s.label}>Internal Accounting Notes</label>
                <input
                  style={s.input}
                  placeholder="e.g. Approved by Headteacher on recommendation of Sports Master"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div style={s.ledgerNotice}>
                ⚡ <strong>QuickBooks Ledger Auto-Post:</strong> Debits 5095 (Bursaries Expense) & Credits 1200 (Accounts Receivable). 
                The student's invoice and statement of account will automatically reflect the remission.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" style={{ ...s.primaryBtn, flex: 1 }} disabled={saving}>
                  {saving ? 'Posting Bursary...' : 'Confirm & Charge Bursary to General Ledger'}
                </button>
                <button type="button" style={{ ...s.primaryBtn, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => setShowAwardModal(false)}>
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
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#c59b27', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  ruleBox: { backgroundColor: 'rgba(197, 155, 39, 0.08)', border: '1px solid rgba(197, 155, 39, 0.3)', borderRadius: 8, padding: 16 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
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
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  thead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  th: { padding: '12px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 16px', fontSize: 13, color: 'var(--text-primary)' },
  termTag: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  rateBadgeGold: { fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, backgroundColor: 'rgba(197, 155, 39, 0.15)', color: '#c59b27' },
  rateBadgeGreen: { fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, backgroundColor: '#d1fae5', color: '#047857' },
  statusApplied: { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, backgroundColor: '#d1fae5', color: '#047857' },
  statusActive: { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, backgroundColor: '#e0e7ff', color: 'var(--primary)' },
  statusRevoked: { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, backgroundColor: '#fee2e2', color: '#b91c1c' },
  revokeBtn: { display: 'inline-flex', alignItems: 'center', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 },
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
};
