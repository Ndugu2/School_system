import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Plus, Trash2, Edit3, UserCheck, X } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    gender: 'Male',
    classId: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: ''
  });

  const fetchStudents = async () => {
    try {
      const data = await api.get('/students');
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students');
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await api.get('/classes');
      setClasses(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, classId: data[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load classes');
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students', formData);
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        dob: '',
        gender: 'Male',
        classId: classes[0]?._id || '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: ''
      });
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Error enrolling student');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student and their user account?')) {
      try {
        await api.delete(`/students/${id}`);
        fetchStudents();
      } catch (err) {
        alert(err.message || 'Error deleting student');
      }
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.user?.name.toLowerCase().includes(search.toLowerCase()) || 
                          student.studentId.toLowerCase().includes(search.toLowerCase());
    const matchesClass = classFilter ? String(student.class?._id) === classFilter : true;
    return matchesSearch && matchesClass;
  });

  return (
    <div style={styles.container}>
      {/* Header Panel */}
      <div style={styles.header}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.actions}>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <button onClick={() => setShowModal(true)} style={styles.addBtn}>
            <Plus size={18} />
            <span>Enroll Student</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>Student ID</th>
              <th style={styles.th}>Full Name</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Gender</th>
              <th style={styles.th}>Guardian / Parent</th>
              <th style={styles.th}>Guardian Phone</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => (
                <tr key={student._id} style={styles.tableRow}>
                  <td style={{ ...styles.td, fontWeight: '700', color: 'var(--primary)' }}>
                    {student.studentId}
                  </td>
                  <td style={{ ...styles.td, fontWeight: '500' }}>
                    {student.user?.name}
                  </td>
                  <td style={styles.td}>
                    {student.class?.name || 'Unassigned'}
                  </td>
                  <td style={styles.td}>
                    {student.gender}
                  </td>
                  <td style={styles.td}>
                    {student.parentName}
                  </td>
                  <td style={styles.td}>
                    {student.parentPhone}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.btnGroup}>
                      <button style={styles.editBtn}>
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDelete(student._id)} style={styles.deleteBtn}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={styles.noData}>
                  No students found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3>Enroll New Student</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                {/* Academic Fields */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Student Full Name</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} style={styles.input} placeholder="John Mukasa" />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>School Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} style={styles.input} placeholder="john@school.com" />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Class Level</label>
                  <select name="classId" value={formData.classId} onChange={handleChange} style={styles.select}>
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} style={styles.select}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Date of Birth</label>
                  <input type="date" name="dob" required value={formData.dob} onChange={handleChange} style={styles.input} />
                </div>

                {/* Parent Fields */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Parent/Guardian Name</label>
                  <input type="text" name="parentName" required value={formData.parentName} onChange={handleChange} style={styles.input} placeholder="Robert Mukasa" />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Parent Contact Number</label>
                  <input type="text" name="parentPhone" required value={formData.parentPhone} onChange={handleChange} style={styles.input} placeholder="+256 701 234567" />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Parent Email Address</label>
                  <input type="email" name="parentEmail" value={formData.parentEmail} onChange={handleChange} style={styles.input} placeholder="robert@example.com" />
                </div>

                <div style={{ ...styles.fieldGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Residential Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} style={styles.input} placeholder="e.g. Bukoto, Kampala" />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn}>
                  <UserCheck size={18} />
                  <span>Register & Enroll</span>
                </button>
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
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    maxWidth: '360px',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-tertiary)',
  },
  searchInput: {
    width: '100%',
    padding: '10px 16px 10px 42px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  filterSelect: {
    padding: '10px 16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  addBtn: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    transition: 'var(--transition)',
    ':hover': {
      backgroundColor: 'var(--primary-hover)',
    }
  },
  tableCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
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
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: '1px solid var(--border)',
    transition: 'var(--transition)',
    ':hover': {
      backgroundColor: 'var(--bg-tertiary)',
    }
  },
  td: {
    padding: '16px 24px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  btnGroup: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    backgroundColor: 'transparent',
    color: 'var(--danger)',
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
    maxWidth: '680px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '20px 28px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  form: {
    padding: '28px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
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
  modalFooter: {
    gridColumn: 'span 2',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '28px',
    borderTop: '1px solid var(--border)',
    paddingTop: '20px',
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 24px',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
  }
};
