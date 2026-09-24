import React, { useState, useEffect } from 'react';
import { api, API_URL } from '../services/api';

const getUgandaGrade = (marks) => {
  if (marks >= 80) return 'D1';
  if (marks >= 70) return 'D2';
  if (marks >= 65) return 'C3';
  if (marks >= 60) return 'C4';
  if (marks >= 55) return 'C5';
  if (marks >= 50) return 'C6';
  if (marks >= 45) return 'P7';
  if (marks >= 40) return 'P8';
  return 'F9';
};
import { Check, Edit3, Award, FileText, X, Lock, Unlock, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

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
  const [examStatus, setExamStatus] = useState('DRAFT'); // 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED_LOCKED'
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isReviewer = ['super-admin', 'admin', 'academic-admin', 'hod'].includes(currentUser.role);

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
      const query = `/exam-results?class=${selectedClassId}&term=${term}&academicYear=${new Date().getFullYear()}`;
      const response = await api.get(query);
      const existingGrades = response.results || [];
      const selectedResults = existingGrades.filter(g => !selectedSubjectId || g.subject?._id === selectedSubjectId);
      const statuses = selectedResults.map(result => result.approvalStatus);
      if (statuses.includes('published')) setExamStatus('APPROVED_LOCKED');
      else if (statuses.includes('submitted') || statuses.includes('hod-approved')) setExamStatus('UNDER_REVIEW');
      else setExamStatus('DRAFT');

      const dataMap = {};
      studs.forEach(s => {
        const studentResults = existingGrades.filter(g => g.student?._id === s._id && g.subject?._id === selectedSubjectId);
        const findExam = (examType) => studentResults.find(result => result.examType === examType);
        const bot = findExam('BOT');
        const mot = findExam('MOT');
        const eot = findExam('EOT');
        const total = Math.round((bot?.marksObtained || 0) * 0.15 + (mot?.marksObtained || 0) * 0.15 + (eot?.marksObtained || 0) * 0.7);
        dataMap[s._id] = {
          bot: bot?.marksObtained || 0,
          mot: mot?.marksObtained || 0,
          eot: eot?.marksObtained || 0,
          total,
          gradeValue: studentResults.length ? getUgandaGrade(total) : '-'
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
      updated.gradeValue = getUgandaGrade(marks);

      return { ...prev, [studentId]: updated };
    });
  };

  const handleSaveStudentGrade = async (studentId) => {
    const current = gradesData[studentId];
    if (!current) return;

    try {
      const selectedClass = classes.find(cls => cls._id === selectedClassId);
      await api.post('/exam-results/bulk', { results: [
        { student: studentId, subject: selectedSubjectId, class: selectedClassId, term, academicYear: new Date().getFullYear(), examType: 'BOT', marksObtained: current.bot, maxMarks: 100, classLevel: selectedClass?.level },
        { student: studentId, subject: selectedSubjectId, class: selectedClassId, term, academicYear: new Date().getFullYear(), examType: 'MOT', marksObtained: current.mot, maxMarks: 100, classLevel: selectedClass?.level },
        { student: studentId, subject: selectedSubjectId, class: selectedClassId, term, academicYear: new Date().getFullYear(), examType: 'EOT', marksObtained: current.eot, maxMarks: 100, classLevel: selectedClass?.level }
      ]});
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
      const data = await api.get(`/exam-results/report-card/${student._id}?term=${encodeURIComponent(term)}&academicYear=${new Date().getFullYear()}&includeDraft=true`);
      setReportCardData(data);
    } catch (err) {
      alert('Failed to generate report card');
    }
  };

  const handleDownloadReportCard = async () => {
    if (!activeReportStudent) return;
    try {
      const apiUrl = API_URL;
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/grades/report-card/${activeReportStudent._id}/${encodeURIComponent(term)}/pdf?academicYear=${new Date().getFullYear()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Unable to download report card');
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `report-card-${activeReportStudent.studentId || activeReportStudent._id}.pdf`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err.message || 'Failed to download report card');
    }
  };

  const workflowPayload = {
    class: selectedClassId,
    subject: selectedSubjectId,
    term,
    academicYear: new Date().getFullYear(),
  };

  const submitForReview = async () => {
    setWorkflowBusy(true);
    try {
      await api.patch('/exam-results/submit-review', workflowPayload);
      setExamStatus('UNDER_REVIEW');
      await fetchStudentsAndGrades();
    } catch (err) {
      alert(err.message || 'Failed to submit marks for review');
    } finally { setWorkflowBusy(false); }
  };

  const returnForRevision = async () => {
    setWorkflowBusy(true);
    try {
      await api.patch('/exam-results/return-revision', workflowPayload);
      setExamStatus('DRAFT');
      await fetchStudentsAndGrades();
    } catch (err) {
      alert(err.message || 'Failed to return marks for revision');
    } finally { setWorkflowBusy(false); }
  };

  const approveAndPublish = async () => {
    setWorkflowBusy(true);
    try {
      await api.patch('/exam-results/approve-hod', workflowPayload);
      await api.patch('/exam-results/publish', workflowPayload);
      setExamStatus('APPROVED_LOCKED');
      await fetchStudentsAndGrades();
    } catch (err) {
      alert(err.message || 'Failed to approve and publish marks');
    } finally { setWorkflowBusy(false); }
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

      {/* Examination Workflow Lifecycle Banner */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {examStatus === 'DRAFT' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
              <Clock size={16} /> Open for Teacher Mark Entry (Draft)
            </span>
          )}
          {examStatus === 'UNDER_REVIEW' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#e0e7ff', color: '#3730a3', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
              <ShieldCheck size={16} /> Under HOD / Academic Admin Review
            </span>
          )}
          {examStatus === 'APPROVED_LOCKED' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
              <Lock size={16} /> Approved & Locked (Official UNEB Grade)
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {examStatus === 'APPROVED_LOCKED' 
              ? 'Results are sealed. Teachers cannot modify marks. Published to Parent Portal & Report Cards.' 
              : 'Subject teachers can input BOT, MOT, and EOT marks before submitting for review.'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {examStatus === 'DRAFT' && (
            <button
              onClick={submitForReview}
              disabled={workflowBusy || isReviewer}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              <ShieldCheck size={15} /> Submit for HOD Review
            </button>
          )}
          {examStatus === 'UNDER_REVIEW' && (
            <>
              {isReviewer && <button
                onClick={returnForRevision}
                disabled={workflowBusy}
                style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Return to Teacher (Revision)
              </button>}
              {isReviewer && <button
                onClick={approveAndPublish}
                disabled={workflowBusy}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                <Lock size={15} /> Approve & Lock Marks
              </button>}
            </>
          )}
          {examStatus === 'APPROVED_LOCKED' && (
            <button
              onClick={() => setExamStatus('DRAFT')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Unlock size={14} /> Reopen (Admin Only)
            </button>
          )}
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
                  const isLocked = examStatus === 'APPROVED_LOCKED';
                  return (
                    <tr key={stud._id} style={styles.tableRow}>
                      <td style={styles.tdId}>{stud.studentId}</td>
                      <td style={styles.tdName}>{stud.user?.name}</td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          disabled={isLocked}
                          value={data.bot}
                          onChange={(e) => handleMarkChange(stud._id, 'bot', e.target.value)}
                          style={{ ...styles.markInput, opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'not-allowed' : 'text' }}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          disabled={isLocked}
                          value={data.mot}
                          onChange={(e) => handleMarkChange(stud._id, 'mot', e.target.value)}
                          style={{ ...styles.markInput, opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'not-allowed' : 'text' }}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          disabled={isLocked}
                          value={data.eot}
                          onChange={(e) => handleMarkChange(stud._id, 'eot', e.target.value)}
                          style={{ ...styles.markInput, opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'not-allowed' : 'text' }}
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
                          <button 
                            onClick={() => handleSaveStudentGrade(stud._id)} 
                            disabled={isLocked} 
                            style={{ ...styles.saveBtn, opacity: isLocked ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                            title={isLocked ? 'Marks locked by Academic Admin' : 'Save Grade'}
                          >
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
                <div><strong>Class:</strong> {reportCardData?.student?.class || activeReportStudent.currentClass?.name || 'Unassigned'}</div>
                <div><strong>Term:</strong> {term} (2026)</div>
              </div>

              {reportCardData ? (
                <>
                  <table style={styles.reportTable}>
                    <thead>
                      <tr style={styles.reportTableHeader}>
                        <th>Exam</th>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>Marks</th>
                        <th>Max</th>
                        <th>Percentage</th>
                        <th>Grade</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCardData.results.map(g => (
                        <tr key={g._id} style={styles.reportTableRow}>
                          <td>{g.examType}</td>
                          <td>{g.subject?.name}</td>
                          <td>{g.subject?.code}</td>
                          <td>{g.marksObtained}</td>
                          <td>{g.maxMarks}</td>
                          <td>{g.percentage}%</td>
                          <td style={{ fontWeight: '700' }}>{g.grade}</td>
                          <td>{g.remarks || 'Satisfactory progress'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={styles.summaryBox}>
                    <div><strong>Total Subjects:</strong> {reportCardData.summary.totalSubjects}</div>
                    <div><strong>Average Score:</strong> {reportCardData.summary.averagePercentage}%</div>
                    <div><strong>Class Teacher Recommendation:</strong> Promising student, keep up the effort.</div>
                  </div>
                </>
              ) : (
                <div style={styles.loadingReport}>Generating Report Card...</div>
              )}
            </div>
            
            <div style={styles.modalFooter}>
              <button onClick={handleDownloadReportCard} style={styles.printBtn}>
                Download PDF
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
    padding: '24px 16px',
    overflowY: 'auto',
    zIndex: 200,
  },
  modalCard: {
    width: '100%',
    maxWidth: '900px',
    maxHeight: 'calc(100vh - 48px)',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#000000',
    borderRadius: '18px',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    padding: '20px 30px',
    borderBottom: '1px solid #dbe4ef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #16233b, #253b5b)',
    color: '#ffffff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#dce8f7',
    cursor: 'pointer',
  },
  reportCardContent: {
    padding: '34px 38px',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
    overflowY: 'auto',
  },
  schoolHeader: {
    textAlign: 'center',
    borderBottom: '3px solid #f2bd36',
    padding: '8px 0 18px',
    background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
  },
  reportTitle: {
    margin: '18px 0 0',
    color: '#1e3a5f',
    letterSpacing: '0.8px',
    fontWeight: '800',
    fontSize: '16px',
  },
  studentMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 22px',
    fontSize: '14px',
    backgroundColor: '#f1f6fb',
    padding: '18px 20px',
    borderRadius: '10px',
    border: '1px solid #dce7f2',
    color: '#334155',
    lineHeight: 1.5,
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    color: '#26364a',
  },
  reportTableHeader: {
    borderBottom: '2px solid #29496e',
    textAlign: 'left',
    backgroundColor: '#e8f0f8',
    color: '#1e3a5f',
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.4px',
  },
  reportTableRow: {
    borderBottom: '1px solid #e2e8f0',
    lineHeight: 1.4,
  },
  summaryBox: {
    marginTop: '4px',
    padding: '18px 20px',
    background: '#f7fafc',
    borderRadius: '10px',
    border: '1px solid #dce7f2',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px 20px',
    fontSize: '13px',
    color: '#334155',
  },
  loadingReport: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
  modalFooter: {
    padding: '16px 30px',
    borderTop: '1px solid #dbe4ef',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#f8fafc',
    flexShrink: 0,
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
