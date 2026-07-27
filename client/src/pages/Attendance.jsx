import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Check, X, Calendar, UserCheck } from 'lucide-react';

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [term, setTerm] = useState('Term 1');
  const [records, setRecords] = useState({}); // studentId -> status

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
      
      // Load existing attendance for this date/class if any
      const existing = await api.get(`/attendance?classId=${selectedClassId}&date=${date}&term=${term}`);
      
      const newRecords = {};
      studentList.forEach(stud => {
        const found = existing.find(e => e.student?._id === stud._id);
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

  const handleStatusChange = (studentId, status) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(s => {
      updated[s._id] = status;
    });
    setRecords(updated);
  };

  const handleSave = async () => {
    try {
      const formattedRecords = Object.keys(records).map(studId => ({
        student: studId,
        status: records[studId]
      }));

      await api.post('/attendance', {
        classId: selectedClassId,
        date,
        term,
        records: formattedRecords
      });

      alert('Attendance saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save attendance');
    }
  };

  return (
    <div style={styles.container}>
      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Class</label>
          <select 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
            style={styles.select}
          >
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            style={styles.input} 
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Academic Term</label>
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

        <div style={styles.bulkActions}>
          <button onClick={() => markAll('Present')} style={{ ...styles.bulkBtn, backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            Mark All Present
          </button>
          <button onClick={() => markAll('Absent')} style={{ ...styles.bulkBtn, backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Student List Grid */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Daily Attendance Register</h3>
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
                students.map(stud => {
                  const currentStatus = records[stud._id] || 'Present';
                  return (
                    <tr key={stud._id} style={styles.tableRow}>
                      <td style={styles.tdId}>{stud.studentId}</td>
                      <td style={styles.tdName}>{stud.user?.name}</td>
                      <td style={styles.td}>
                        <div style={styles.radioGroup}>
                          {['Present', 'Absent', 'Late', 'Excused'].map(st => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(stud._id, st)}
                              style={{
                                ...styles.radioBtn,
                                backgroundColor: currentStatus === st ? 'var(--primary)' : 'var(--bg-primary)',
                                color: currentStatus === st ? '#ffffff' : 'var(--text-secondary)',
                                borderColor: currentStatus === st ? 'var(--primary)' : 'var(--border)'
                              }}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" style={styles.noData}>
                    No students enrolled in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.cardFooter}>
          <button onClick={handleSave} disabled={students.length === 0} style={styles.saveBtn}>
            <UserCheck size={18} />
            <span>Save Attendance Sheet</span>
          </button>
        </div>
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
  controlPanel: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
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
    minWidth: '160px',
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
  input: {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  bulkActions: {
    display: 'flex',
    gap: '10px',
  },
  bulkBtn: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
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
  },
  radioBtn: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
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
    padding: '12px 24px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
  }
};
