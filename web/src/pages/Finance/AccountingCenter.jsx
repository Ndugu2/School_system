import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2,
  ClipboardCheck, Landmark, Plus, RefreshCw, Scale, WalletCards, X
} from 'lucide-react';

const YEAR = new Date().getFullYear();
const UGX = value => `UGX ${Number(value || 0).toLocaleString()}`;

const accounts = [
  { code: '1100', name: 'Student Fees Receivable', type: 'Asset', icon: WalletCards, tone: '#4f46e5' },
  { code: '1200', name: 'Cash and Mobile Money', type: 'Asset', icon: Landmark, tone: '#0f766e' },
  { code: '2100', name: 'Payroll Payable', type: 'Liability', icon: Scale, tone: '#b45309' },
  { code: '4100', name: 'Tuition and School Fees', type: 'Income', icon: ArrowUpRight, tone: '#047857' },
  { code: '5100', name: 'Operating Expenses', type: 'Expense', icon: ArrowDownRight, tone: '#b91c1c' },
];
const accountOptions = accounts.filter(account => account.code !== '2100').concat([
  { code: '2100', name: 'Payroll Payable', type: 'Liability' },
]);
const emptyLine = { accountCode: '1200', accountName: 'Cash and Mobile Money', accountType: 'Asset', debit: '', credit: '' };

