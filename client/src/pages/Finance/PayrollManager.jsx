import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, Plus, CheckCircle, Clock, X, Wallet } from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayrollManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    staffName: '', staffRole: 'teacher', staffId: '',
    month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    baseSalary: '', paymentMethod: 'bank', bankAccount: '',
    allowances: [], deductions: [],
  });
  const [processing, setProcessing] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/finance/payroll?month=${filterMonth}&year=${filterYear}`);
      setRecords(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filterMonth]);

  const addAllowance = () => setForm(f => ({ ...f, allowances: [...f.allowances, { name: '', amount: '' }] }));
  const addDeduction = () => setForm(f => ({ ...f, deductions: [...f.deductions, { name: '', amount: '' }] }));
  const updateLine = (type, idx, field, val) => {
    setForm(f => {
      const arr = [...f[type]];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...f, [type]: arr };
    });
  };
  const removeLine = (type, idx) => setForm(f => ({ ...f, [type]: f[type].filter((_, i) => i !== idx) }));

  const gross = parseFloat(form.baseSalary || 0) + form.allowances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const deductTotal = form.deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const net = gross - deductTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/payroll', {
        ...form,
        baseSalary: parseFloat(form.baseSalary),
        allowances: form.allowances.map(a => ({ name: a.name, amount: parseFloat(a.amount) || 0 })),
        deductions: form.deductions.map(d => ({ name: d.name, amount: parseFloat(d.amount) || 0 })),
      });
      alert('✅ Payroll record created');
      setShowModal(false);
      fetch();
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const handleProcess = async (id) => {
    setProcessing(id);
    try {
      await api.put(`/finance/payroll/${id}/process`, {});
      fetch();
    } catch (err) { alert(err.message); }
    finally { setProcessing(null); }
  };

  const totalGross = records.reduce((s, r) => s + (r.grossPay || 0), 0);
  const totalNet = records.reduce((s, r) => s + (r.netPay || 0), 0);
  const processedCount = records.filter(r => r.status === 'processed').length;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Payroll Manager</h2>
          <p style={s.subtitle}>{MONTHS[filterMonth - 1]} {filterYear}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select style={s.select} value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <button style={s.primaryBtn} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Payroll Entry
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={s.summaryRow}>
        {[
          { label: 'Total Staff', value: records.length, color: '#4f46e5' },
          { label: 'Gross Payroll', value: UGX(totalGross), color: '#f59e0b' },
          { label: 'Net Payroll', value: UGX(totalNet), color: '#10b981' },
          { label: 'Processed', value: `${processedCount} / ${records.length}`, color: '#6366f1' },
        ].map(c => (
          <div key={c.label} style={s.summaryCard}>
            <p style={s.summaryLabel}>{c.label}</p>
            <p style={{ ...s.summaryValue, color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? <div style={s.empty}>Loading payroll…</div> : records.length === 0 ? (
          <div style={s.empty}>No payroll records for {MONTHS[filterMonth - 1]}. Add entries above.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Staff Name','Role','Base Salary','Allowances','Deductions','Net Pay','Method','Status','Action'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r._id} style={s.tr}>
                  <td style={{ ...s.td, fontWeight: 700 }}>{r.staffName}</td>
                  <td style={s.td}><span style={s.roleBadge}>{r.staffRole}</span></td>
                  <td style={s.td}>{UGX(r.baseSalary)}</td>
                  <td style={{ ...s.td, color: '#10b981' }}>+{UGX(r.grossPay - r.baseSalary)}</td>
                  <td style={{ ...s.td, color: '#ef4444' }}>-{UGX(r.totalDeductions)}</td>
                  <td style={{ ...s.td, fontWeight: 800, color: 'var(--primary)' }}>{UGX(r.netPay)}</td>
                  <td style={s.td}>{r.paymentMethod}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(r.status === 'processed' ? { color: '#10b981', backgroundColor: '#d1fae5' } : { color: '#f59e0b', backgroundColor: '#fef3c7' }) }}>
                      {r.status === 'processed' ? <CheckCircle size={11} /> : <Clock size={11} />}
                      {r.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    {r.status !== 'processed' && (
                      <button style={s.processBtn} onClick={() => handleProcess(r._id)} disabled={processing === r._id}>
                        {processing === r._id ? '…' : 'Process'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Add Payroll Entry</h3>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Staff Name</label>
                  <input required style={s.input} value={form.staffName} onChange={e => setForm({...form, staffName: e.target.value})} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Role</label>
                  <select style={s.input} value={form.staffRole} onChange={e => setForm({...form, staffRole: e.target.value})}>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Base Salary (UGX)</label>
                  <input required type="number" style={s.input} value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Payment Method</label>
                  <select style={s.input} value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                    <option value="bank">Bank Transfer</option>
                    <option value="momo">Mobile Money</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              {/* Allowances */}
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <span style={s.sectionLabel}>Allowances</span>
                  <button type="button" style={s.addLineBtn} onClick={addAllowance}>+ Add</button>
                </div>
                {form.allowances.map((a, i) => (
                  <div key={i} style={s.lineRow}>
                    <input placeholder="Name (e.g. Housing)" style={{ ...s.input, flex: 1 }} value={a.name} onChange={e => updateLine('allowances', i, 'name', e.target.value)} />
                    <input type="number" placeholder="UGX" style={{ ...s.input, width: 120 }} value={a.amount} onChange={e => updateLine('allowances', i, 'amount', e.target.value)} />
                    <button type="button" style={s.removeBtn} onClick={() => removeLine('allowances', i)}><X size={14} /></button>
                  </div>
                ))}
              </div>

              {/* Deductions */}
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <span style={s.sectionLabel}>Deductions</span>
                  <button type="button" style={s.addLineBtn} onClick={addDeduction}>+ Add</button>
                </div>
                {form.deductions.map((d, i) => (
                  <div key={i} style={s.lineRow}>
                    <input placeholder="Name (e.g. NSSF)" style={{ ...s.input, flex: 1 }} value={d.name} onChange={e => updateLine('deductions', i, 'name', e.target.value)} />
                    <input type="number" placeholder="UGX" style={{ ...s.input, width: 120 }} value={d.amount} onChange={e => updateLine('deductions', i, 'amount', e.target.value)} />
                    <button type="button" style={s.removeBtn} onClick={() => removeLine('deductions', i)}><X size={14} /></button>
                  </div>
                ))}
              </div>

              {/* Net summary preview */}
              <div style={s.netSummary}>
                <div style={s.netRow}><span>Gross Pay</span><span style={{ color: '#f59e0b', fontWeight: 700 }}>{UGX(gross)}</span></div>
                <div style={s.netRow}><span>Deductions</span><span style={{ color: '#ef4444', fontWeight: 700 }}>-{UGX(deductTotal)}</span></div>
                <div style={{ ...s.netRow, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span style={{ fontWeight: 700 }}>Net Pay</span>
                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: 16 }}>{UGX(net)}</span>
                </div>
              </div>

              <button type="submit" style={s.primaryBtn}>Save Payroll Entry</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  select: { padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  summaryCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' },
  summaryLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: 800 },
  tableWrap: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'auto', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 860 },
  thead: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' },
  th: { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 16px', fontSize: 13, color: 'var(--text-primary)' },
  roleBadge: { backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  processBtn: { backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 12 },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '10px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' },
  addLineBtn: { backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  lineRow: { display: 'flex', gap: 8, alignItems: 'center' },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, display: 'flex', flexShrink: 0 },
  netSummary: { backgroundColor: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 },
  netRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
};
