import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import {
  RefreshCw, UserCheck, Clock, AlertTriangle, CheckCircle2,
  Wallet, GraduationCap, X, ArrowRight, FileText, Landmark
} from 'lucide-react';

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;

const normalizeTerm = (value) => {
  if (!value) return '';
  const key = String(value).trim().toUpperCase().replace(/\s+/g, ' ');
  const aliases = {
    'TERM 1': 'Term 1', 'TERM I': 'Term 1', 'TERM ONE': 'Term 1', '1': 'Term 1',
    'TERM 2': 'Term 2', 'TERM II': 'Term 2', 'TERM TWO': 'Term 2', '2': 'Term 2',
    'TERM 3': 'Term 3', 'TERM III': 'Term 3', 'TERM THREE': 'Term 3', '3': 'Term 3'
  };
  return aliases[key] || String(value);
};

const classLabel = (c) => c ? `${c.name}${c.level ? ` (${c.level})` : ''}` : '—';

export default function RegistrationTab({ user, onGoToFinance }) {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Registration modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    classId: '',
    streamId: '',
    boardingStatus: 'day',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const canRegister = ['super-admin', 'admin', 'headteacher', 'registrar', 'director-of-studies', 'deputy-head']
    .includes(user?.role);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // Load academic years + classes once
  useEffect(() => {
    const loadBase = async () => {
      try {
        const [yrs, cls] = await Promise.all([
          api.get('/academic-years'),
          api.get('/classes').catch(() => [])
        ]);
        const yearList = Array.isArray(yrs) ? yrs : (yrs?.academicYears || []);
        setYears(yearList);
        setClasses(Array.isArray(cls) ? cls : (cls?.classes || []));

        const activeYear = yearList.find(y => y.isActive) || yearList[0];
        if (activeYear) {
          setSelectedYearId(activeYear._id);
          const activeTerm = activeYear.terms?.find(t => t.isCurrent)
            || activeYear.terms?.find(t => t.isActive)
            || activeYear.terms?.[0];
          setSelectedTerm(normalizeTerm(activeTerm?.name) || 'Term 1');
        }
      } catch (err) {
        setError(err.message || 'Could not load academic years');
        setLoading(false);
      }
    };
    loadBase();
  }, []);

  const fetchEligibility = async () => {
    if (!selectedYearId || !selectedTerm) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(
        `/registrations/eligibility?academicYearId=${encodeURIComponent(selectedYearId)}&term=${encodeURIComponent(selectedTerm)}`
      );
      setData(result);
    } catch (err) {
      setError(err.message || 'Could not load the registration queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId, selectedTerm]);

  const selectedYear = useMemo(
    () => years.find(y => y._id === selectedYearId),
    [years, selectedYearId]
  );

  const termOptions = useMemo(() => {
    const raw = selectedYear?.terms?.length
      ? selectedYear.terms
      : [{ name: 'Term 1' }, { name: 'Term 2' }, { name: 'Term 3' }];

    const seen = new Set();
    return raw
      .map(t => ({ value: normalizeTerm(t.name), label: t.name, active: Boolean(t.isCurrent) }))
      .filter(t => {
        if (!t.value || seen.has(t.value)) return false;
        seen.add(t.value);
        return true;
      });
  }, [selectedYear]);

  const students = data?.students || [];
  const stats = data?.stats || { total: 0, eligible: 0, awaitingFees: 0, noInvoice: 0, registered: 0 };
  const thresholdPercent = data?.thresholdPercent ?? 50;

  const openRegisterModal = (student) => {
    const matchingClass = classes.find(c => c.level === student.level) || classes[0];
    const firstStream = matchingClass?.streams?.[0];
    setSelectedStudent(student);
    setRegisterForm({
      classId: matchingClass?._id || '',
      streamId: firstStream?._id || '',
      boardingStatus: 'day',
      notes: ''
    });
    setModalError(null);
  };

  const closeRegisterModal = () => {
    setSelectedStudent(null);
    setModalError(null);
  };

  const selectedClass = classes.find(c => c._id === registerForm.classId);
  const streams = selectedClass?.streams || [];

  const handleClassChange = (classId) => {
    const cls = classes.find(c => c._id === classId);
    setRegisterForm(prev => ({
      ...prev,
      classId,
      streamId: cls?.streams?.[0]?._id || ''
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!registerForm.classId) {
      setModalError('Please choose the class the student is joining.');
      return;
    }
    if (streams.length > 0 && !registerForm.streamId) {
      setModalError('Please assign the student to a stream.');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      await api.post('/registrations', {
        studentId: selectedStudent.studentId,
        academicYearId: selectedYearId,
        term: selectedTerm,
        classId: registerForm.classId,
        streamId: registerForm.streamId || undefined,
        boardingStatus: registerForm.boardingStatus,
        notes: registerForm.notes,
        activate: true
      });
      showToast('success', `${selectedStudent.name} has been registered and activated for ${selectedTerm}.`);
      closeRegisterModal();
      fetchEligibility();
    } catch (err) {
      setModalError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (student) => {
    const styles = {
      registered: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.14)', icon: CheckCircle2, label: 'Registered & Active' },
      eligible: { color: '#d8b257', bg: 'rgba(197, 155, 39, 0.16)', icon: UserCheck, label: `Eligible — ${thresholdPercent}% paid` },
      awaiting_fees: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.14)', icon: Clock, label: 'Awaiting fees' },
      no_invoice: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.14)', icon: AlertTriangle, label: 'No invoice raised' }
    }[student.status] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Clock, label: student.status };

    const Icon = styles.icon;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        color: styles.color, backgroundColor: styles.bg,
        padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 800
      }}>
        <Icon size={12} />
        {styles.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 1200,
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff', padding: '12px 18px', borderRadius: 10,
          fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="ap-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="ap-stat-card">
          <div className="ap-stat-top">
            <span className="ap-stat-label">Eligible Now</span>
            <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(197, 155, 39, 0.16)' }}>
              <UserCheck size={18} color="#d8b257" />
            </div>
          </div>
          <div className="ap-stat-val" style={{ color: '#d8b257' }}>{stats.eligible}</div>
          <div className="ap-stat-footer"><span style={{ color: '#94a3b8' }}>{thresholdPercent}%+ paid, ready for DOS</span></div>
        </div>

        <div className="ap-stat-card">
          <div className="ap-stat-top">
            <span className="ap-stat-label">Awaiting Fees</span>
            <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
          </div>
          <div className="ap-stat-val" style={{ color: '#fbbf24' }}>{stats.awaitingFees}</div>
          <div className="ap-stat-footer"><span style={{ color: '#94a3b8' }}>Below the {thresholdPercent}% threshold</span></div>
        </div>

        <div className="ap-stat-card">
          <div className="ap-stat-top">
            <span className="ap-stat-label">No Invoice</span>
            <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.14)' }}>
              <AlertTriangle size={18} color="#f87171" />
            </div>
          </div>
          <div className="ap-stat-val" style={{ color: '#f87171' }}>{stats.noInvoice}</div>
          <div className="ap-stat-footer"><span style={{ color: '#94a3b8' }}>Bursar must raise a term invoice</span></div>
        </div>

        <div className="ap-stat-card">
          <div className="ap-stat-top">
            <span className="ap-stat-label">Registered & Active</span>
            <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
          </div>
          <div className="ap-stat-val" style={{ color: '#34d399' }}>{stats.registered}</div>
          <div className="ap-stat-footer"><span style={{ color: '#94a3b8' }}>{selectedTerm} · {selectedYear?.year || ''}</span></div>
        </div>
      </div>

      {/* Queue */}
      <div className="ap-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={20} color="#d8b257" />
              Term Registration Queue
            </h3>
            <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '4px 0 0 0' }}>
              Approved students appear here once the Bursar has posted at least {thresholdPercent}% of the term invoice. The DOS then assigns a class and stream and activates the student.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              style={{ backgroundColor: '#131f37', border: '1px solid #23324d', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }}
            >
              {years.map(y => <option key={y._id} value={y._id}>{y.label || y.year}</option>)}
            </select>

            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              style={{ backgroundColor: '#131f37', border: '1px solid #23324d', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }}
            >
              {termOptions.map(t => <option key={t.value} value={t.value}>{t.label}{t.active ? ' — current' : ''}</option>)}
            </select>

            <button className="ap-btn-secondary" onClick={fetchEligibility} disabled={loading} title="Refresh queue">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="ap-empty-state" style={{ padding: 40 }}>
            <RefreshCw size={22} className="animate-spin" color="#d8b257" />
            <p style={{ color: '#94a3b8', marginTop: 10 }}>Loading the registration queue…</p>
          </div>
        ) : students.length === 0 ? (
          <div className="ap-empty-state" style={{ padding: 40 }}>
            <UserCheck size={28} color="#64748b" />
            <p style={{ color: '#94a3b8', marginTop: 10 }}>No admitted or active students for this term.</p>
          </div>
        ) : (
          <div className="ap-table-wrapper">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class / Level</th>
                  <th>Term Fees</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const percent = student.fee.percent || 0;
                  const barColor = percent >= thresholdPercent ? '#10b981' : percent > 0 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={student.studentId}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#fff' }}>{student.name}</div>
                        <div style={{ fontSize: 11.5, color: '#d8b257', fontFamily: 'monospace', marginTop: 2 }}>
                          {student.admissionNumber || student.studentNumber || 'No admission no.'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {student.studentNumber || ''} {student.studentStatus ? `· ${student.studentStatus}` : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: '#e2e8f0', fontSize: 13 }}>
                          {student.currentClass?.name || student.level || 'Unassigned'}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                          Stream: {student.currentStream || 'Not assigned'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5, color: '#e2e8f0' }}>{UGX(student.fee.paid)} / {UGX(student.fee.billed)}</div>
                        <div style={{ height: 6, borderRadius: 999, backgroundColor: '#131f37', marginTop: 6, overflow: 'hidden', width: 150 }}>
                          <div style={{ width: `${Math.min(100, percent)}%`, height: '100%', backgroundColor: barColor, transition: 'width 0.3s ease' }} />
                        </div>
                        <div style={{ fontSize: 11, color: barColor, fontWeight: 700, marginTop: 3 }}>{percent}% paid</div>
                        {student.fee.source === 'none' && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Awaiting invoice</div>
                        )}
                      </td>
                      <td>
                        {statusBadge(student)}
                        {student.registration && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                            {student.registration.registrationNumber} · {student.registration.className} {student.registration.streamName || ''}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {student.status === 'registered' ? (
                          <span style={{ fontSize: 11.5, color: '#34d399', fontWeight: 700 }}>Active</span>
                        ) : student.status === 'eligible' ? (
                          <button
                            className="ap-btn-primary"
                            style={{ padding: '6px 12px', fontSize: 12, backgroundColor: '#c59b27', color: '#080e1a' }}
                            onClick={() => openRegisterModal(student)}
                            disabled={!canRegister}
                            title={canRegister ? 'Register for the term' : 'Only the DOS / Registrar can register students'}
                          >
                            Register <ArrowRight size={13} />
                          </button>
                        ) : student.status === 'no_invoice' && onGoToFinance ? (
                          <button
                            className="ap-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 12, color: '#f87171' }}
                            onClick={() => onGoToFinance('invoices')}
                          >
                            <FileText size={13} /> Raise invoice
                          </button>
                        ) : onGoToFinance ? (
                          <button
                            className="ap-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 12, color: '#fbbf24' }}
                            onClick={() => onGoToFinance('payments')}
                          >
                            <Wallet size={13} /> Record payment
                          </button>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                            <Wallet size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Pay at Cashier
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register modal */}
      {selectedStudent && (
        <div className="ap-modal-overlay" onClick={closeRegisterModal}>
          <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="ap-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Register {selectedStudent.name}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#94a3b8' }}>
                  {selectedStudent.admissionNumber} · {selectedTerm} · {selectedYear?.label || selectedYear?.year}
                </p>
              </div>
              <button className="ap-modal-close" onClick={closeRegisterModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleRegister}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '10px 12px', borderRadius: 9, backgroundColor: '#0b1220', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12.5 }}>Fee clearance</span>
                  <span style={{ color: '#34d399', fontSize: 12.5, fontWeight: 800 }}>
                    {selectedStudent.fee.percent}% paid · {UGX(selectedStudent.fee.paid)} of {UGX(selectedStudent.fee.billed)}
                  </span>
                </div>

                {modalError && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: 12.5 }}>
                    {modalError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>Class *</label>
                  <select
                    value={registerForm.classId}
                    onChange={e => handleClassChange(e.target.value)}
                    required
                    style={{ width: '100%', backgroundColor: '#131f37', border: '1px solid #23324d', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                  >
                    <option value="">— Choose class —</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{classLabel(c)}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>
                    Stream {streams.length > 0 ? '*' : '(no streams configured)'}
                  </label>
                  <select
                    value={registerForm.streamId}
                    onChange={e => setRegisterForm(prev => ({ ...prev, streamId: e.target.value }))}
                    required={streams.length > 0}
                    disabled={streams.length === 0}
                    style={{ width: '100%', backgroundColor: '#131f37', border: '1px solid #23324d', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                  >
                    <option value="">{streams.length ? '— Choose stream —' : 'No streams configured for this class'}</option>
                    {streams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>Boarding status</label>
                  <select
                    value={registerForm.boardingStatus}
                    onChange={e => setRegisterForm(prev => ({ ...prev, boardingStatus: e.target.value }))}
                    style={{ width: '100%', backgroundColor: '#131f37', border: '1px solid #23324d', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
                  >
                    <option value="day">Day scholar</option>
                    <option value="boarding">Boarder</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>Notes</label>
                  <textarea
                    rows={2}
                    value={registerForm.notes}
                    onChange={e => setRegisterForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional registration notes"
                    style={{ width: '100%', backgroundColor: '#131f37', border: '1px solid #23324d', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, resize: 'vertical' }}
                  />
                </div>

                <div style={{ fontSize: 11.5, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <Landmark size={14} style={{ color: '#d8b257', flexShrink: 0, marginTop: 1 }} />
                  On submit, the student becomes active for {selectedTerm} and their class/stream is written to the student record.
                </div>
              </div>

              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={closeRegisterModal} disabled={submitting}>Cancel</button>
                <button type="submit" className="ap-btn-primary" disabled={submitting} style={{ backgroundColor: '#10b981', color: '#080e1a' }}>
                  {submitting ? 'Registering…' : 'Register & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
