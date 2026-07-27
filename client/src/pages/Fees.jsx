import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CreditCard, DollarSign, Plus, Eye, Receipt, FileText } from 'lucide-react';

export default function Fees() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [invoice, setInvoice] = useState(null);
  
  const [feeForm, setFeeForm] = useState({
    classLevel: 'P1',
    term: 'Term 1',
    tuitionFee: 400000,
    developmentFee: 100000,
    functionalFee: 50000
  });

  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    term: 'Term 1',
    amountPaid: '',
    paymentMethod: 'MTN Mobile Money',
    transactionReference: '',
    remarks: ''
  });

  const fetchClassesAndStudents = async () => {
    try {
      const clsList = await api.get('/classes');
      setClasses(clsList);
      
      const studList = await api.get('/students');
      setStudents(studList);
      if (studList.length > 0) {
        setSelectedStudentId(studList[0]._id);
        setPaymentForm(prev => ({ ...prev, studentId: studList[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load classes/students');
    }
  };

  const fetchInvoice = async () => {
    if (!selectedStudentId) return;
    try {
      const data = await api.get(`/fees/invoice/${selectedStudentId}/${term}`);
      setInvoice(data);
    } catch (err) {
      console.error('Failed to fetch invoice');
    }
  };

  useEffect(() => {
    fetchClassesAndStudents();
  }, []);

  useEffect(() => {
    fetchInvoice();
  }, [selectedStudentId, term]);

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/structures', feeForm);
      alert('Fee structure updated successfully!');
      fetchInvoice();
    } catch (err) {
      alert(err.message || 'Failed to update fee structure');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/payments', paymentForm);
      setPaymentForm(prev => ({
        ...prev,
        amountPaid: '',
        transactionReference: '',
        remarks: ''
      }));
      fetchInvoice();
      alert('Payment recorded successfully!');
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    }
  };

  return (
    <div style={styles.container}>
      {/* Overview stats & quick controls */}
      <div style={styles.topGrid}>
        {/* Configure Fees Structure */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <DollarSign size={20} color="var(--primary)" />
            <h3 style={styles.panelTitle}>Setup School Fees (UGX)</h3>
          </div>

          <form onSubmit={handleFeeSubmit} style={styles.form}>
            <div style={styles.fieldGroupRow}>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Class Level</label>
                <select 
                  value={feeForm.classLevel} 
                  onChange={(e) => setFeeForm({ ...feeForm, classLevel: e.target.value })}
                  style={styles.select}
                >
                  {['Nursery', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Term</label>
                <select 
                  value={feeForm.term} 
                  onChange={(e) => setFeeForm({ ...feeForm, term: e.target.value })}
                  style={styles.select}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Tuition Fees (UGX)</label>
              <input 
                type="number" 
                value={feeForm.tuitionFee} 
                onChange={(e) => setFeeForm({ ...feeForm, tuitionFee: e.target.value })}
                style={styles.input} 
              />
            </div>

            <div style={styles.fieldGroupRow}>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Development Fee</label>
                <input 
                  type="number" 
                  value={feeForm.developmentFee} 
                  onChange={(e) => setFeeForm({ ...feeForm, developmentFee: e.target.value })}
                  style={styles.input} 
                />
              </div>

              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Functional Fee</label>
                <input 
                  type="number" 
                  value={feeForm.functionalFee} 
                  onChange={(e) => setFeeForm({ ...feeForm, functionalFee: e.target.value })}
                  style={styles.input} 
                />
              </div>
            </div>

            <button type="submit" style={styles.submitBtn}>
              Set Fees Structure
            </button>
          </form>
        </div>

        {/* Record Student Payment */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <CreditCard size={20} color="var(--primary)" />
            <h3 style={styles.panelTitle}>Record Fees Payment</h3>
          </div>

          <form onSubmit={handlePaymentSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Select Student</label>
              <select 
                value={paymentForm.studentId} 
                onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                style={styles.select}
              >
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.user?.name} ({s.studentId})</option>
                ))}
              </select>
            </div>

            <div style={styles.fieldGroupRow}>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Amount Paid (UGX)</label>
                <input 
                  type="number" 
                  required 
                  placeholder="e.g. 300000" 
                  value={paymentForm.amountPaid} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                  style={styles.input} 
                />
              </div>

              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Method</label>
                <select 
                  value={paymentForm.paymentMethod} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  style={styles.select}
                >
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Bank Deposit">Bank Deposit</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Txn Reference / Bank Slip Number</label>
              <input 
                type="text" 
                placeholder="e.g. PP260320..." 
                value={paymentForm.transactionReference} 
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                style={styles.input} 
              />
            </div>

            <button type="submit" style={styles.submitBtn}>
              Record Fee Payment
            </button>
          </form>
        </div>
      </div>

      {/* Invoice Ledger View */}
      <div style={styles.panel}>
        <div style={styles.invoiceFilterHeader}>
          <div style={styles.panelHeader}>
            <Receipt size={20} color="var(--primary)" />
            <h3 style={styles.panelTitle}>Fees Ledger Statement</h3>
          </div>

          <div style={styles.filterGroup}>
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} style={styles.selectSmall}>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.user?.name}</option>
              ))}
            </select>

            <select value={term} onChange={(e) => setTerm(e.target.value)} style={styles.selectSmall}>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </div>

        {invoice ? (
          <div style={styles.invoiceContainer}>
            {/* Invoice breakdown summary */}
            <div style={styles.summaryGrid}>
              <div style={{ ...styles.summaryCard, borderLeft: '4px solid var(--primary)' }}>
                <span style={styles.summaryLabel}>Total Invoiced Fees</span>
                <span style={styles.summaryValue}>UGX {invoice.summary.totalInvoiced.toLocaleString()}</span>
              </div>
              <div style={{ ...styles.summaryCard, borderLeft: '4px solid var(--success)' }}>
                <span style={styles.summaryLabel}>Total Paid Amount</span>
                <span style={styles.summaryValue}>UGX {invoice.summary.totalPaid.toLocaleString()}</span>
              </div>
              <div style={{ ...styles.summaryCard, borderLeft: '4px solid var(--danger)' }}>
                <span style={styles.summaryLabel}>Outstanding Balance</span>
                <span style={styles.summaryValue}>UGX {invoice.summary.balance.toLocaleString()}</span>
              </div>
            </div>

            {/* Payments Table ledger list */}
            <div style={styles.tableTitle}>Transaction History</div>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Receipt No.</th>
                    <th style={styles.th}>Payment Date</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.length > 0 ? (
                    invoice.payments.map(pay => (
                      <tr key={pay._id} style={styles.tableRow}>
                        <td style={{ ...styles.td, fontWeight: '700', color: 'var(--primary)' }}>{pay.receiptNumber}</td>
                        <td style={styles.td}>{new Date(pay.paymentDate).toLocaleDateString()}</td>
                        <td style={{ ...styles.td, fontWeight: '700' }}>UGX {pay.amountPaid.toLocaleString()}</td>
                        <td style={styles.td}>{pay.paymentMethod}</td>
                        <td style={styles.td}>{pay.transactionReference || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={styles.noData}>
                        No payments recorded for this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={styles.noData}>Select a student to display fee statement ledger.</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: '24px',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    }
  },
  panel: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '14px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  invoiceFilterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '14px',
  },
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  selectSmall: {
    padding: '8px 12px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldGroupRow: {
    display: 'flex',
    gap: '12px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  submitBtn: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: '600',
  },
  invoiceContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  summaryCard: {
    backgroundColor: 'var(--bg-primary)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  summaryLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  tableTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
  },
  tableCard: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--bg-tertiary)',
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
  },
  tableRow: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  noData: {
    padding: '32px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
  }
};
