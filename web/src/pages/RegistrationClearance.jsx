import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  CheckCircle, Clock, AlertTriangle, XCircle, ArrowRight, 
  UserCheck, ShieldCheck, FileCheck, RefreshCw, Send, 
  GraduationCap, MoveRight, LogOut, Filter, ChevronRight, User
} from 'lucide-react';

export default function RegistrationClearance({ onBackToDirectory }) {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'requirements' | 'lifecycle'
  const [registrations, setRegistrations] = useState([]);
  const [outstandingReport, setOutstandingReport] = useState([]);
  const [alumniList, setAlumniList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

  // Promotion Form State
  const [promotionForm, setPromotionForm] = useState({
    fromLevel: 'S1',
    toLevel: 'S2',
    toClass: '',
    term: 'Term 1',
    fromAcademicYear: '',
    toAcademicYear: ''
  });

  // Transfer & Graduation Modal States
  const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);
  const [transferForm, setTransferForm] = useState({ destinationSchool: '', reason: '', notes: '' });
  const [graduationForm, setGraduationForm] = useState({ graduationYear: new Date().getFullYear(), uaceIndexNumber: '', award: 'UACE Certificate' });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showGradModal, setShowGradModal] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRegistrations = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.append('class', selectedClass);
      if (selectedTerm) params.append('term', selectedTerm);
      if (selectedAcademicYear) params.append('academicYear', selectedAcademicYear);
      const data = await api.get(`/registrations?${params.toString()}`);
      setRegistrations(data.registrations || []);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError(err.message || 'Unable to load registrations. Check that the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingReport = async () => {
    try {
      const data = await api.get(`/requirements/outstanding-report?term=${selectedTerm}`);
      setOutstandingReport(data.report || []);
    } catch (err) {
      console.error('Error fetching outstanding requirements:', err);
      setError(err.message || 'Unable to load outstanding requirements.');
    }
  };

  const fetchAlumni = async () => {
    try {
      const data = await api.get('/students/alumni/directory');
      setAlumniList(data || []);
    } catch (err) {
      console.error('Error fetching alumni:', err);
      setError(err.message || 'Unable to load the alumni directory.');
    }
  };

  const fetchBaseData = async () => {
    try {
      const [cls, yrs] = await Promise.all([
        api.get('/classes').catch(() => []),
        api.get('/academic-years').catch(() => [])
      ]);
      setClasses(cls || []);
      setAcademicYears(yrs || []);
      if (yrs?.length > 0) {
        setSelectedAcademicYear(prev => prev || yrs[0]._id);
        setPromotionForm(prev => ({
          ...prev,
          fromAcademicYear: yrs[0]._id,
          toAcademicYear: yrs[0]._id
        }));
      }
      if (cls?.length > 0) {
        setPromotionForm(prev => ({ ...prev, toClass: cls[0]._id }));
      }
    } catch (err) {
      console.error('Error loading base setup:', err);
      setError(err.message || 'Unable to load classes and academic years.');
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (activeTab === 'pipeline') fetchRegistrations();
    if (activeTab === 'requirements') fetchOutstandingReport();
    if (activeTab === 'lifecycle') fetchAlumni();
  }, [activeTab, selectedClass, selectedTerm, selectedAcademicYear]);

  // Step Clearance Handler
  const handleClearanceStep = async (regId, step, payload = {}) => {
    try {
      await api.patch(`/registrations/${regId}/clearance-step`, {
        step,
        ...payload
      });
      fetchRegistrations();
    } catch (err) {
      alert(err.message || 'Error updating clearance step');
    }
  };

  // Promotion Handler
  const handleBulkPromotion = async (e) => {
    e.preventDefault();
    if (!promotionForm.toAcademicYear) {
      alert('Please select target academic year');
      return;
    }
    if (!window.confirm(`Promote all registered students from ${promotionForm.fromLevel} to ${promotionForm.toLevel}?`)) return;

    try {
      setLoading(true);
      const res = await api.post(`/academic-years/${promotionForm.toAcademicYear}/promote`, promotionForm);
      alert(res.message || 'Promotion complete!');
      fetchRegistrations();
    } catch (err) {
      alert(err.message || 'Error executing promotion');
    } finally {
      setLoading(false);
    }
  };

  // Transfer Clearance
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentForAction) return;
    try {
      await api.post(`/students/${selectedStudentForAction._id}/transfer`, transferForm);
      alert('Student transfer clearance completed and status archived.');
      setShowTransferModal(false);
      setSelectedStudentForAction(null);
      fetchRegistrations();
    } catch (err) {
      alert(err.message || 'Error processing transfer');
    }
  };

  // Graduation Submission
  const handleGraduationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentForAction) return;
    try {
      await api.post(`/students/${selectedStudentForAction._id}/graduate`, graduationForm);
      alert('Student graduated successfully and enrolled into Alumni directory!');
      setShowGradModal(false);
      setSelectedStudentForAction(null);
      fetchRegistrations();
      fetchAlumni();
    } catch (err) {
      alert(err.message || 'Error graduating student');
    }
  };

  // Update requirement item
  const handleRequirementStatus = async (itemReqId, newStatus, reason = '') => {
    try {
      await api.patch(`/requirements/student-requirement/${itemReqId}`, {
        status: newStatus,
        rejectionReason: reason
      });
      fetchOutstandingReport();
    } catch (err) {
      alert(err.message || 'Error updating requirement status');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.topHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onBackToDirectory && (
              <button onClick={onBackToDirectory} style={styles.backBtn}>
                ← Back to Student Directory
              </button>
            )}
            <h2 style={styles.title}>Student Registration & Lifecycle Clearance Hub</h2>
          </div>
          <p style={styles.subtitle}>
            Manage separate enrollment vs. active term clearance, physical school requirements verification, promotions, and graduation.
          </p>
        </div>
        <button onClick={() => {
          if (activeTab === 'pipeline') fetchRegistrations();
          if (activeTab === 'requirements') fetchOutstandingReport();
          if (activeTab === 'lifecycle') fetchAlumni();
        }} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" style={styles.errorBanner}>
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError('');
              if (activeTab === 'pipeline') fetchRegistrations();
              if (activeTab === 'requirements') fetchOutstandingReport();
              if (activeTab === 'lifecycle') fetchAlumni();
            }}
            style={styles.retryBtn}
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={styles.tabsNav}>
        <button 
          onClick={() => setActiveTab('pipeline')}
          style={{ ...styles.tabBtn, ...(activeTab === 'pipeline' ? styles.activeTabBtn : {}) }}
        >
          <UserCheck size={18} /> 1. Term Registration Clearance
        </button>
        <button 
          onClick={() => setActiveTab('requirements')}
          style={{ ...styles.tabBtn, ...(activeTab === 'requirements' ? styles.activeTabBtn : {}) }}
        >
          <FileCheck size={18} /> 2. Outstanding Requirements Checklist
        </button>
        <button 
          onClick={() => setActiveTab('lifecycle')}
          style={{ ...styles.tabBtn, ...(activeTab === 'lifecycle' ? styles.activeTabBtn : {}) }}
        >
          <GraduationCap size={18} /> 3. Promotions, Transfers & Alumni
        </button>
      </div>

      {/* TAB 1: REGISTRATION PIPELINE */}
      {activeTab === 'pipeline' && (
        <div>
          {/* Filter Bar */}
          <div style={styles.filterBar}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Class Level:</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                style={styles.selectInput}
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Academic Year:</label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                style={styles.selectInput}
              >
                <option value="">All Years</option>
                {academicYears.map(year => (
                  <option key={year._id} value={year._id}>{year.year} ({year.label || 'Standard'})</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Academic Term:</label>
              <select 
                value={selectedTerm} 
                onChange={(e) => setSelectedTerm(e.target.value)}
                style={styles.selectInput}
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            <div style={styles.statsSummary}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Total Enrolled for Term: <strong>{registrations.length}</strong> | 
                Cleared & Active: <strong>{registrations.filter(r => r.status === 'registered').length}</strong> | 
                Pending Clearance: <strong>{registrations.filter(r => r.status === 'enrolled').length}</strong>
              </span>
            </div>
          </div>

          {/* Workflow Guide */}
          <div style={styles.workflowGuide}>
            <div style={styles.guideStep}>
              <span style={styles.stepNum}>1</span>
              <span><strong>Enrolled</strong> (Assigned Class/Stream)</span>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            <div style={styles.guideStep}>
              <span style={styles.stepNum}>2</span>
              <span><strong>Fee Assessment</strong> (Tuition cleared/partially paid)</span>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            <div style={styles.guideStep}>
              <span style={styles.stepNum}>3</span>
              <span><strong>Requirements Check</strong> (Books, broom, reams)</span>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            <div style={styles.guideStep}>
              <span style={styles.stepNum}>4</span>
              <span><strong>Guardian Verified</strong> (Emergency contact)</span>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            <div style={styles.guideStepActive}>
              <CheckCircle size={16} color="#10b981" />
              <span><strong>Active Registered</strong> (Visible on class lists & exams)</span>
            </div>
          </div>

          {/* Table */}
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Student & ID</th>
                  <th style={styles.th}>Class / Stream</th>
                  <th style={styles.th}>Residency</th>
                  <th style={styles.th}>Fee Assessment</th>
                  <th style={styles.th}>Requirements</th>
                  <th style={styles.th}>Guardian</th>
                  <th style={styles.th}>Term Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      Loading registrations...
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      No students found for this class and term.
                    </td>
                  </tr>
                ) : (
                  registrations.map(reg => {
                    const isFullyApproved = reg.status === 'registered';
                    return (
                      <tr key={reg._id} style={styles.tr}>
                        <td style={styles.td}>
                          <strong>{reg.student?.user?.name || 'Unnamed Student'}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Reg: {reg.registrationNumber || reg.student?.studentId}
                          </div>
                        </td>
                        <td style={styles.td}>
                          {reg.classLevel} {reg.streamName ? `(${reg.streamName})` : ''}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badge(reg.boardingStatus === 'boarding' ? '#8b5cf6' : '#6b7280')}>
                            {reg.boardingStatus}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => {
                              const nextStatus = reg.feeClearanceStatus === 'cleared' ? 'pending' : reg.feeClearanceStatus === 'partial' ? 'cleared' : 'partial';
                              handleClearanceStep(reg._id, 'fee-assessment', { feeStatus: nextStatus });
                            }}
                            style={styles.stepBtn(
                              reg.feeClearanceStatus === 'cleared' ? '#10b981' : reg.feeClearanceStatus === 'partial' ? '#f59e0b' : '#ef4444'
                            )}
                            title="Click to toggle fee assessment status"
                          >
                            {reg.feeClearanceStatus || 'pending'}
                          </button>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => {
                              const nextStatus = reg.materialsCheckStatus === 'verified' ? 'pending' : 'verified';
                              handleClearanceStep(reg._id, 'materials-check', { materialsStatus: nextStatus });
                            }}
                            style={styles.stepBtn(reg.materialsCheckStatus === 'verified' ? '#10b981' : '#f59e0b')}
                            title="Click to toggle materials check"
                          >
                            {reg.materialsCheckStatus || 'pending'}
                          </button>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleClearanceStep(reg._id, 'parent-confirmation', { parentConfirmed: !reg.parentConfirmed })}
                            style={styles.stepBtn(reg.parentConfirmed ? '#10b981' : '#6b7280')}
                            title="Click to toggle guardian confirmation"
                          >
                            {reg.parentConfirmed ? 'Confirmed ✓' : 'Pending'}
                          </button>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badge(isFullyApproved ? '#10b981' : '#f59e0b')}>
                            {isFullyApproved ? 'Active (Registered)' : 'Enrolled (Pending)'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {!isFullyApproved ? (
                            <button
                              onClick={() => handleClearanceStep(reg._id, 'approve-registration')}
                              style={styles.approveBtn}
                            >
                              <CheckCircle size={14} /> Approve Term
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setSelectedStudentForAction(reg.student);
                                  setShowTransferModal(true);
                                }}
                                style={styles.actionIconBtn}
                                title="Transfer Clearance"
                              >
                                <MoveRight size={13} /> Transfer
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudentForAction(reg.student);
                                  setShowGradModal(true);
                                }}
                                style={styles.actionIconBtn}
                                title="S6 Graduation"
                              >
                                <GraduationCap size={13} /> Graduate
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OUTSTANDING REQUIREMENTS CHECKLIST */}
      {activeTab === 'requirements' && (
        <div>
          <div style={styles.filterBar}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>
              Students with Outstanding Requirements ({outstandingReport.length} Students)
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Track physical items: Mathematical Sets, Brooms, Paper Reams, School Uniforms.
            </p>
          </div>

          <div style={styles.requirementsGrid}>
            {outstandingReport.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', gridColumn: 'span 3' }}>
                <CheckCircle size={36} color="#10b981" style={{ marginBottom: '8px' }} />
                <p>All students have verified requirements for this term!</p>
              </div>
            ) : (
              outstandingReport.map(item => (
                <div key={item.student?._id} style={styles.reqCard}>
                  <div style={styles.reqCardHeader}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px' }}>{item.student?.user?.name}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.student?.studentId} • Class {item.student?.currentClassLevel || item.registration?.classLevel}
                      </span>
                    </div>
                    <span style={styles.badge('#ef4444')}>{item.outstandingCount} Pending</span>
                  </div>

                  <div style={{ margin: '8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Parent Contact: <strong>{item.student?.parentPhone || 'No Phone'}</strong> ({item.student?.parentName})
                  </div>

                  <div style={styles.reqList}>
                    {item.requirements.map(req => (
                      <div key={req._id} style={styles.reqItemRow}>
                        <div>
                          <strong style={{ fontSize: '12px' }}>{req.name}</strong>
                          <span style={{ fontSize: '10px', display: 'block', color: req.status === 'rejected' ? '#ef4444' : '#6b7280' }}>
                            Status: {req.status} {req.rejectionReason ? `(${req.rejectionReason})` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => handleRequirementStatus(req._id, 'verified')}
                            style={{ ...styles.miniBtn, background: '#10b981', color: '#fff' }}
                            title="Verify Requirement"
                          >
                            Verify
                          </button>
                          <button 
                            onClick={() => {
                              setRejectionTarget(req);
                              setRejectionReason('');
                            }}
                            style={{ ...styles.miniBtn, background: '#ef4444', color: '#fff' }}
                            title="Reject Item"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROMOTIONS, TRANSFERS & ALUMNI */}
      {activeTab === 'lifecycle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Promotion Card */}
          <div style={styles.panelCard}>
            <div style={styles.panelHeader}>
              <GraduationCap size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '16px' }}>Annual Student Promotion Workflow</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Promotes registered students to the next academic level without creating duplicate student bio-data records. A new enrollment record is created for the target year and term.
            </p>

            <form onSubmit={handleBulkPromotion}>
              <div style={styles.formRow}>
                <div style={styles.formCol}>
                  <label style={styles.formLabel}>From Class Level:</label>
                  <select 
                    value={promotionForm.fromLevel} 
                    onChange={(e) => setPromotionForm({ ...promotionForm, fromLevel: e.target.value })}
                    style={styles.selectInput}
                  >
                    {['S1', 'S2', 'S3', 'S4', 'S5'].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </div>
                <div style={styles.formCol}>
                  <label style={styles.formLabel}>To Class Level:</label>
                  <select 
                    value={promotionForm.toLevel} 
                    onChange={(e) => setPromotionForm({ ...promotionForm, toLevel: e.target.value })}
                    style={styles.selectInput}
                  >
                    {['S2', 'S3', 'S4', 'S5', 'S6'].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formCol}>
                  <label style={styles.formLabel}>Target Class Entity:</label>
                  <select 
                    value={promotionForm.toClass} 
                    onChange={(e) => setPromotionForm({ ...promotionForm, toClass: e.target.value })}
                    style={styles.selectInput}
                  >
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={styles.formCol}>
                  <label style={styles.formLabel}>Target Academic Year:</label>
                  <select 
                    value={promotionForm.toAcademicYear} 
                    onChange={(e) => setPromotionForm({ ...promotionForm, toAcademicYear: e.target.value })}
                    style={styles.selectInput}
                  >
                    {academicYears.map(y => <option key={y._id} value={y._id}>{y.year} ({y.label || 'Standard'})</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} style={styles.primaryActionBtn}>
                <RefreshCw size={16} /> Execute Promotion to Next Year
              </button>
            </form>
          </div>

          {/* Permanent Alumni & Historical Directory */}
          <div style={styles.panelCard}>
            <div style={styles.panelHeader}>
              <ShieldCheck size={20} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '16px' }}>Alumni & Completion Directory ({alumniList.length})</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Historical archives of graduated S6 candidates and completed students. Records are permanently stored for transcripts and verification.
            </p>

            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {alumniList.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No alumni records yet.</p>
              ) : (
                alumniList.map(alumnus => (
                  <div key={alumnus._id} style={styles.alumniRow}>
                    <div>
                      <strong>{alumnus.user?.name}</strong>
                      <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-secondary)' }}>
                        Adm: {alumnus.studentId} • Class of {alumnus.graduationDetails?.graduationYear || '2026'}
                      </span>
                      {alumnus.graduationDetails?.uaceIndexNumber && (
                        <span style={{ fontSize: '11px', color: '#10b981' }}>
                          UNEB Index: {alumnus.graduationDetails.uaceIndexNumber}
                        </span>
                      )}
                    </div>
                    <span style={styles.badge('#10b981')}>Alumnus</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* REQUIREMENT REJECTION MODAL */}
      {rejectionTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="rejection-title">
            <h3 id="rejection-title">Reject Requirement</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Add a reason so the student or guardian knows what needs to be corrected.
            </p>
            <form onSubmit={(event) => {
              event.preventDefault();
              if (!rejectionReason.trim()) return;
              handleRequirementStatus(rejectionTarget._id, 'rejected', rejectionReason.trim());
              setRejectionTarget(null);
              setRejectionReason('');
            }}>
              <label style={styles.formLabel} htmlFor="rejection-reason">Reason</label>
              <textarea
                id="rejection-reason"
                required
                autoFocus
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="e.g. Broken geometry set or wrong edition"
                style={{ ...styles.textInput, minHeight: '80px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setRejectionTarget(null)} style={styles.secondaryBtn}>Cancel</button>
                <button type="submit" style={{ ...styles.primaryActionBtn, background: '#ef4444' }}>Reject Requirement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER CLEARANCE MODAL */}
      {showTransferModal && selectedStudentForAction && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Transfer Clearance for {selectedStudentForAction.user?.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Complete clearance checklist. The student record will be archived as "Transferred" and never deleted.
            </p>
            <form onSubmit={handleTransferSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.formLabel}>Destination School:</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. King's College Budo" 
                  value={transferForm.destinationSchool}
                  onChange={(e) => setTransferForm({ ...transferForm, destinationSchool: e.target.value })}
                  style={styles.textInput}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.formLabel}>Reason for Transfer:</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Family relocation, change of curriculum" 
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  style={styles.textInput}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowTransferModal(false)} style={styles.secondaryBtn}>Cancel</button>
                <button type="submit" style={styles.primaryActionBtn}>Archive Transfer Clearance</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRADUATION MODAL */}
      {showGradModal && selectedStudentForAction && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>S6 Graduation Clearance for {selectedStudentForAction.user?.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Record final UNEB Index number and graduate student to the permanent Alumni registry.
            </p>
            <form onSubmit={handleGraduationSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.formLabel}>Graduation Year:</label>
                <input 
                  type="number" 
                  required 
                  value={graduationForm.graduationYear}
                  onChange={(e) => setGraduationForm({ ...graduationForm, graduationYear: parseInt(e.target.value) })}
                  style={styles.textInput}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={styles.formLabel}>UACE Index Number:</label>
                <input 
                  type="text" 
                  placeholder="e.g. U0001/501" 
                  value={graduationForm.uaceIndexNumber}
                  onChange={(e) => setGraduationForm({ ...graduationForm, uaceIndexNumber: e.target.value })}
                  style={styles.textInput}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowGradModal(false)} style={styles.secondaryBtn}>Cancel</button>
                <button type="submit" style={styles.primaryActionBtn}>Complete S6 Graduation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    padding: '4px 8px',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '13px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    marginBottom: '16px',
    borderRadius: '8px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: '13px',
  },
  retryBtn: {
    marginLeft: 'auto',
    padding: '5px 10px',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    background: '#fff',
    color: '#b91c1c',
    cursor: 'pointer',
    fontWeight: '600',
  },
  tabsNav: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  activeTabBtn: {
    background: 'var(--primary)',
    color: '#fff',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 18px',
    marginBottom: '16px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  selectInput: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary, #fff)',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  statsSummary: {
    marginLeft: 'auto',
  },
  workflowGuide: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--surface)',
    border: '1px dashed var(--border)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '12px',
  },
  guideStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-secondary)',
  },
  guideStepActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#10b981',
    fontWeight: '600',
  },
  stepNum: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '700',
  },
  tableCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    background: 'var(--bg-secondary, #f9fafb)',
    borderBottom: '1px solid var(--border)',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  badge: (color) => ({
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    background: `${color}18`,
    color: color,
    display: 'inline-block',
  }),
  stepBtn: (color) => ({
    padding: '4px 10px',
    borderRadius: '6px',
    border: `1px solid ${color}`,
    background: `${color}14`,
    color: color,
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    textTransform: 'capitalize',
  }),
  approveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: 'none',
    background: '#10b981',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionIconBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    cursor: 'pointer',
  },
  requirementsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '16px',
  },
  reqCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
  },
  reqCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '10px',
  },
  reqList: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  reqItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    background: 'var(--bg-secondary, #f9fafb)',
    borderRadius: '6px',
  },
  miniBtn: {
    padding: '3px 8px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  panelCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '20px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  formCol: {
    flex: 1,
  },
  formLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  primaryActionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--primary)',
    color: '#fff',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  secondaryBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  alumniRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'var(--surface, #fff)',
    borderRadius: '12px',
    padding: '24px',
    width: '450px',
    maxWidth: '90%',
  },
  textInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '13px',
    boxSizing: 'border-box',
  }
};
