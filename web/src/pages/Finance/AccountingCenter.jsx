import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2,
  ClipboardCheck, Landmark, Plus, RefreshCw, Scale, WalletCards, X,
  FileSpreadsheet, PieChart, Layers, Trash2, Printer
} from 'lucide-react';

const YEAR = new Date().getFullYear();
const UGX = value => `UGX ${Number(value || 0).toLocaleString()}`;

export default function AccountingCenter({ readOnly = false }) {
  const [year, setYear] = useState(YEAR);
  const [refreshToken, setRefreshToken] = useState(0);
  const [reportTab, setReportTab] = useState('trial-balance'); // trial-balance, profit-loss, balance-sheet, journals
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState({ accounts: [], totals: { debit: 0, credit: 0 } });
  const [profitLoss, setProfitLoss] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Journal Entry Modal State
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalForm, setJournalForm] = useState({
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    lines: [
      { accountId: '', accountCode: '', accountName: '', accountType: '', debit: '', credit: '' },
      { accountId: '', accountCode: '', accountName: '', accountType: '', debit: '', credit: '' }
    ]
  });
  const [journalSaving, setJournalSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      api.get(`/finance/reports/summary?academicYear=${year}`),
      api.get(`/finance/invoices?academicYear=${year}&limit=8`),
      api.get(`/finance/expenses?academicYear=${year}`),
      api.get(`/finance/journal-entries?academicYear=${year}&limit=20`),
      api.get(`/finance/reports/trial-balance?academicYear=${year}`),
      api.get(`/finance/reports/profit-loss?academicYear=${year}`).catch(() => null),
      api.get(`/finance/reports/balance-sheet?academicYear=${year}`).catch(() => null),
      api.get('/finance/accounts').catch(() => ({ accounts: [] })),
    ])
      .then(([summaryData, invoiceData, expenseData, journalData, trialBalanceData, plData, bsData, accData]) => {
        if (!active) return;
        setSummary(summaryData);
        setInvoices(invoiceData.invoices || []);
        setExpenses(expenseData || []);
        setJournalEntries(journalData || []);
        setTrialBalance(trialBalanceData || { accounts: [], totals: { debit: 0, credit: 0 } });
        setProfitLoss(plData);
        setBalanceSheet(bsData);
        setAllAccounts(accData.accounts || []);
      })
      .catch(err => active && setError(err.message || 'Unable to load accounting data'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [year, refreshToken]);

  const receivable = (summary?.revenue?.breakdown || []).reduce(
    (total, item) => total + Math.max((item.totalAmount || 0) - (item.paidAmount || 0), 0), 0
  );
  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');

  const updateJournalLine = (index, field, value) => {
    setJournalForm(current => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line)
    }));
  };

  const selectJournalAccount = (index, accountId) => {
    const account = allAccounts.find(a => a._id === accountId);
    if (!account) return;
    setJournalForm(current => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, accountId: account._id, accountCode: account.code, accountName: account.name, accountType: account.type }
          : line
      )
    }));
  };

  const addJournalLine = () => {
    setJournalForm(current => ({
      ...current,
      lines: [...current.lines, { accountId: '', accountCode: '', accountName: '', accountType: '', debit: '', credit: '' }]
    }));
  };

  const removeJournalLine = (index) => {
    setJournalForm(current => ({
      ...current,
      lines: current.lines.filter((_, idx) => idx !== index)
    }));
  };

  const totalJournalDebit = journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalJournalCredit = journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalJournalDebit - totalJournalCredit) < 0.01 && totalJournalDebit > 0;

  const submitJournalEntry = async event => {
    event.preventDefault();
    if (!isJournalBalanced) {
      return alert(`Cannot post entry: Total Debits (${UGX(totalJournalDebit)}) must equal Total Credits (${UGX(totalJournalCredit)})`);
    }
    setJournalSaving(true);
    try {
      await api.post('/finance/journal-entries', {
        ...journalForm,
        academicYear: year,
        lines: journalForm.lines.map(line => ({
          accountCode: line.accountCode,
          accountName: line.accountName,
          accountType: line.accountType,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0)
        }))
      });
      setShowJournalModal(false);
      setJournalForm({
        description: '',
        reference: '',
        date: new Date().toISOString().split('T')[0],
        lines: [
          { accountId: '', accountCode: '', accountName: '', accountType: '', debit: '', credit: '' },
          { accountId: '', accountCode: '', accountName: '', accountType: '', debit: '', credit: '' }
        ]
      });
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
          <p style={s.eyebrow}>QUICKBOOKS ACCOUNTING WORKSPACE</p>
          <h2 style={s.title}>General Ledger & Financial Statements</h2>
          <p style={s.subtitle}>Double-entry accounting engine with automated Trial Balance, Profit & Loss, and Balance Sheet.</p>
        </div>
        <div style={s.periodControl}>
          <div style={s.panelActions}>
            {!readOnly && (
              <button type="button" style={s.primaryBtn} onClick={() => setShowJournalModal(true)}>
                <Plus size={15} /> Post Manual Journal
              </button>
            )}
            <button type="button" style={s.refreshBtn} onClick={() => setRefreshToken(token => token + 1)} title="Refresh accounting data">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
          <select id="accounting-year" style={s.select} value={year} onChange={event => setYear(Number(event.target.value))}>
            {[YEAR, YEAR - 1, YEAR - 2].map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>

      {error && <div style={s.error}><AlertCircle size={16} /> {error}</div>}

      {loading ? <div style={s.empty}>Computing financial statements...</div> : (
        <>
          <div style={s.kpiGrid}>
            <Kpi label="Total Cash & Bank" value={UGX(summary?.revenue?.totalRevenue)} tone="#047857" />
            <Kpi label="Fees Receivable (1200)" value={UGX(receivable)} tone="#4f46e5" />
            <Kpi label="Operating Expenses (5000s)" value={UGX(summary?.expenses?.totalExpenses)} tone="#b91c1c" />
            <Kpi label="Net Accounting Position" value={UGX(summary?.netPosition)} tone="#c59b27" />
          </div>

          {/* Statement Nav Switcher */}
          <div style={s.statementNav}>
            <button
              style={{ ...s.statementBtn, ...(reportTab === 'trial-balance' ? s.statementBtnActive : {}) }}
              onClick={() => setReportTab('trial-balance')}
            >
              <Scale size={15} /> Trial Balance
            </button>
            <button
              style={{ ...s.statementBtn, ...(reportTab === 'profit-loss' ? s.statementBtnActive : {}) }}
              onClick={() => setReportTab('profit-loss')}
            >
              <FileSpreadsheet size={15} /> Profit & Loss Statement (P&L)
            </button>
            <button
              style={{ ...s.statementBtn, ...(reportTab === 'balance-sheet' ? s.statementBtnActive : {}) }}
              onClick={() => setReportTab('balance-sheet')}
            >
              <Landmark size={15} /> Balance Sheet
            </button>
            <button
              style={{ ...s.statementBtn, ...(reportTab === 'journals' ? s.statementBtnActive : {}) }}
              onClick={() => setReportTab('journals')}
            >
              <Layers size={15} /> Journal Entries Log
            </button>
          </div>

          {/* 1. Trial Balance Tab */}
          {reportTab === 'trial-balance' && (
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <h3 style={s.panelTitle}>Trial Balance</h3>
                  <p style={s.panelHint}>Debit and Credit equality verification across all active accounts for {year}.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button onClick={() => window.print()} style={s.refreshBtn}><Printer size={14} /> Print</button>
                  <span style={{
                    ...s.balanceStatus,
                    color: Math.abs(trialBalance.totals.debit - trialBalance.totals.credit) < 0.01 ? '#047857' : '#b91c1c',
                    backgroundColor: Math.abs(trialBalance.totals.debit - trialBalance.totals.credit) < 0.01 ? '#d1fae5' : '#fee2e2'
                  }}>
                    {Math.abs(trialBalance.totals.debit - trialBalance.totals.credit) < 0.01 ? '✓ Debits = Credits (Balanced)' : '⚠️ Out of Balance'}
                  </span>
                </div>
              </div>
              {trialBalance.accounts.length === 0 ? (
                <div style={s.empty}>No journal postings recorded for {year}. Invoices and cash receipts will automatically populate here.</div>
              ) : (
                <div style={s.trialWrap}>
                  <table style={s.trialTable}>
                    <thead>
                      <tr style={s.trialHead}>
                        <th style={s.trialCell}>Account Code & Name</th>
                        <th style={s.trialCell}>Classification</th>
                        <th style={{ ...s.trialCell, textAlign: 'right' }}>Debit (UGX)</th>
                        <th style={{ ...s.trialCell, textAlign: 'right' }}>Credit (UGX)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.accounts.map(account => (
                        <tr key={account.accountCode} style={s.trialRow}>
                          <td style={s.trialCell}>
                            <strong style={{ color: 'var(--primary)' }}>{account.accountCode}</strong> — {account.accountName}
                          </td>
                          <td style={s.trialCell}>
                            <span style={s.typeTag}>{account.accountType}</span>
                          </td>
                          <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600 }}>{account.debit > 0 ? UGX(account.debit) : '—'}</td>
                          <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600 }}>{account.credit > 0 ? UGX(account.credit) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={s.trialTotal}>
                        <td style={s.trialCell} colSpan="2">TOTAL REPORT EQUALITY</td>
                        <td style={{ ...s.trialCell, textAlign: 'right', color: '#10b981' }}>{UGX(trialBalance.totals.debit)}</td>
                        <td style={{ ...s.trialCell, textAlign: 'right', color: '#10b981' }}>{UGX(trialBalance.totals.credit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* 2. Profit & Loss Tab */}
          {reportTab === 'profit-loss' && (
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <h3 style={s.panelTitle}>Income Statement (Profit & Loss)</h3>
                  <p style={s.panelHint}>Operating performance from school fees, tours, auxiliary revenue minus operational costs for {year}.</p>
                </div>
                <button onClick={() => window.print()} style={s.refreshBtn}><Printer size={14} /> Print Statement</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Revenue */}
                <div>
                  <div style={s.statementSectionHeader}>
                    <span>4000 REVENUE & INCOME</span>
                    <span>{UGX(profitLoss?.totalIncome || 0)}</span>
                  </div>
                  <table style={s.trialTable}>
                    <tbody>
                      {(profitLoss?.incomeAccounts || []).length === 0 ? (
                        <tr><td colSpan="2" style={s.empty}>No revenue entries recorded</td></tr>
                      ) : (
                        profitLoss.incomeAccounts.map(acc => (
                          <tr key={acc.code} style={s.trialRow}>
                            <td style={s.trialCell}><strong>{acc.code}</strong> — {acc.name}</td>
                            <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600, color: '#047857' }}>{UGX(acc.balance)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Operating Expenses */}
                <div>
                  <div style={s.statementSectionHeader}>
                    <span>5000 OPERATING EXPENDITURES</span>
                    <span style={{ color: '#ef4444' }}>({UGX(profitLoss?.totalExpenses || 0)})</span>
                  </div>
                  <table style={s.trialTable}>
                    <tbody>
                      {(profitLoss?.expenseAccounts || []).length === 0 ? (
                        <tr><td colSpan="2" style={s.empty}>No expense entries recorded</td></tr>
                      ) : (
                        profitLoss.expenseAccounts.map(acc => (
                          <tr key={acc.code} style={s.trialRow}>
                            <td style={s.trialCell}><strong>{acc.code}</strong> — {acc.name}</td>
                            <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{UGX(acc.balance)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Net Surplus / Deficit */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 8,
                  border: '2px solid var(--border)'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>NET OPERATING SURPLUS / (DEFICIT)</h4>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Total Revenue less Total Operating Expenditures</span>
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: (profitLoss?.netIncome || 0) >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {UGX(profitLoss?.netIncome || 0)}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3. Balance Sheet Tab */}
          {reportTab === 'balance-sheet' && (
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <h3 style={s.panelTitle}>Balance Sheet</h3>
                  <p style={s.panelHint}>Statement of Financial Position as at 31 Dec {year}. Accounting Equation: Assets = Liabilities + Equity.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button onClick={() => window.print()} style={s.refreshBtn}><Printer size={14} /> Print Statement</button>
                  <span style={{
                    ...s.balanceStatus,
                    color: balanceSheet?.isBalanced ? '#047857' : '#b91c1c',
                    backgroundColor: balanceSheet?.isBalanced ? '#d1fae5' : '#fee2e2'
                  }}>
                    {balanceSheet?.isBalanced ? '✓ Equation Verified (A = L + E)' : 'Evaluating Equation'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {/* Assets Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={s.statementSectionHeader}>
                    <span>ASSETS (1000s)</span>
                    <span style={{ color: '#4f46e5' }}>{UGX(balanceSheet?.totalAssets || 0)}</span>
                  </div>
                  <table style={s.trialTable}>
                    <tbody>
                      {(balanceSheet?.assets || []).length === 0 ? (
                        <tr><td style={s.empty}>No assets recorded</td></tr>
                      ) : (
                        balanceSheet.assets.map(a => (
                          <tr key={a.code} style={s.trialRow}>
                            <td style={s.trialCell}><strong>{a.code}</strong> — {a.name}</td>
                            <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600 }}>{UGX(a.balance)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={s.trialTotal}>
                        <td style={s.trialCell}>TOTAL ASSETS</td>
                        <td style={{ ...s.trialCell, textAlign: 'right', color: '#4f46e5' }}>{UGX(balanceSheet?.totalAssets || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Liabilities & Equity Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={s.statementSectionHeader}>
                    <span>LIABILITIES & EQUITY (2000s & 3000s)</span>
                    <span style={{ color: '#c59b27' }}>{UGX(balanceSheet?.totalLiabilitiesAndEquity || 0)}</span>
                  </div>
                  <table style={s.trialTable}>
                    <tbody>
                      <tr>
                        <td colSpan="2" style={{ ...s.trialCell, fontWeight: 700, backgroundColor: 'var(--bg-tertiary)' }}>Liabilities:</td>
                      </tr>
                      {(balanceSheet?.liabilities || []).map(l => (
                        <tr key={l.code} style={s.trialRow}>
                          <td style={s.trialCell}><strong>{l.code}</strong> — {l.name}</td>
                          <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600 }}>{UGX(l.balance)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan="2" style={{ ...s.trialCell, fontWeight: 700, backgroundColor: 'var(--bg-tertiary)' }}>Equity & Retained Earnings:</td>
                      </tr>
                      {(balanceSheet?.equity || []).map(e => (
                        <tr key={e.code} style={s.trialRow}>
                          <td style={s.trialCell}><strong>{e.code}</strong> — {e.name}</td>
                          <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600 }}>{UGX(e.balance)}</td>
                        </tr>
                      ))}
                      <tr style={s.trialRow}>
                        <td style={s.trialCell}><strong>Current Year Surplus / (Deficit)</strong></td>
                        <td style={{ ...s.trialCell, textAlign: 'right', fontWeight: 600, color: (balanceSheet?.netIncome || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                          {UGX(balanceSheet?.netIncome || 0)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr style={s.trialTotal}>
                        <td style={s.trialCell}>TOTAL LIABILITIES & EQUITY</td>
                        <td style={{ ...s.trialCell, textAlign: 'right', color: '#c59b27' }}>{UGX(balanceSheet?.totalLiabilitiesAndEquity || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 4. Journal Entries Log */}
          {reportTab === 'journals' && (
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <h3 style={s.panelTitle}>General Journal Entries Log</h3>
                  <p style={s.panelHint}>Chronological record of double-entry ledger postings for {year}.</p>
                </div>
                {!readOnly && (
                  <button type="button" style={s.primaryBtn} onClick={() => setShowJournalModal(true)}>
                    <Plus size={15} /> + New Journal Entry
                  </button>
                )}
              </div>

              {journalEntries.length === 0 ? (
                <div style={s.empty}>No journal vouchers posted for {year}.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {journalEntries.map(entry => (
                    <div key={entry._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, backgroundColor: 'var(--bg-tertiary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <strong style={{ color: 'var(--primary)', fontSize: 14 }}>{entry.entryNumber}</strong>
                          <span style={{ marginLeft: 12, fontWeight: 600 }}>{entry.description}</span>
                          {entry.reference && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-tertiary)' }}>Ref: {entry.reference}</span>}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                            <th style={{ padding: '6px 8px' }}>Account</th>
                            <th style={{ padding: '6px 8px' }}>Type</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Debit (UGX)</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Credit (UGX)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((l, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px dotted var(--border)' }}>
                              <td style={{ padding: '6px 8px' }}><strong>{l.accountCode}</strong> {l.accountName}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--text-tertiary)' }}>{l.accountType}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{l.debit > 0 ? UGX(l.debit) : '—'}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{l.credit > 0 ? UGX(l.credit) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Quick Period Controls Checklist */}
          <div style={s.grid}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div><h3 style={s.panelTitle}>QuickBooks Accounting Checklist</h3><p style={s.panelHint}>Reconciliation checks before closing period {year}.</p></div>
                <ClipboardCheck size={20} color="var(--primary)" />
              </div>
              <div style={s.checkList}>
                <Check label="Invoices issued & posted" detail={`${invoices.length} active invoices loaded`} done={invoices.length > 0} />
                <Check label="Receivables ledger up to date" detail={`${UGX(receivable)} outstanding receivables`} done={receivable === 0} />
                <Check label="Expenses approved" detail={`${pendingExpenses.length} claims awaiting review`} done={pendingExpenses.length === 0} />
                <Check label="Ledger equality verified" detail="Trial Balance Debits === Credits verified" done={Math.abs(trialBalance.totals.debit - trialBalance.totals.credit) < 0.01} />
              </div>
            </section>
          </div>
        </>
      )}

      {/* Manual Journal Entry Modal */}
      {showJournalModal && (
        <div style={s.overlay}>
          <form style={{ ...s.modal, maxWidth: 760 }} onSubmit={submitJournalEntry}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.panelTitle}>Post Double-Entry Journal Voucher</h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>General Ledger Journal Entry Rule: Total Debits must equal Total Credits</span>
              </div>
              <button type="button" style={s.closeBtn} onClick={() => setShowJournalModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
              <label style={s.label}>Description / Narration
                <input required style={s.input} value={journalForm.description} onChange={event => setJournalForm({ ...journalForm, description: event.target.value })} placeholder="e.g. Bank charges or depreciation" />
              </label>
              <label style={s.label}>Reference #
                <input style={s.input} value={journalForm.reference} onChange={event => setJournalForm({ ...journalForm, reference: event.target.value })} placeholder="Voucher or ref" />
              </label>
              <label style={s.label}>Posting Date
                <input required type="date" style={s.input} value={journalForm.date} onChange={event => setJournalForm({ ...journalForm, date: event.target.value })} />
              </label>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={s.label}>Journal Lines</span>
                <button type="button" onClick={addJournalLine} style={{ ...s.primaryBtn, padding: '4px 10px', fontSize: 11, backgroundColor: '#c59b27' }}>
                  + Add Line
                </button>
              </div>

              {journalForm.lines.map((line, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select
                    required
                    style={s.input}
                    value={line.accountId}
                    onChange={event => selectJournalAccount(index, event.target.value)}
                  >
                    <option value="">-- Choose Account from COA --</option>
                    {allAccounts.map(account => (
                      <option key={account._id} value={account._id}>
                        {account.code} · {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    style={s.amountInput}
                    placeholder="Debit"
                    value={line.debit}
                    onChange={event => updateJournalLine(index, 'debit', event.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    style={s.amountInput}
                    placeholder="Credit"
                    value={line.credit}
                    onChange={event => updateJournalLine(index, 'credit', event.target.value)}
                  />
                  {journalForm.lines.length > 2 && (
                    <button type="button" onClick={() => removeJournalLine(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 32px', gap: 8, padding: '10px 0', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                <span>Totals</span>
                <span style={{ color: '#10b981' }}>{UGX(totalJournalDebit)}</span>
                <span style={{ color: '#10b981' }}>{UGX(totalJournalCredit)}</span>
                <span />
              </div>

              {!isJournalBalanced && totalJournalDebit > 0 && (
                <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>
                  ⚠️ Out of balance by {UGX(Math.abs(totalJournalDebit - totalJournalCredit))}. Total debits must equal credits.
                </div>
              )}
            </div>

            <button type="submit" style={s.primaryBtn} disabled={journalSaving || !isJournalBalanced}>
              {journalSaving ? 'Posting...' : isJournalBalanced ? 'Post Balanced Entry to General Ledger' : 'Cannot Post: Out of Balance'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }) {
  return (
    <div style={s.kpi}>
      <span style={{ ...s.kpiDot, backgroundColor: tone }} />
      <div>
        <span style={s.kpiLabel}>{label}</span>
        <strong style={{ ...s.kpiValue, color: tone }}>{value}</strong>
      </div>
    </div>
  );
}

function Check({ label, detail, done }) {
  return (
    <div style={s.checkRow}>
      <span style={{ ...s.checkIcon, color: done ? '#047857' : '#b45309', backgroundColor: done ? '#d1fae5' : '#fef3c7' }}>
        {done ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      </span>
      <div>
        <strong style={s.accountName}>{label}</strong>
        <span style={s.accountMeta}>{detail}</span>
      </div>
    </div>
  );
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
  statementNav: { display: 'flex', gap: 8, flexWrap: 'wrap', backgroundColor: 'var(--bg-secondary)', padding: 6, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
  statementBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'var(--transition)' },
  statementBtnActive: { backgroundColor: 'var(--primary)', color: '#fff', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' },
  statementSectionHeader: { display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 6, fontWeight: 800, fontSize: 13, letterSpacing: 0.5, borderLeft: '4px solid var(--primary)', marginBottom: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  panel: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, boxShadow: 'var(--shadow-sm)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  panelActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  balanceStatus: { padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 800 },
  panelTitle: { color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 },
  panelHint: { color: 'var(--text-tertiary)', fontSize: 12, marginTop: 3 },
  accountName: { display: 'block', color: 'var(--text-primary)', fontSize: 13 },
  accountMeta: { display: 'block', color: 'var(--text-tertiary)', fontSize: 11, marginTop: 3 },
  checkList: { display: 'flex', flexDirection: 'column', gap: 14 },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  checkIcon: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(100%, 760px)', display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { display: 'flex', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' },
  label: { display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 },
  input: { width: '100%', padding: '9px 11px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 },
  amountInput: { width: '100%', padding: '9px 8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 },
  empty: { padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  trialWrap: { overflowX: 'auto' },
  trialTable: { width: '100%', borderCollapse: 'collapse', minWidth: 620 },
  trialHead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  trialRow: { borderBottom: '1px solid var(--border)' },
  trialTotal: { borderTop: '2px solid var(--border)', fontWeight: 800, backgroundColor: 'var(--bg-tertiary)' },
  trialCell: { padding: '10px 14px', textAlign: 'left', color: 'var(--text-primary)', fontSize: 13 },
  typeTag: { fontSize: 11, padding: '3px 8px', borderRadius: 4, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 },
};