export default function AccountingCenter({ readOnly = false }) {
  const [year, setYear] = useState(YEAR);
  const [refreshToken, setRefreshToken] = useState(0);
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState({ accounts: [], totals: { debit: 0, credit: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalForm, setJournalForm] = useState({ description: '', reference: '', date: new Date().toISOString().split('T')[0], lines: [emptyLine, { ...emptyLine, accountCode: '4100', accountName: 'Tuition and School Fees', accountType: 'Income' }] });
  const [journalSaving, setJournalSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/finance/reports/summary?academicYear=${year}`),
      api.get(`/finance/invoices?academicYear=${year}&limit=8`),
      api.get(`/finance/expenses?academicYear=${year}`),
      api.get(`/finance/journal-entries?academicYear=${year}&limit=8`),
      api.get(`/finance/reports/trial-balance?academicYear=${year}`),
    ])
      .then(([summaryData, invoiceData, expenseData, journalData, trialBalanceData]) => {
        if (!active) return;
        setSummary(summaryData);
        setInvoices(invoiceData.invoices || []);
        setExpenses(expenseData || []);
        setJournalEntries(journalData || []);
        setTrialBalance(trialBalanceData || { accounts: [], totals: { debit: 0, credit: 0 } });
      })
      .catch(err => active && setError(err.message || 'Unable to load accounting data'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [year, refreshToken]);

  const receivable = (summary?.revenue?.breakdown || []).reduce(
    (total, item) => total + Math.max((item.totalAmount || 0) - (item.paidAmount || 0), 0), 0
  );
  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const recentActivity = [
    ...invoices.map(invoice => ({
      id: invoice._id,
      date: invoice.createdAt,
      label: `Invoice ${invoice.invoiceNumber}`,
      detail: invoice.student?.user?.name || invoice.studentId,
      amount: invoice.totalAmount,
      kind: 'Receivable',
      positive: true,
    })),
    ...expenses.map(expense => ({
      id: expense._id,
      date: expense.date,
      label: expense.title,
      detail: expense.vendor || expense.category,
      amount: expense.amount,
      kind: 'Expense',
      positive: false,
    })),
    ...journalEntries.map(entry => ({
      id: entry._id,
      date: entry.date,
      label: `${entry.entryNumber} · ${entry.description}`,
      detail: entry.reference || 'General ledger',
      amount: entry.lines.reduce((total, line) => total + (line.debit || 0), 0),
      kind: 'Journal',
      positive: true,
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8);

  const updateJournalLine = (index, field, value) => {
    setJournalForm(current => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line) }));
  };

  const selectJournalAccount = (index, code) => {
    const account = accountOptions.find(option => option.code === code);
    setJournalForm(current => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, accountCode: account.code, accountName: account.name, accountType: account.type } : line) }));
  };

  const submitJournalEntry = async event => {
    event.preventDefault();
    setJournalSaving(true);
    try {
      await api.post('/finance/journal-entries', { ...journalForm, academicYear: year, lines: journalForm.lines.map(line => ({ ...line, debit: Number(line.debit || 0), credit: Number(line.credit || 0) })) });
      setShowJournalModal(false);
      setJournalForm({ description: '', reference: '', date: new Date().toISOString().split('T')[0], lines: [emptyLine, { ...emptyLine, accountCode: '4100', accountName: 'Tuition and School Fees', accountType: 'Income' }] });
      setRefreshToken(token => token + 1);
    } catch (err) {
      setError(err.message || 'Unable to post journal entry');
    } finally {
      setJournalSaving(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>ACCOUNTING WORKSPACE</p>
          <h2 style={s.title}>Books and reconciliation</h2>
          <p style={s.subtitle}>A single view of school income, payables, payroll obligations, and cash controls.</p>
        </div>
        <div style={s.periodControl}>
              <div style={s.panelActions}>
                {!readOnly && <button type="button" style={s.primaryBtn} onClick={() => setShowJournalModal(true)}><Plus size={15} /> Post journal entry</button>}
                <button type="button" style={s.refreshBtn} onClick={() => setRefreshToken(token => token + 1)} title="Refresh accounting data"><RefreshCw size={15} /> Refresh</button>
              </div>
          <select id="accounting-year" style={s.select} value={year} onChange={event => setYear(Number(event.target.value))}>
            {[YEAR, YEAR - 1, YEAR - 2].map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>

      {error && <div style={s.error}><AlertCircle size={16} /> {error}</div>}
      {loading ? <div style={s.empty}>Loading accounting workspace...</div> : (
        <>
          <div style={s.kpiGrid}>
            <Kpi label="Cash collected" value={UGX(summary?.revenue?.totalRevenue)} tone="#047857" />
            <Kpi label="Fees receivable" value={UGX(receivable)} tone="#4f46e5" />
            <Kpi label="Operating expenses" value={UGX(summary?.expenses?.totalExpenses)} tone="#b91c1c" />
            <Kpi label="Net cash position" value={UGX(summary?.netPosition)} tone="#b45309" />
          </div>

          <section style={s.panel}>
            <div style={s.panelHeader}>
              <div><h3 style={s.panelTitle}>Trial balance</h3><p style={s.panelHint}>Posted journal totals for {year}.</p></div>
              <span style={{ ...s.balanceStatus, color: Math.abs(trialBalance.totals.debit - trialBalance.totals.credit) < 0.01 ? '#047857' : '#b91c1c', backgroundColor: Math.abs(trialBalance.totals.debit - trialBalance.totals.credit) < 0.01 ? '#d1fae5' : '#fee2e2' }}>
                {Math.abs(trialBalance.totals.debit - trialBalance.totals.credit) < 0.01 ? 'Balanced' : 'Needs review'}
              </span>
            </div>
            {trialBalance.accounts.length === 0 ? <div style={s.empty}>No journal entries posted for this year.</div> : <div style={s.trialWrap}>
              <table style={s.trialTable}>
                <thead><tr style={s.trialHead}><th style={s.trialCell}>Account</th><th style={s.trialCell}>Type</th><th style={{ ...s.trialCell, textAlign: 'right' }}>Debit</th><th style={{ ...s.trialCell, textAlign: 'right' }}>Credit</th></tr></thead>
                <tbody>{trialBalance.accounts.map(account => <tr key={account.accountCode} style={s.trialRow}><td style={s.trialCell}><strong>{account.accountCode}</strong> · {account.accountName}</td><td style={s.trialCell}>{account.accountType}</td><td style={{ ...s.trialCell, textAlign: 'right' }}>{UGX(account.debit)}</td><td style={{ ...s.trialCell, textAlign: 'right' }}>{UGX(account.credit)}</td></tr>)}</tbody>
                <tfoot><tr style={s.trialTotal}><td style={s.trialCell} colSpan="2">Total</td><td style={{ ...s.trialCell, textAlign: 'right' }}>{UGX(trialBalance.totals.debit)}</td><td style={{ ...s.trialCell, textAlign: 'right' }}>{UGX(trialBalance.totals.credit)}</td></tr></tfoot>
              </table>
            </div>}
          </section>

          <div style={s.grid}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div><h3 style={s.panelTitle}>Chart of accounts</h3><p style={s.panelHint}>Operational accounts for this school.</p></div>
                <Landmark size={20} color="var(--primary)" />
              </div>
              <div style={s.accountList}>
                {accounts.map(account => {
                  const Icon = account.icon;
                  return <div key={account.code} style={s.accountRow}>
                    <div style={{ ...s.accountIcon, color: account.tone, backgroundColor: `${account.tone}18` }}><Icon size={16} /></div>
                    <div style={{ flex: 1 }}><strong style={s.accountName}>{account.name}</strong><span style={s.accountMeta}>{account.code} · {account.type}</span></div>
                    <span style={s.viewLink}>View</span>
                  </div>;
                })}
              </div>
            </section>

            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div><h3 style={s.panelTitle}>Period controls</h3><p style={s.panelHint}>Checks to complete before closing {year}.</p></div>
                <ClipboardCheck size={20} color="var(--primary)" />
              </div>
              <div style={s.checkList}>
                <Check label="Fee invoices issued" detail={`${invoices.length} recent accounts loaded`} done={invoices.length > 0} />
                <Check label="Receivables reviewed" detail={`${UGX(receivable)} outstanding`} done={receivable === 0} />
                <Check label="Expenses approved" detail={`${pendingExpenses.length} claims awaiting review`} done={pendingExpenses.length === 0} />
                <Check label="Bank and mobile money reconciled" detail="Review statement balances before period close" done={false} />
              </div>
            </section>
          </div>

          <section style={s.panel}>
            <div style={s.panelHeader}>
              <div><h3 style={s.panelTitle}>Recent activity</h3><p style={s.panelHint}>Invoices and expenditure recorded in {year}.</p></div>
              <button type="button" style={s.refreshBtn} onClick={() => setRefreshToken(token => token + 1)} title="Refresh accounting data"><RefreshCw size={15} /> Refresh</button>
            </div>
            {recentActivity.length === 0 ? <div style={s.empty}>No accounting activity for this year.</div> : <div style={s.activityList}>
              {recentActivity.map(item => <div key={`${item.kind}-${item.id}`} style={s.activityRow}>
                <div style={{ ...s.activityIcon, color: item.positive ? '#047857' : '#b91c1c', backgroundColor: item.positive ? '#d1fae5' : '#fee2e2' }}>{item.positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</div>
                <div style={{ flex: 1 }}><strong style={s.accountName}>{item.label}</strong><span style={s.accountMeta}>{item.detail} · {item.kind}</span></div>
                <div style={{ textAlign: 'right' }}><strong style={{ color: item.positive ? '#047857' : '#b91c1c' }}>{item.positive ? '+' : '-'}{UGX(item.amount)}</strong><span style={s.accountMeta}>{item.date ? new Date(item.date).toLocaleDateString() : 'No date'}</span></div>
              </div>)}
            </div>}
          </section>
        </>
      )}
      {showJournalModal && <div style={s.overlay}>
        <form style={s.modal} onSubmit={submitJournalEntry}>
          <div style={s.modalHeader}><h3 style={s.panelTitle}>Post journal entry</h3><button type="button" style={s.closeBtn} onClick={() => setShowJournalModal(false)}><X size={18} /></button></div>
          <label style={s.label}>Description<input required style={s.input} value={journalForm.description} onChange={event => setJournalForm({ ...journalForm, description: event.target.value })} /></label>
          <label style={s.label}>Reference<input style={s.input} value={journalForm.reference} onChange={event => setJournalForm({ ...journalForm, reference: event.target.value })} placeholder="Receipt or voucher number" /></label>
          <label style={s.label}>Date<input required type="date" style={s.input} value={journalForm.date} onChange={event => setJournalForm({ ...journalForm, date: event.target.value })} /></label>
          {journalForm.lines.map((line, index) => <div key={index} style={s.lineRow}>
            <select style={s.input} value={line.accountCode} onChange={event => selectJournalAccount(index, event.target.value)}>{accountOptions.map(account => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</select>
            <input type="number" min="0" style={s.amountInput} placeholder="Debit" value={line.debit} onChange={event => updateJournalLine(index, 'debit', event.target.value)} />
            <input type="number" min="0" style={s.amountInput} placeholder="Credit" value={line.credit} onChange={event => updateJournalLine(index, 'credit', event.target.value)} />
          </div>)}
          <button type="submit" style={s.primaryBtn} disabled={journalSaving}>{journalSaving ? 'Posting...' : 'Post balanced entry'}</button>
        </form>
      </div>}
    </div>
  );
}

function Kpi({ label, value, tone }) {
  return <div style={s.kpi}><span style={{ ...s.kpiDot, backgroundColor: tone }} /><div><span style={s.kpiLabel}>{label}</span><strong style={{ ...s.kpiValue, color: tone }}>{value}</strong></div></div>;
}

function Check({ label, detail, done }) {
  return <div style={s.checkRow}><span style={{ ...s.checkIcon, color: done ? '#047857' : '#b45309', backgroundColor: done ? '#d1fae5' : '#fef3c7' }}>{done ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}</span><div><strong style={s.accountName}>{label}</strong><span style={s.accountMeta}>{detail}</span></div></div>;
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' },
  eyebrow: { color: 'var(--primary)', fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 5 },
  title: { color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 },
  subtitle: { color: 'var(--text-tertiary)', fontSize: 13, marginTop: 4 },
  periodControl: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 160 },
  select: { padding: '9px 12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13 },
  error: { display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#991b1b', backgroundColor: '#fee2e2', borderRadius: 8, fontSize: 13 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 },
  kpi: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' },
  kpiDot: { width: 9, height: 36, borderRadius: 5 },
  kpiLabel: { display: 'block', color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' },
  kpiValue: { display: 'block', fontSize: 16, marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  panel: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, boxShadow: 'var(--shadow-sm)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  panelActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  balanceStatus: { padding: '5px 10px', borderRadius: 16, fontSize: 11, fontWeight: 800 },
  panelTitle: { color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 },
  panelHint: { color: 'var(--text-tertiary)', fontSize: 12, marginTop: 3 },
  accountList: { display: 'flex', flexDirection: 'column', gap: 4 },
  accountRow: { display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  accountIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  accountName: { display: 'block', color: 'var(--text-primary)', fontSize: 13 },
  accountMeta: { display: 'block', color: 'var(--text-tertiary)', fontSize: 11, marginTop: 3 },
  viewLink: { color: 'var(--primary)', fontSize: 11, fontWeight: 700 },
  checkList: { display: 'flex', flexDirection: 'column', gap: 14 },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  checkIcon: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityList: { display: 'flex', flexDirection: 'column' },
  activityRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' },
  activityIcon: { width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--primary)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.48)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(100%, 720px)', display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  closeBtn: { display: 'flex', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' },
  label: { display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 },
  input: { width: '100%', padding: '9px 11px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 },
  lineRow: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 120px 120px', gap: 8 },
  amountInput: { minWidth: 0, padding: '9px 8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 },
  empty: { padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  trialWrap: { overflowX: 'auto' },
  trialTable: { width: '100%', borderCollapse: 'collapse', minWidth: 620 },
  trialHead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  trialRow: { borderBottom: '1px solid var(--border)' },
  trialTotal: { borderTop: '2px solid var(--border)', fontWeight: 800 },
  trialCell: { padding: '10px 12px', textAlign: 'left', color: 'var(--text-primary)', fontSize: 12 },
};
