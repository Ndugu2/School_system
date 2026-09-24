import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Award, Search, Printer, Plus, X, CheckCircle, 
  AlertCircle, BookOpen, User, RefreshCw 
} from 'lucide-react';

export default function ClassPermitsTab() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [classLevel, setClassLevel] = useState('');

  // Issue Permit Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [stream, setStream] = useState('Green');
  const [optionalSubjectsInput, setOptionalSubjectsInput] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState(null);

  // Print Permit Modal State
  const [activePrintPermit, setActivePrintPermit] = useState(null);

  const fetchPermits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.append('term', term);
      if (academicYear) params.append('academicYear', academicYear);
      if (classLevel) params.append('classLevel', classLevel);
      if (search.trim()) params.append('search', search.trim());

      const data = await api.get(`/permits?${params.toString()}`);
      setPermits(data || []);
    } catch (err) {
      console.error('Error fetching permits:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await api.get('/students?limit=200');
      setStudentsList(data.students || data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  useEffect(() => {
    fetchPermits();
  }, [term, academicYear, classLevel]);

  const handleOpenIssueModal = () => {
    fetchStudents();
    setShowIssueModal(true);
    setIssueError(null);
  };

  const handleIssuePermit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setIssueError('Please select a student');
      return;
    }

    setIssuing(true);
    setIssueError(null);
    try {
      const optionals = optionalSubjectsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await api.post('/permits/issue', {
        studentId: selectedStudentId,
        term,
        academicYear: parseInt(academicYear),
        stream,
        optionalSubjects: optionals
      });

      setShowIssueModal(false);
      setSelectedStudentId('');
      setOptionalSubjectsInput('');
      await fetchPermits();
      if (res.permit) {
        setActivePrintPermit(res.permit);
      }
    } catch (err) {
      setIssueError(err.message || 'Error issuing permit');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top action bar */}
      <div style={styles.headerRow}>
        <div>
          <h3 style={styles.headerTitle}>Class Entry Permits (Licoka Standard)</h3>
          <p style={styles.headerSubtitle}>
            Issue and verify physical classroom entry permits (`PER-xxxx`) containing stream assignments and enrolled subjects.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.secondaryBtn} onClick={fetchPermits}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button style={styles.primaryBtn} onClick={handleOpenIssueModal}>
            <Plus size={16} /> Issue Class Permit
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search student, admission #, permit #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPermits()}
            style={styles.searchInput}
          />
        </div>
        <select 
          value={classLevel} 
          onChange={(e) => setClassLevel(e.target.value)}
          style={styles.select}
        >
          <option value="">All Class Levels</option>
          <option value="S1">Senior 1</option>
          <option value="S2">Senior 2</option>
          <option value="S3">Senior 3</option>
          <option value="S4">Senior 4</option>
          <option value="S5">Senior 5</option>
          <option value="S6">Senior 6</option>
        </select>
        <select 
          value={term} 
          onChange={(e) => setTerm(e.target.value)}
          style={styles.select}
        >
          <option value="Term 1">Term 1</option>
          <option value="Term 2">Term 2</option>
          <option value="Term 3">Term 3</option>
        </select>
        <input
          type="number"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          style={{ ...styles.select, width: 90 }}
        />
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingBox}>Loading class entry permits...</div>
        ) : permits.length === 0 ? (
          <div style={styles.emptyBox}>
            <AlertCircle size={36} color="#94a3b8" />
            <p style={{ marginTop: 10 }}>No class permits issued for {term} {academicYear} {classLevel ? `in ${classLevel}` : ''}. Click "Issue Class Permit" to generate one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Permit #</th>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Admission Number</th>
                  <th style={styles.th}>Class & Stream</th>
                  <th style={styles.th}>Class Teacher</th>
                  <th style={styles.th}>Subjects Offered</th>
                  <th style={styles.th}>Issued Date</th>
                  <th style={styles.thRight}>Action</th>
                </tr>
              </thead>
              <tbody>
                {permits.map(p => (
                  <tr key={p._id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#1e3a8a' }}>
                      {p.permitNumber}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{p.studentName}</td>
                    <td style={styles.td}>
                      <span style={styles.badgeCode}>{p.admissionNumber}</span>
                    </td>
                    <td style={styles.td}>
                      <strong>{p.classLevel}</strong>{' '}
                      <span style={{ 
                        ...styles.streamTag, 
                        backgroundColor: p.stream === 'Green' ? '#dcfce7' : p.stream === 'Blue' ? '#dbeafe' : '#f1f5f9',
                        color: p.stream === 'Green' ? '#15803d' : p.stream === 'Blue' ? '#1d4ed8' : '#475569'
                      }}>
                        Stream {p.stream}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: '#475569' }}>{p.classTeacherName || 'Class Teacher'}</td>
                    <td style={{ ...styles.td, maxWidth: 220 }}>
                      <div style={styles.subjectTruncate} title={[...(p.compulsorySubjects || []), ...(p.optionalSubjects || [])].join(', ')}>
                        {[...(p.compulsorySubjects || []), ...(p.optionalSubjects || [])].join(', ')}
                      </div>
                    </td>
                    <td style={{ ...styles.td, color: '#64748b', fontSize: 13 }}>
                      {new Date(p.issuedDate).toLocaleDateString()}
                    </td>
                    <td style={styles.tdRight}>
                      <button 
                        style={styles.printActionBtn} 
                        onClick={() => setActivePrintPermit(p)}
                      >
                        <Printer size={13} /> Print Permit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ISSUE PERMIT MODAL */}
      {showIssueModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Issue Class Entry Permit</h3>
              <button style={styles.closeBtn} onClick={() => setShowIssueModal(false)}>
                <X size={18} />
              </button>
            </div>

            {issueError && (
              <div style={styles.errorBox}>
                <AlertCircle size={15} /> {issueError}
              </div>
            )}

            <form onSubmit={handleIssuePermit} style={{ marginTop: 14 }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Student:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={styles.modalInput}
                  required
                >
                  <option value="">-- Choose Admitted Student --</option>
                  {studentsList.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.user?.name || s.studentId} — ({s.admissionNumber || s.studentId}) [{s.currentClassLevel || 'S1'}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Stream Assignment (Licoka Streams):</label>
                <select
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  style={styles.modalInput}
                >
                  <option value="Green">Green (Stream G)</option>
                  <option value="White">White (Stream W)</option>
                  <option value="Blue">Blue (Stream B)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Optional Subjects / A-Level Combination (Comma separated):</label>
                <input
                  type="text"
                  placeholder="e.g. Agriculture, Computer Studies, Commerce OR PCM"
                  value={optionalSubjectsInput}
                  onChange={(e) => setOptionalSubjectsInput(e.target.value)}
                  style={styles.modalInput}
                />
                <span style={styles.hint}>Leave blank to auto-detect from applicant admission record</span>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowIssueModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn} disabled={issuing}>
                  {issuing ? 'Generating...' : 'Issue & View Permit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PERMIT MODAL */}
      {activePrintPermit && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBoxPrint}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Print Class Entry Permit</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.printActionBtnPrimary} onClick={() => window.print()}>
                  <Printer size={15} /> Print Permit
                </button>
                <button style={styles.closeBtn} onClick={() => setActivePrintPermit(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Class Entry Permit Document */}
            <div id="printable-permit-slip" style={styles.permitSlip}>
              <div style={styles.permitHeader}>
                <div style={styles.schoolName}>LIGHT COLLEGE KATIKAMU</div>
                <div style={styles.schoolSub}>Academic & Admissions Directorate • Uganda Secondary Education</div>
                <div style={styles.docTitleBadge}>OFFICIAL CLASS ENTRY PERMIT</div>
                <div style={styles.permitNumberTag}>NO: {activePrintPermit.permitNumber}</div>
              </div>

              <div style={styles.permitBody}>
                <div style={styles.metaRow}>
                  <div><strong>Student Name:</strong> {activePrintPermit.studentName}</div>
                  <div><strong>Admission #:</strong> {activePrintPermit.admissionNumber}</div>
                </div>
                <div style={styles.metaRow}>
                  <div>
                    <strong>Class & Stream:</strong> {activePrintPermit.classLevel} - Stream {activePrintPermit.stream}
                  </div>
                  <div>
                    <strong>Term / Academic Year:</strong> {activePrintPermit.term} {activePrintPermit.academicYear}
                  </div>
                </div>
                <div style={styles.metaRow}>
                  <div><strong>Class Teacher:</strong> {activePrintPermit.classTeacherName || 'Class Teacher'}</div>
                  <div><strong>Issued Date:</strong> {new Date(activePrintPermit.issuedDate).toLocaleDateString()}</div>
                </div>

                {/* Subjects Table */}
                <div style={{ marginTop: 14 }}>
                  <div style={styles.subjectSectionTitle}>OFFICIALLY REGISTERED SUBJECTS</div>
                  <div style={styles.subjectsBox}>
                    <div>
                      <strong style={{ fontSize: 11, color: '#1e3a8a' }}>COMPULSORY CORE SUBJECTS:</strong>
                      <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#334155' }}>
                        {(activePrintPermit.compulsorySubjects || []).join(' • ')}
                      </p>
                    </div>
                    <div>
                      <strong style={{ fontSize: 11, color: '#059669' }}>OPTIONAL ELECTIVES / COMBINATIONS:</strong>
                      <p style={{ margin: '4px 0', fontSize: 12, color: '#334155' }}>
                        {(activePrintPermit.optionalSubjects || []).join(' • ') || 'Standard Core Curriculum'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={styles.permitDisclaimer}>
                  <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
                    <strong>DIRECTORATE NOTICE:</strong> This permit certifies that the student has completed term registration and is authorized to enter classrooms and take part in instructional activities. Must be produced on demand by the Class Teacher or Prefectorial Council.
                  </p>
                </div>

                {/* Signatories & Stamps */}
                <div style={styles.permitSignatories}>
                  <div style={styles.sigBlock}>
                    <div style={styles.sigDottedLine} />
                    <span style={styles.sigCaption}>Class Teacher Signature</span>
                  </div>
                  <div style={styles.officialStampCircle}>
                    <span>LICOKA</span>
                    <span>ADMITTED</span>
                    <span>PERMIT</span>
                  </div>
                  <div style={styles.sigBlock}>
                    <div style={styles.sigDottedLine} />
                    <span style={styles.sigCaption}>Director of Studies (DOS)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  headerTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' },
  headerSubtitle: { margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 14px',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  filterBar: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '6px 12px',
    flex: 1,
    minWidth: 240
  },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, width: '100%' },
  select: {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155'
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid var(--border)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' },
  thRight: { padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'right' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 14px', fontSize: 13, color: '#1e293b' },
  tdRight: { padding: '12px 14px', textAlign: 'right' },
  badgeCode: { padding: '2px 8px', borderRadius: 4, backgroundColor: '#f1f5f9', fontWeight: 600, fontSize: 12, color: '#475569' },
  streamTag: { padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginLeft: 4 },
  subjectTruncate: { maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, color: '#64748b' },
  printActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    color: '#1e293b',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer'
  },
  loadingBox: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  emptyBox: { padding: 48, textAlign: 'center', color: '#94a3b8' },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalBoxPrint: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 680,
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 },
  closeBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' },
  formGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 },
  modalInput: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelBtn: { padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' },
  submitBtn: { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  errorBox: { padding: '8px 12px', borderRadius: 6, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 12, marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' },
  printActionBtnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },

  // Printable Permit Slip Styles
  permitSlip: {
    marginTop: 18,
    padding: 24,
    border: '2px solid #1e3a8a',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#0f172a'
  },
  permitHeader: { textAlign: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: 12, marginBottom: 14 },
  schoolName: { fontSize: 19, fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.04em' },
  schoolSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  docTitleBadge: {
    display: 'inline-block',
    marginTop: 8,
    padding: '4px 14px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 4,
    letterSpacing: '0.05em'
  },
  permitNumberTag: { marginTop: 6, fontSize: 12, fontWeight: 800, color: '#059669' },
  permitBody: { display: 'flex', flexDirection: 'column', gap: 10 },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px dashed #e2e8f0', paddingBottom: 6 },
  subjectSectionTitle: { fontSize: 11, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.05em', marginBottom: 4 },
  subjectsBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' },
  permitDisclaimer: { backgroundColor: '#eff6ff', padding: 10, borderRadius: 6, border: '1px solid #bfdbfe', marginTop: 6 },
  permitSignatories: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 22 },
  sigBlock: { textAlign: 'center', width: 170 },
  sigDottedLine: { borderBottom: '1px dashed #475569', marginBottom: 4 },
  sigCaption: { fontSize: 11, color: '#64748b' },
  officialStampCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: '2px dashed #dc2626',
    color: '#dc2626',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 800,
    transform: 'rotate(-10deg)'
  }
};
