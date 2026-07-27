import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Check, Edit3, Award, FileText, X } from 'lucide-react';

export default function Grades() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [students, setStudents] = useState([]);
  const [term, setTerm] = useState('Term 1');
  const [gradesData, setGradesData] = useState({}); // studentId -> { bot, mot, eot }
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeReportStudent, setActiveReportStudent] = useState(null);
  const [reportCardData, setReportCardData] = useState(null);

  const fetchClasses = async () => {
    try {
      const data = await api.get('/classes');
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassId(data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load classes');
    }
  };

  const fetchSubjects = async () => {
    if (!selectedClassId) return;
    try {
      const data = await api.get(`/subjects?classId=${selectedClassId}`);
      setSubjects(data);
      if (data.length > 0) {
        setSelectedSubjectId(data[0]._id);
      } else {
        setSelectedSubjectId('');
      }
    } catch (err) {
      console.error('Failed to load subjects');
    }
  };

  const fetchStudentsAndGrades = async () => {
    if (!selectedClassId) return;
    try {
      const studs = await api.get(`/students?classId=${selectedClassId}`);
      setStudents(studs);

      // Fetch existing grades
      const query = `/grades?classId=${selectedClassId}&term=${term}`;
      const existingGrades = await api.get(query);

      const dataMap = {};
      studs.forEach(s => {
        const gradeObj = existingGrades.find(g => g.student?._id === s._id && g.subject?._id === selectedSubjectId);
        dataMap[s._id] = {
          bot: gradeObj ? gradeObj.botMarks : 0,
          mot: gradeObj ? gradeObj.motMarks : 0,
          eot: gradeObj ? gradeObj.eotMarks : 0,
          total: gradeObj ? gradeObj.totalMarks : 0,
          gradeValue: gradeObj ? gradeObj.gradeValue : '-'
        };
      });
      setGradesData(dataMap);
    } catch (err) {
      console.error('Failed to fetch students/grades');
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [selectedClassId]);

  useEffect(() => {
    fetchStudentsAndGrades();
  }, [selectedClassId, selectedSubjectId, term]);

  const handleMarkChange = (studentId, examType, value) => {
    const numeric = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setGradesData(prev => {
      const current = prev[studentId] || { bot: 0, mot: 0, eot: 0 };
      const updated = { ...current, [examType]: numeric };
      
      // Real-time calculation helper: weighted total
      updated.total = Math.round((updated.bot * 0.15) + (updated.mot * 0.15) + (updated.eot * 0.70));
      
      // Determine grade
      const marks = updated.total;
      if (marks >= 90) updated.gradeValue = 'D1';
      else if (marks >= 80) updated.gradeValue = 'D2';
      else if (marks >= 70) updated.gradeValue = 'C3';
      else if (marks >= 65) updated.gradeValue = 'C4';
      else if (marks >= 60) updated.gradeValue = 'C5';
      else if (marks >= 50) updated.gradeValue = 'C6';
      else if (marks >= 45) updated.gradeValue = 'P7';
      else if (marks >= 40) updated.gradeValue = 'P8';
      else updated.gradeValue = 'F9';

      return { ...prev, [studentId]: updated };
    });
  };

  const handleSaveStudentGrade = async (studentId) => {
    const current = gradesData[studentId];
    if (!current) return;

    try {
      await api.post('/grades', {
        studentId,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        term,
        botMarks: current.bot,
        motMarks: current.mot,
        eotMarks: current.eot
      });
      alert('Grade updated successfully!');
      fetchStudentsAndGrades();
    } catch (err) {
      alert(err.message || 'Failed to save grade');
    }
  };

  const handleViewReportCard = async (student) => {
    setActiveReportStudent(student);
    setShowReportModal(true);
    try {
      const data = await api.get(`/grades/report-card/${student._id}/${term}`);
      setReportCardData(data);
    } catch (err) {
      alert('Failed to generate report card');
    }
  };

  return (
    <div style={styles.container}>
      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Class</label>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} style={styles.select}>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Subject</label>
          <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} style={styles.select}>
            {subjects.length > 0 ? (
              subjects.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
              ))
            ) : (
              <option value="">No Subjects Found</option>
            )}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Term</label>
          <select value={term} onChange={(e) => setTerm(e.target.value)} style={styles.select}>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Grades Grid Table */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Student Grades Ledger (Uganda O-Level Scale)</h3>
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Learner Name</th>
                <th style={styles.th}>BOT (15%)</th>
                <th style={styles.th}>MOT (15%)</th>
                <th style={styles.th}>EOT (70%)</th>
                <th style={styles.th}>Final Total</th>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>Save / Report</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 && selectedSubjectId ? (
                students.map(stud => {
                  const data = gradesData[stud._id] || { bot: 0, mot: 0, eot: 0, total: 0, gradeValue: '-' };
                  return (
                    <tr key={stud._id} style={styles.tableRow}>
                      <td style={styles.tdId}>{stud.studentId}</td>
                      <td style={styles.tdName}>{stud.user?.name}</td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={data.bot}
                          onChange={(e) => handleMarkChange(stud._id, 'bot', e.target.value)}
                          style={styles.markInput}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={data.mot}
                          onChange={(e) => handleMarkChange(stud._id, 'mot', e.target.value)}
                          style={styles.markInput}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={data.eot}
                          onChange={(e) => handleMarkChange(stud._id, 'eot', e.target.value)}
                          style={styles.markInput}
                        />
                      </td>
                      <td style={styles.tdTotal}>{data.total}%</td>
                      <td style={styles.tdGrade}>
                        <span style={{
                          ...styles.gradeBadge,
                          backgroundColor: data.gradeValue.startsWith('D') ? 'var(--success-light)' : 
                                           data.gradeValue.startsWith('C') ? 'var(--primary-light)' : 'var(--danger-light)',
                          color: data.gradeValue.startsWith('D') ? 'var(--success)' : 
                                 data.gradeValue.startsWith('C') ? 'var(--primary)' : 'var(--danger)'
                        }}>
                          {data.gradeValue}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button onClick={() => handleSaveStudentGrade(stud._id)} style={styles.saveBtn}>
                            <Check size={14} />
                          </button>
                          <button onClick={() => handleViewReportCard(stud)} style={styles.reportBtn}>
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={styles.noData}>
                    {!selectedSubjectId ? 'Please configure subjects for this class first.' : 'No learners enrolled in this class.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Card Modal */}
      {showReportModal && activeReportStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3>Report Card Preview</h3>
              <button onClick={() => setShowReportModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.reportCardContent}>
              <div style={styles.schoolHeader}>
                <h2>NDUGU ACADEMY KAMPALA</h2>
                <p>P.O. Box 7120, Kampala, Uganda • Tel: +256 701 000000</p>
                <h4 style={styles.reportTitle}>STUDENT PROGRESS REPORT CARD</h4>
              </div>

              <div style={styles.studentMetaGrid}>
                <div><strong>Student Name:</strong> {activeReportStudent.user?.name}</div>
                <div><strong>Student ID:</strong> {activeReportStudent.studentId}</div>
                <div><strong>Class:</strong> {activeReportStudent.class?.name}</div>
                <div><strong>Term:</strong> {term} (2026)</div>
              </div>

              {reportCardData ? (
                <>
                  <table style={styles.reportTable}>
                    <thead>
                      <tr style={styles.reportTableHeader}>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>BOT</th>
                        <th>MOT</th>
                        <th>EOT</th>
                        <th>Total</th>
                        <th>Grade</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCardData.grades.map(g => (
                        <tr key={g._id} style={styles.reportTableRow}>
                          <td>{g.subject?.name}</td>
                          <td>{g.subject?.code}</td>
                          <td>{g.botMarks}</td>
                          <td>{g.motMarks}</td>
                          <td>{g.eotMarks}</td>
                          <td>{g.totalMarks}%</td>
                          <td style={{ fontWeight: '700' }}>{g.gradeValue}</td>
                          <td>{g.remarks || 'Satisfactory progress'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={styles.summaryBox}>
                    <div><strong>Total Aggregates (Best 8):</strong> {reportCardData.summary.totalAggregates}</div>
                    <div><strong>Average Class Score:</strong> {reportCardData.summary.averageMarks}%</div>
                    <div><strong>Class Teacher Recommendation:</strong> Promising student, keep up the effort.</div>
                  </div>
                </>
              ) : (
                <div style={styles.loadingReport}>Generating Report Card...</div>
              )}
            </div>
            
            <div style={styles.modalFooter}>
              <button onClick={() => window.print()} style={styles.printBtn}>
                Print / Download PDF
              </button>
              <button onClick={() => setShowReportModal(false)} style={styles.closeModalBtn}>
                Close
              </button>
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
    gap: '24px',
  },
  controlPanel: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 24px',
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    boxShadow: 'var(--shadow-sm)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '180px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  select: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  tableCard: {
    overflowX: 'auto',
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
    padding: '16px 24px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 24px',
  },
  tdId: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--primary)',
  },
  tdName: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  tdTotal: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  tdGrade: {
    padding: '12px 24px',
  },
  gradeBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
  },
  markInput: {
    width: '70px',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    textAlign: 'center',
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
  },
  saveBtn: {
    backgroundColor: 'var(--success-light)',
    color: 'var(--success)',
    border: 'none',
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  reportBtn: {
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    border: 'none',
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modalCard: {
    width: '100%',
    maxWidth: '780px',
    backgroundColor: '#ffffff', // Report card printed on white page background
    color: '#000000',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '20px 28px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  reportCardContent: {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  schoolHeader: {
    textAlign: 'center',
    borderBottom: '2px solid #000000',
    paddingBottom: '16px',
  },
  reportTitle: {
    marginTop: '12px',
    letterSpacing: '1px',
    fontWeight: '800',
  },
  studentMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    fontSize: '14px',
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  reportTableHeader: {
    borderBottom: '2px solid #000000',
    textAlign: 'left',
    backgroundColor: '#f1f5f9',
  },
  reportTableRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  summaryBox: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
  },
  loadingReport: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
  modalFooter: {
    padding: '20px 28px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: 'var(--bg-secondary)',
  },
  printBtn: {
    padding: '10px 24px',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: '600',
  },
  closeModalBtn: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  }
};
