import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserCheck, CalendarDays, Users, TrendingUp, CheckCircle2, Clock3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Attendance() {
  const { user } = useAuth();
  const canRecordAttendance = ['super-admin', 'admin', 'teacher', 'class-teacher'].includes(user?.role);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [term, setTerm] = useState('Term 1');
  const [records, setRecords] = useState({});

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

  const fetchStudents = async () => {
    if (!selectedClassId) return;

    try {
      const studentList = await api.get(`/students?classId=${selectedClassId}`);
      setStudents(studentList);

      const existing = await api.get(`/attendance?classId=${selectedClassId}&date=${date}&term=${term}`);

      const newRecords = {};
      studentList.forEach((stud) => {
        const found = existing.find((e) => e.student?._id === stud._id);
        newRecords[stud._id] = found ? found.status : 'Present';
      });
      setRecords(newRecords);
    } catch (err) {
      console.error('Failed to fetch students/attendance');
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId, date, term]);

  const totalPresent = students.filter((student) => records[student._id] === 'Present').length;
  const totalLate = students.filter((student) => records[student._id] === 'Late').length;
  const totalAbsent = students.filter((student) => records[student._id] === 'Absent').length;
  const attendanceRate = students.length ? Math.round((totalPresent / students.length) * 100) : 0;

  const handleStatusChange = (studentId, status) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s._id] = status;
    });
    setRecords(updated);
  };

  const handleSave = async () => {
    if (!canRecordAttendance) return;
    try {
      const formattedRecords = Object.keys(records).map((studId) => ({
        student: studId,
        status: records[studId],
      }));

      await api.post('/attendance', {
        classId: selectedClassId,
        date,
        term,
        records: formattedRecords,
      });

      alert('Attendance saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save attendance');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Present</div>
          <div style={styles.summaryValue}>{totalPresent}</div>
          <div style={styles.summaryMeta}><CheckCircle2 size={14} /> students</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Late</div>
          <div style={styles.summaryValue}>{totalLate}</div>
          <div style={styles.summaryMeta}><Clock3 size={14} /> today</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Absent</div>
          <div style={styles.summaryValue}>{totalAbsent}</div>
          <div style={styles.summaryMeta}><TrendingUp size={14} /> needs follow-up</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Rate</div>
          <div style={styles.summaryValue}>{attendanceRate}%</div>
          <div style={styles.summaryMeta}><Users size={14} /> class average</div>
        </div>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Class</label>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} style={styles.select}>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Academic Term</label>
          <select value={term} onChange={(e) => setTerm(e.target.value)} style={styles.select}>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>

        {canRecordAttendance && <div style={styles.bulkActions}>
          <button onClick={() => markAll('Present')} style={{ ...styles.bulkBtn, backgroundColor: 'rgba(16,185,129,0.14)', color: '#34d399' }}>
            Mark All Present
          </button>
          <button onClick={() => markAll('Absent')} style={{ ...styles.bulkBtn, backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
            Mark All Absent
          </button>
        </div>}
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.headerTitleWrap}>
            <div style={styles.headerIcon}><CalendarDays size={18} /></div>
            <h3 style={styles.cardTitle}>Daily Attendance Register</h3>
          </div>
          <div style={styles.headerBadge}>{selectedClassId ? classes.find((c) => c._id === selectedClassId)?.name || 'Class' : 'No class selected'}</div>
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Student ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((stud) => {
                  const currentStatus = records[stud._id] || 'Present';
                  return (
                    <tr key={stud._id} style={styles.tableRow}>
                      <td style={styles.tdId}>{stud.studentId}</td>
                      <td style={styles.tdName}>{stud.user?.name}</td>
                      <td style={styles.td}>
                        <div style={styles.radioGroup}>
                          {['Present', 'Absent', 'Late', 'Excused'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(stud._id, status)}
                              disabled={!canRecordAttendance}
                              style={{
                                ...styles.radioBtn,
                                backgroundColor: currentStatus === status ? 'var(--primary)' : 'rgba(148,163,184,0.08)',
                                color: currentStatus === status ? '#ffffff' : 'var(--text-secondary)',
                                borderColor: currentStatus === status ? 'var(--primary)' : 'var(--border)',
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" style={styles.noData}>No students enrolled in this class.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canRecordAttendance && <div style={styles.cardFooter}>
          <button onClick={handleSave} disabled={students.length === 0} style={styles.saveBtn}>
            <UserCheck size={18} />
            <span>Save Attendance Sheet</span>
          </button>
        </div>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  summaryCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '18px 16px',
    boxShadow: 'var(--shadow-sm)',
  },
  summaryLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '10px 0 8px',
  },
  summaryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
  },
  controlPanel: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px 24px',
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    boxShadow: 'var(--shadow-sm)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '170px',
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
    borderRadius: '10px',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  input: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  bulkActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginLeft: 'auto',
  },
  bulkBtn: {
    padding: '10px 16px',
    border: '1px solid transparent',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(99,102,241,0.12)',
    color: '#8bb8ff',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  headerBadge: {
    background: 'rgba(148,163,184,0.08)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '999px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: '700',
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
    padding: '14px 24px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tableRow: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '16px 24px',
  },
  tdId: {
    padding: '16px 24px',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--primary)',
  },
  tdName: {
    padding: '16px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  radioGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  radioBtn: {
    padding: '7px 14px',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    transition: 'var(--transition)',
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
  },
  cardFooter: {
    padding: '20px 24px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    padding: '12px 22px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '700',
  },
};
