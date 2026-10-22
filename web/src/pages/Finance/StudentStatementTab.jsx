import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Search, FileText, Printer, Download, Calendar, User, Phone, CheckCircle2,
  AlertCircle, DollarSign, ArrowUpRight, ArrowDownRight, Award, ShieldCheck
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const TERMS = ['All Terms', 'Term 1', 'Term 2', 'Term 3'];
const YEAR = new Date().getFullYear();
const YEARS = [YEAR, YEAR - 1, YEAR - 2];

export default function StudentStatementTab({ readOnly = false }) {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(YEAR));
  const [selectedTerm, setSelectedTerm] = useState('All Terms');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch student roster for dropdown / quick select
  useEffect(() => {
    api.get('/students?limit=200')
      .then(res => {
        const list = res.students || [];
        setStudents(list);
        if (list.length > 0 && !selectedStudentId) {
          setSelectedStudentId(list[0]._id);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const fetchStatement = async (studentIdToFetch) => {
    const id = studentIdToFetch || selectedStudentId;
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('academicYear', selectedYear);
      if (selectedTerm && selectedTerm !== 'All Terms') params.append('term', selectedTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/finance/students/${id}/statement?${params}`);
      setStatementData(res);
    } catch (err) {
      setError(err.message || 'Unable to generate statement of account');
      setStatementData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStatement(selectedStudentId);
    }
  }, [selectedStudentId, selectedYear, selectedTerm]);

  const filteredStudents = students.filter(s => {
    if (!searchStudent) return true;
    const q = searchStudent.toLowerCase();
    const name = s.user?.name?.toLowerCase() || '';
    const adm = s.admissionNumber?.toLowerCase() || '';
    const sid = s.studentId?.toLowerCase() || '';
    return name.includes(q) || adm.includes(q) || sid.includes(q);
  });

  return (
    <div style={s.container}>
      {/* Search and Control Bar */}
      <div style={s.topBar}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={s.controlLabel}>Select Student Account</label>
          <div style={s.selectWrap}>
            <select
              style={s.select}
              value={selectedStudentId}
              onChange={e => {
                setSelectedStudentId(e.target.value);
              }}
            >
              <option value="">-- Choose Student Account --</option>
              {filteredStudents.map(st => (
                <option key={st._id} value={st._id}>
                  {st.user?.name || 'Unnamed'} ({st.admissionNumber || st.studentId}) — {st.currentClassLevel || st.currentClass?.name || 'Class'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={s.controlLabel}>Filter by Student Name / ID</label>
          <div style={s.inputIconWrap}>
            <Search size={14} style={s.inputIcon} />
            <input
              style={s.searchInput}
              placeholder="Search student or ID..."
              value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={s.controlLabel}>Academic Year</label>
          <select style={s.filterSelect} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <label style={s.controlLabel}>Term</label>
          <select style={s.filterSelect} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button
            style={s.printBtn}
            onClick={() => window.print()}
            disabled={!statementData}
          >
            <Printer size={15} /> Print Statement
          </button>
        </div>
      </div>

      {error && <div style={s.error}><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <div style={s.empty}>Generating student statement of accounts...</div>
      ) : !statementData ? (
        <div style={s.empty}>Select a student above to inspect their double-entry statement of account.</div>
      ) : (
        <div style={s.statementSheet} id="printable-statement">
          {/* Printable Statement Header */}
          <div style={s.sheetHeader}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={s.schoolBadge}>NA</div>
              <div>
                <h1 style={s.schoolName}>NDUGU ACADEMY HIGH SCHOOL</h1>
                <p style={s.schoolMeta}>Bursar & Financial Accounting Department · Official Student Statement</p>
                <p style={s.schoolMeta}>P.O. Box 7120 Kampala, Uganda · Tel: +256 700 000 000 · Email: bursar@ndugu.ac.ug</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={s.statementTitle}>STATEMENT OF ACCOUNT</div>
              <div style={s.statementDate}>Date Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div style={s.statementDate}>Period: {statementData.period?.term} {statementData.period?.academicYear}</div>
            </div>
          </div>

          {/* Student Profile Card */}
          <div style={s.studentInfoGrid}>
            <div>
              <span style={s.metaLabel}>STUDENT NAME</span>
              <strong style={s.metaValue}>{statementData.student?.name}</strong>
              <span style={s.metaSub}>Admission No: {statementData.student?.admissionNumber} · Class: {statementData.student?.classLevel}</span>
            </div>
            <div>
              <span style={s.metaLabel}>PARENT / GUARDIAN</span>
              <strong style={s.metaValue}>{statementData.student?.parentName}</strong>
              <span style={s.metaSub}>Phone: {statementData.student?.parentPhone}</span>
            </div>
            <div>
              <span style={s.metaLabel}>FINANCIAL CLEARANCE STATUS</span>
              <div style={{ marginTop: 4 }}>
                {statementData.closingBalance <= 0 ? (
                  <span style={s.clearBadgeGreen}><CheckCircle2 size={13} /> Fully Paid (100% Cleared)</span>
                ) : statementData.student?.financialClearance ? (
                  <span style={s.clearBadgeGold}><ShieldCheck size={13} /> 40% Exam & Gate Cleared</span>
                ) : (
                  <span style={s.clearBadgeRed}><AlertCircle size={13} /> Clearance Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={s.kpiRow}>
            <div style={s.kpiCard}>
              <span style={s.kpiTitle}>Opening Balance</span>
              <span style={s.kpiNum}>{UGX(statementData.openingBalance)}</span>
              <span style={s.kpiHint}>Carried forward</span>
            </div>
            <div style={s.kpiCard}>
              <span style={s.kpiTitle}>Total Invoiced (Debits)</span>
              <span style={{ ...s.kpiNum, color: 'var(--primary)' }}>{UGX(statementData.totalDebits)}</span>
              <span style={s.kpiHint}>Tuition, tours, boarding</span>
            </div>
            <div style={s.kpiCard}>
              <span style={s.kpiTitle}>Total Paid (Cash/Bank)</span>
              <span style={{ ...s.kpiNum, color: '#10b981' }}>{UGX(statementData.totalPaid)}</span>
              <span style={s.kpiHint}>Bank & MoMo receipts</span>
            </div>
            <div style={s.kpiCard}>
              <span style={s.kpiTitle}>Total Bursaries & Aid</span>
              <span style={{ ...s.kpiNum, color: '#c59b27' }}>{UGX(statementData.totalBursaries)}</span>
              <span style={s.kpiHint}>Fee remissions & grants</span>
            </div>
            <div style={{ ...s.kpiCard, backgroundColor: statementData.closingBalance > 0 ? '#fee2e2' : '#d1fae5', borderColor: statementData.closingBalance > 0 ? '#fca5a5' : '#86efac' }}>
              <span style={{ ...s.kpiTitle, color: statementData.closingBalance > 0 ? '#991b1b' : '#065f46' }}>Net Balance Due</span>
              <span style={{ ...s.kpiNum, color: statementData.closingBalance > 0 ? '#b91c1c' : '#047857', fontSize: 18 }}>{UGX(statementData.closingBalance)}</span>
              <span style={{ ...s.kpiHint, color: statementData.closingBalance > 0 ? '#b91c1c' : '#047857' }}>
                {statementData.closingBalance > 0 ? 'Amount Outstanding' : 'Account in Good Standing'}
              </span>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div style={s.ledgerWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Ref / Doc #</th>
                  <th style={s.th}>Description & Breakdown</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Debit (+) UGX</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Credit (-) UGX</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr style={{ ...s.tr, backgroundColor: 'var(--bg-tertiary)' }}>
                  <td style={s.td}>—</td>
                  <td style={s.td}><span style={s.tagOpening}>Opening</span></td>
                  <td style={s.td}>BALANCE B/F</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>Balance Brought Forward from Prior Periods</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>—</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>—</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 800 }}>{UGX(statementData.openingBalance)}</td>
                </tr>

                {statementData.transactions?.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={s.emptyTable}>No fee invoices, receipts, or bursaries recorded in this period.</td>
                  </tr>
                ) : (
                  statementData.transactions.map((tx, idx) => (
                    <tr key={idx} style={s.tr}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={s.td}>
                        {tx.type === 'Invoice' && <span style={s.tagInvoice}>Invoice</span>}
                        {tx.type === 'Payment' && <span style={s.tagPayment}>Receipt</span>}
                        {tx.type === 'Bursary' && <span style={s.tagBursary}>Bursary</span>}
                      </td>
                      <td style={{ ...s.td, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {tx.ref}
                      </td>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600 }}>{tx.description}</div>
                        {tx.term && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tx.term} {tx.academicYear}</span>}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 600, color: tx.debit > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {tx.debit > 0 ? UGX(tx.debit) : '—'}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 600, color: tx.credit > 0 ? '#10b981' : 'var(--text-tertiary)' }}>
                        {tx.credit > 0 ? UGX(tx.credit) : '—'}
                      </td>
                      <td style={{
                        ...s.td,
                        textAlign: 'right',
                        fontWeight: 800,
                        color: tx.runningBalance > 0 ? '#ef4444' : '#10b981'
                      }}>
                        {UGX(tx.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={s.tfoot}>
                  <td colSpan="4" style={{ ...s.td, fontWeight: 800, textTransform: 'uppercase' }}>
                    Statement Totals & Closing Position
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: 'var(--primary)' }}>
                    {UGX(statementData.totalDebits)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, color: '#10b981' }}>
                    {UGX(statementData.totalCredits)}
                  </td>
                  <td style={{
                    ...s.td,
                    textAlign: 'right',
                    fontWeight: 900,
                    fontSize: 15,
                    color: statementData.closingBalance > 0 ? '#b91c1c' : '#047857'
                  }}>
                    {UGX(statementData.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Instructions & Official Stamp Area */}
          <div style={s.sheetFooter}>
            <div style={{ flex: 1.5, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>BANK PAYMENT INSTRUCTIONS:</strong>
              <div>• Stanbic Bank Uganda — Account: <strong>9030018829410</strong> (Ndugu Academy High School)</div>
              <div>• Centenary Bank — Account: <strong>310008892110</strong> (School Fees Collection Account)</div>
              <div>• MTN Mobile Money Merchant Code: <strong>*165*4*8#</strong> · School Code: <strong>NDUGU</strong></div>
              <div style={{ marginTop: 4, color: 'var(--text-tertiary)' }}>Quote student admission number as reference for instantaneous ledger reconciliation.</div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ borderBottom: '1px solid var(--text-tertiary)', width: '180px', marginBottom: 6 }}></div>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Authorized Bursar / Accountant</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Official School Stamp & Signature</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  topBar: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: 'var(--bg-secondary)',
    padding: 16,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)'
  },
  controlLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 5 },
  selectWrap: { width: '100%' },
  select: { width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  filterSelect: { padding: '9px 12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  inputIconWrap: { position: 'relative', minWidth: 180 },
  inputIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' },
  searchInput: { width: '100%', padding: '9px 12px 9px 32px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  printBtn: { display: 'flex', alignItems: 'center', gap: 7, backgroundColor: '#c59b27', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  empty: { padding: 60, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 },
  error: { display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#991b1b', backgroundColor: '#fee2e2', borderRadius: 8, fontSize: 13 },
  statementSheet: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 28,
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid var(--border)',
    paddingBottom: 18,
    flexWrap: 'wrap',
    gap: 16
  },
  schoolBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'var(--primary)',
    color: '#fff',
    fontWeight: 900,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: 1
  },
  schoolName: { margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: 0.5 },
  schoolMeta: { margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' },
  statementTitle: { fontSize: 18, fontWeight: 900, color: '#c59b27', letterSpacing: 0.5 },
  statementDate: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 },
  studentInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    backgroundColor: 'var(--bg-tertiary)',
    padding: 16,
    borderRadius: 8,
    border: '1px solid var(--border)'
  },
  metaLabel: { display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { display: 'block', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 },
  metaSub: { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 },
  clearBadgeGreen: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, backgroundColor: '#d1fae5', color: '#047857', fontSize: 11, fontWeight: 800 },
  clearBadgeGold: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, backgroundColor: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 800 },
  clearBadgeRed: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 11, fontWeight: 800 },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 12
  },
  kpiCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3
  },
  kpiTitle: { fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' },
  kpiNum: { fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' },
  kpiHint: { fontSize: 11, color: 'var(--text-tertiary)' },
  ledgerWrap: { overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 780 },
  thead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  th: { padding: '10px 14px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '11px 14px', fontSize: 13, color: 'var(--text-primary)' },
  tfoot: { backgroundColor: 'var(--bg-tertiary)', borderTop: '2px solid var(--border)' },
  tagInvoice: { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(99,102,241,0.15)', color: 'var(--primary)' },
  tagPayment: { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, backgroundColor: '#d1fae5', color: '#047857' },
  tagBursary: { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, backgroundColor: '#fef3c7', color: '#b45309' },
  tagOpening: { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' },
  emptyTable: { padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  sheetFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 30,
    borderTop: '2px solid var(--border)',
    paddingTop: 18,
    flexWrap: 'wrap'
  }
};
