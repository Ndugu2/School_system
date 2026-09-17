import React, { useState, useEffect } from 'react';
import { api, feesApi } from '../services/api';
import { CreditCard, DollarSign, Plus, Eye, Receipt, FileText, Download, BarChart3, MessageSquare, AlertCircle } from 'lucide-react';

export default function FeesEnhanced() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(2026);
  const [invoice, setInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('ledger');
  const [classReports, setClassReports] = useState(null);
  const [overdueStudents, setOverdueStudents] = useState(null);
  const [loading, setLoading] = useState(false);

  const [feeForm, setFeeForm] = useState({
    classLevel: 'S1',
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

  const [paymentPlanForm, setPaymentPlanForm] = useState({
    studentId: '',
    term: 'Term 1',
    installmentCount: 2,
    installments: []
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
      const data = await api.get(`/fees/invoice/${selectedStudentId}/${term}?academicYear=${academicYear}`);
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
  }, [selectedStudentId, term, academicYear]);

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

  const handlePaymentPlanSubmit = async (e) => {
    e.preventDefault();
    if (!invoice?.summary) {
      alert('Please select a student and load their invoice first');
      return;
    }

    try {
      const totalAmount = invoice.summary.totalInvoiced;
      const count = parseInt(paymentPlanForm.installmentCount);
      const perInstallment = Math.round(totalAmount / count);
      const insts = [];
      
      for (let i = 0; i < count; i++) {
        const daysOffset = (i + 1) * 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysOffset);
        insts.push({
          dueDate: dueDate.toISOString().split('T')[0],
          amount: i === count - 1 ? totalAmount - (perInstallment * (count - 1)) : perInstallment
        });
      }

      await api.post('/fees/payment-plans', {
        studentId: selectedStudentId,
        term,
        academicYear,
        totalAmount,
        installments: insts,
        notes: `Payment plan: ${count} installments`
      });
      
      alert('✅ Payment plan created! Parent notification sent.');
      setPaymentPlanForm({ ...paymentPlanForm, installmentCount: 2 });
    } catch (err) {
      alert(err.message || 'Failed to create payment plan');
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const reports = await api.get(`/fees/reports/class-summary?term=${term}&academicYear=${academicYear}`);
      setClassReports(reports);

      const overdue = await api.get(`/fees/reports/overdue-students?term=${term}&academicYear=${academicYear}`);
      setOverdueStudents(overdue);
    } catch (err) {
      console.error('Failed to fetch reports');
    }
    setLoading(false);
  };

  const handleSendReminders = async () => {
    if (!window.confirm('Send payment reminders via SMS to parents with due payments?')) return;
    
    setLoading(true);
    try {
      const result = await api.post('/fees/send-reminders', {});
      alert(`✅ Sent ${result.remindersSent} SMS reminders!`);
    } catch (err) {
      alert(err.message || 'Failed to send reminders');
    }
    setLoading(false);
  };

  const downloadInvoicePDF = () => {
    if (!selectedStudentId || !invoice) {
      alert('Please select a student first');
      return;
    }
    feesApi.downloadInvoice(selectedStudentId, term, academicYear);
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, term, academicYear]);

  return (
    <div style={styles.container}>
      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        {['ledger', 'plans', 'reports', 'reminders'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            style={{ ...styles.tabBtn, ...(activeTab === tab ? styles.tabBtnActive : {}) }}
          >
            {tab === 'ledger' && <><Receipt size={16} /> Ledger & Payments</>}
            {tab === 'plans' && <><DollarSign size={16} /> Payment Plans</>}
            {tab === 'reports' && <><BarChart3 size={16} /> Reports</>}
            {tab === 'reminders' && <><MessageSquare size={16} /> SMS Reminders</>}
          </button>
        ))}
      </div>

      {/* LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div>
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
                      {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(lvl => (
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
                    onChange={(e) => setFeeForm({ ...feeForm, tuitionFee: parseFloat(e.target.value) })}
                    style={styles.input} 
                  />
                </div>

                <div style={styles.fieldGroupRow}>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>Development Fee (UGX)</label>
                    <input 
                      type="number" 
                      value={feeForm.developmentFee} 
                      onChange={(e) => setFeeForm({ ...feeForm, developmentFee: parseFloat(e.target.value) })}
                      style={styles.input} 
                    />
                  </div>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>Functional Fee (UGX)</label>
                    <input 
                      type="number" 
                      value={feeForm.functionalFee} 
                      onChange={(e) => setFeeForm({ ...feeForm, functionalFee: parseFloat(e.target.value) })}
                      style={styles.input} 
                    />
                  </div>
                </div>

                <button type="submit" style={styles.btnPrimary}>
                  <Plus size={16} /> Update Fee Structure
                </button>
              </form>
            </div>

            {/* Record Payment */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <CreditCard size={20} color="var(--primary)" />
                <h3 style={styles.panelTitle}>Record Payment</h3>
              </div>

              <form onSubmit={handlePaymentSubmit} style={styles.form}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Student</label>
                  <select 
                    value={paymentForm.studentId} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Select Student</option>
                    {students.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Amount (UGX)</label>
                  <input 
                    type="number" 
                    value={paymentForm.amountPaid} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: parseFloat(e.target.value) })}
                    style={styles.input} 
                    required
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Payment Method</label>
                  <select 
                    value={paymentForm.paymentMethod} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    style={styles.select}
                  >
                    <option value="MTN Mobile Money">MTN Mobile Money</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Transaction Reference</label>
                  <input 
                    type="text" 
                    value={paymentForm.transactionReference} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., TXN123456"
                  />
                </div>

                <button type="submit" style={styles.btnPrimary}>
                  <CreditCard size={16} /> Record Payment
                </button>
              </form>
            </div>
          </div>

          {/* Student Fee Statement */}
          {invoice && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <Receipt size={20} color="var(--primary)" />
                <h3 style={styles.panelTitle}>
                  Fee Statement: {invoice.student?.name} ({term})
                </h3>
                <button onClick={downloadInvoicePDF} style={styles.btnIconSmall} title="Download Invoice PDF">
                  <Download size={16} />
                </button>
              </div>

              <div style={styles.statsGrid}>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #2E7D32' }}>
                  <div style={styles.statLabel}>Total Invoiced</div>
                  <div style={styles.statValue}>UGX {invoice.summary?.totalInvoiced?.toLocaleString()}</div>
                </div>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #1976D2' }}>
                  <div style={styles.statLabel}>Amount Paid</div>
                  <div style={styles.statValue}>UGX {invoice.summary?.amountPaid?.toLocaleString()}</div>
                </div>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #D32F2F' }}>
                  <div style={styles.statLabel}>Outstanding</div>
                  <div style={styles.statValue}>UGX {invoice.summary?.balance?.toLocaleString()}</div>
                </div>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #F57C00' }}>
                  <div style={styles.statLabel}>Collection %</div>
                  <div style={styles.statValue}>
                    {(invoice.summary?.totalInvoiced > 0 
                      ? ((invoice.summary?.amountPaid / invoice.summary?.totalInvoiced) * 100).toFixed(1)
                      : 0)}%
                  </div>
                </div>
              </div>

              <h4 style={styles.sectionTitle}>Payment History</h4>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Receipt No.</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Amount (UGX)</th>
                      <th style={styles.th}>Method</th>
                      <th style={styles.th}>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments && invoice.payments.length > 0 ? (
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
                        <td colSpan="5" style={styles.noData}>No payments recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENT PLANS TAB */}
      {activeTab === 'plans' && (
        <div>
          <div style={styles.topGrid}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <DollarSign size={20} color="var(--primary)" />
                <h3 style={styles.panelTitle}>Create Payment Plan</h3>
              </div>

              <form onSubmit={handlePaymentPlanSubmit} style={styles.form}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Select Student</label>
                  <select 
                    value={selectedStudentId} 
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      setPaymentPlanForm({ ...paymentPlanForm, studentId: e.target.value });
                    }}
                    style={styles.select}
                  >
                    <option value="">Choose Student</option>
                    {students.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Term</label>
                  <select 
                    value={term} 
                    onChange={(e) => setTerm(e.target.value)}
                    style={styles.select}
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Number of Installments</label>
                  <input 
                    type="number" 
                    min="2" 
                    max="12"
                    value={paymentPlanForm.installmentCount} 
                    onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, installmentCount: parseInt(e.target.value) })}
                    style={styles.input}
                  />
                  <small style={{ color: '#666' }}>30 days apart, auto-calculated equal amounts</small>
                </div>

                {invoice?.summary && (
                  <div style={styles.infoBox}>
                    <strong>Total Amount:</strong> UGX {invoice.summary.totalInvoiced?.toLocaleString()}<br />
                    <strong>Per Installment:</strong> UGX {Math.round(invoice.summary.totalInvoiced / paymentPlanForm.installmentCount).toLocaleString()}
                  </div>
                )}

                <button type="submit" style={styles.btnPrimary} disabled={!invoice}>
                  <Plus size={16} /> Create Plan & Send SMS
                </button>
              </form>
            </div>

            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <AlertCircle size={20} color="var(--primary)" />
                <h3 style={styles.panelTitle}>How It Works</h3>
              </div>
              <ul style={{ lineHeight: '2', marginLeft: '20px' }}>
                <li>Set number of installments (2-12)</li>
                <li>System calculates equal amounts 30 days apart</li>
                <li>Parent receives SMS with payment schedule</li>
                <li>Track each installment payment separately</li>
                <li>Override amounts if needed</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div>
          <div style={styles.filterBar}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} style={styles.select}>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Academic Year</label>
              <select value={academicYear} onChange={(e) => setAcademicYear(parseInt(e.target.value))} style={styles.select}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading reports...</div>
          ) : (
            <>
              {/* Class Summary Report */}
              {classReports && classReports.length > 0 && (
                <div style={styles.panel}>
                  <div style={styles.panelHeader}>
                    <BarChart3 size={20} color="var(--primary)" />
                    <h3 style={styles.panelTitle}>Fee Collection by Class</h3>
                  </div>

                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.th}>Class</th>
                          <th style={styles.th}>Students</th>
                          <th style={styles.th}>Total Expected</th>
                          <th style={styles.th}>Total Collected</th>
                          <th style={styles.th}>Outstanding</th>
                          <th style={styles.th}>Collection %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classReports.map((cls, idx) => (
                          <tr key={idx} style={styles.tableRow}>
                            <td style={{ ...styles.td, fontWeight: 'bold' }}>{cls.className}</td>
                            <td style={styles.td}>{cls.enrolledStudents}</td>
                            <td style={styles.td}>UGX {cls.totalFeesExpected?.toLocaleString()}</td>
                            <td style={{ ...styles.td, color: '#2E7D32', fontWeight: 'bold' }}>
                              UGX {cls.totalFeesCollected?.toLocaleString()}
                            </td>
                            <td style={{ ...styles.td, color: '#D32F2F', fontWeight: 'bold' }}>
                              UGX {cls.outstandingBalance?.toLocaleString()}
                            </td>
                            <td style={styles.td}>{cls.collectionRate?.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Overdue Students Report */}
              {overdueStudents && overdueStudents.length > 0 && (
                <div style={styles.panel}>
                  <div style={styles.panelHeader}>
                    <AlertCircle size={20} color="#D32F2F" />
                    <h3 style={styles.panelTitle}>Outstanding Balances ({overdueStudents.length} students)</h3>
                  </div>

                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.th}>Student</th>
                          <th style={styles.th}>Class</th>
                          <th style={styles.th}>Parent</th>
                          <th style={styles.th}>Phone</th>
                          <th style={styles.th}>Expected</th>
                          <th style={styles.th}>Paid</th>
                          <th style={styles.th}>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueStudents.map((rec, idx) => (
                          <tr key={idx} style={styles.tableRow}>
                            <td style={styles.td}>{rec.studentName}</td>
                            <td style={styles.td}>{rec.className}</td>
                            <td style={styles.td}>{rec.parentName}</td>
                            <td style={styles.td}>{rec.parentPhone}</td>
                            <td style={styles.td}>UGX {rec.totalExpected?.toLocaleString()}</td>
                            <td style={{ ...styles.td, color: '#2E7D32' }}>UGX {rec.amountPaid?.toLocaleString()}</td>
                            <td style={{ ...styles.td, color: '#D32F2F', fontWeight: 'bold' }}>
                              UGX {rec.outstandingBalance?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SMS REMINDERS TAB */}
      {activeTab === 'reminders' && (
        <div>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <MessageSquare size={20} color="var(--primary)" />
              <h3 style={styles.panelTitle}>SMS Payment Reminders</h3>
            </div>

            <div style={styles.infoBox}>
              <strong>📱 How It Works:</strong>
              <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                <li>System sends SMS to parents 7 days before payment due</li>
                <li>Message includes student name, amount, and due date</li>
                <li>Integrates with AfrikasTalking API (sandbox mode)</li>
                <li>One click to send all pending reminders</li>
              </ul>
            </div>

            <div style={styles.filterBar}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Term</label>
                <select value={term} onChange={(e) => setTerm(e.target.value)} style={styles.select}>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleSendReminders} 
              style={styles.btnPrimary}
              disabled={loading}
            >
              <MessageSquare size={16} /> 
              {loading ? 'Sending...' : 'Send Payment Reminders Now'}
            </button>

            <div style={{ ...styles.infoBox, marginTop: '20px', backgroundColor: '#E3F2FD' }}>
              <strong>✉️ Reminder Message Example:</strong>
              <div style={{ marginTop: '10px', fontFamily: 'monospace', backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
                "7-day reminder: Sarah Musiki's fees (UGX 230,000) due 15-Jan-2025. Contact school for payment details."
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  tabNav: {
    display: 'flex',
    gap: '10px',
    borderBottom: '2px solid #e0e0e0',
    flexWrap: 'wrap'
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#666',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s',
    marginBottom: '-2px'
  },
  tabBtnActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)'
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px'
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f0f0f0'
  },
  panelTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    flex: 1
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  fieldGroupRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  btnPrimary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'opacity 0.2s'
  },
  btnIconSmall: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  statCard: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500',
    marginBottom: '5px'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginTop: '20px',
    marginBottom: '10px'
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '15px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#333'
  },
  tableRow: {
    borderBottom: '1px solid #eee',
    transition: 'backgroundColor 0.2s'
  },
  td: {
    padding: '12px'
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    fontSize: '13px',
    paddingTop: '20px',
    paddingBottom: '20px'
  },
  infoBox: {
    padding: '15px',
    backgroundColor: '#FFF9C4',
    border: '1px solid #FBC02D',
    borderRadius: '4px',
    fontSize: '13px',
    lineHeight: '1.6',
    marginBottom: '15px'
  },
  filterBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  }
};
