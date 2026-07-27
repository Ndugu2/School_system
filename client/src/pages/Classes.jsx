import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, School, BookOpen, UserPlus, FileText } from 'lucide-react';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [classForm, setClassForm] = useState({
    name: '',
    level: 'P1',
    classTeacher: '',
    academicYear: new Date().getFullYear()
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    classId: '',
    teacherId: ''
  });

  const fetchClasses = async () => {
    try {
      const data = await api.get('/classes');
      setClasses(data);
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0]._id);
        setSubjectForm(prev => ({ ...prev, classId: data[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load classes');
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await api.get('/teachers');
      setTeachers(data);
      if (data.length > 0) {
        setClassForm(prev => ({ ...prev, classTeacher: data[0].user?._id || '' }));
        setSubjectForm(prev => ({ ...prev, teacherId: data[0].user?._id || '' }));
      }
    } catch (err) {
      console.error('Failed to load teachers');
    }
  };

  const fetchSubjects = async () => {
    if (!selectedClassId) return;
    try {
      const data = await api.get(`/subjects?classId=${selectedClassId}`);
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects');
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchSubjects();
    if (selectedClassId) {
      setSubjectForm(prev => ({ ...prev, classId: selectedClassId }));
    }
  }, [selectedClassId]);

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    try {
      const newClass = await api.post('/classes', classForm);
      setClassForm({
        name: '',
        level: 'P1',
        classTeacher: teachers[0]?.user?._id || '',
        academicYear: new Date().getFullYear()
      });
      fetchClasses();
      alert('Class created successfully!');
    } catch (err) {
      alert(err.message || 'Error creating class');
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subjects', subjectForm);
      setSubjectForm({
        name: '',
        code: '',
        classId: selectedClassId,
        teacherId: teachers[0]?.user?._id || ''
      });
      fetchSubjects();
      alert('Subject created & assigned successfully!');
    } catch (err) {
      alert(err.message || 'Error creating subject');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Classes Column */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <School size={20} color="var(--primary)" />
            <h3 style={styles.panelTitle}>Manage School Classes</h3>
          </div>

          <form onSubmit={handleClassSubmit} style={styles.classForm}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Class Name</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Primary 5 Blue, Senior 1 Alpha" 
                value={classForm.name} 
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                style={styles.input} 
              />
            </div>

            <div style={styles.fieldGroupRow}>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Level</label>
                <select 
                  value={classForm.level} 
                  onChange={(e) => setClassForm({ ...classForm, level: e.target.value })}
                  style={styles.select}
                >
                  {['Nursery', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div style={{ ...styles.fieldGroup, flex: 2 }}>
                <label style={styles.label}>Class Teacher</label>
                <select 
                  value={classForm.classTeacher} 
                  onChange={(e) => setClassForm({ ...classForm, classTeacher: e.target.value })}
                  style={styles.select}
                >
                  <option value="">No Class Teacher</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t.user?._id}>{t.user?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" style={styles.submitBtn}>
              <Plus size={16} />
              <span>Create Class</span>
            </button>
          </form>

          {/* Classes list select button panel */}
          <div style={styles.classesList}>
            <h4 style={styles.sectionHeading}>Registered Classes</h4>
            <div style={styles.classesGrid}>
              {classes.map(c => (
                <button
                  key={c._id}
                  onClick={() => setSelectedClassId(c._id)}
                  style={{
                    ...styles.classBadge,
                    borderColor: selectedClassId === c._id ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: selectedClassId === c._id ? 'var(--primary-light)' : 'var(--bg-secondary)',
                    color: selectedClassId === c._id ? 'var(--primary)' : 'var(--text-primary)'
                  }}
                >
                  <School size={16} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subjects Column */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <BookOpen size={20} color="var(--primary)" />
            <h3 style={styles.panelTitle}>
              Subjects in {classes.find(c => c._id === selectedClassId)?.name || 'Selected Class'}
            </h3>
          </div>

          <form onSubmit={handleSubjectSubmit} style={styles.classForm}>
            <div style={styles.fieldGroupRow}>
              <div style={{ ...styles.fieldGroup, flex: 2 }}>
                <label style={styles.label}>Subject Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Mathematics, English" 
                  value={subjectForm.name} 
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  style={styles.input} 
                />
              </div>

              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Subject Code</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. MTC, ENG" 
                  value={subjectForm.code} 
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  style={styles.input} 
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Subject Teacher / Instructor</label>
              <select 
                value={subjectForm.teacherId} 
                onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                style={styles.select}
              >
                <option value="">No Instructor Assigned</option>
                {teachers.map(t => (
                  <option key={t._id} value={t.user?._id}>{t.user?.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={!selectedClassId} style={styles.submitBtn}>
              <Plus size={16} />
              <span>Add Subject to Class</span>
            </button>
          </form>

          {/* Subjects Table list */}
          <div style={styles.subjectsList}>
            <h4 style={styles.sectionHeading}>Assigned Subjects</h4>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Subject Name</th>
                    <th style={styles.th}>Instructor</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length > 0 ? (
                    subjects.map(sub => (
                      <tr key={sub._id} style={styles.tableRow}>
                        <td style={{ ...styles.td, fontWeight: '700' }}>{sub.code}</td>
                        <td style={styles.td}>{sub.name}</td>
                        <td style={styles.td}>{sub.teacher?.name || 'Unassigned'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={styles.noData}>
                        No subjects created for this class yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
  grid: {
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
  classForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'var(--bg-primary)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
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
    padding: '8px 12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  submitBtn: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '600',
  },
  classesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionHeading: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  classesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '10px',
  },
  classBadge: {
    padding: '12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '500',
    fontSize: '13px',
    transition: 'var(--transition)',
  },
  subjectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  tableCard: {
    backgroundColor: 'var(--bg-secondary)',
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
    padding: '24px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
  }
};
