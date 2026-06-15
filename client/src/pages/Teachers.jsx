import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Search, Trash2, Edit3, Briefcase, X } from 'lucide-react';

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    qualification: '',
    phoneNumber: '',
    password: ''
  });

  const fetchTeachers = async () => {
    try {
      const data = await api.get('/teachers');
      setTeachers(data);
    } catch (err) {
      console.error('Failed to load teachers');
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teachers', formData);
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        qualification: '',
        phoneNumber: '',
        password: ''
      });
      fetchTeachers();
    } catch (err) {
      alert(err.message || 'Error adding teacher');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher profile?')) {
      try {
        await api.delete(`/teachers/${id}`);
        fetchTeachers();
      } catch (err) {
        alert(err.message || 'Error deleting teacher');
      }
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.user?.name.toLowerCase().includes(search.toLowerCase()) || 
    t.qualification.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Header Panel */}
      <div style={styles.header}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by instructor name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <button onClick={() => setShowModal(true)} style={styles.addBtn}>
          <Plus size={18} />
          <span>Add Instructor</span>
        </button>
      </div>

      {/* Table Container */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Qualification</th>
              <th style={styles.th}>Phone Number</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Assigned Subjects</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map(teacher => (
                <tr key={teacher._id} style={styles.tableRow}>
                  <td style={{ ...styles.td, fontWeight: '600' }}>
                    {teacher.user?.name}
                  </td>
                  <td style={styles.td}>
                    {teacher.qualification}
                  </td>
                  <td style={styles.td}>
                    {teacher.phoneNumber}
                  </td>
                  <td style={styles.td}>
                    {teacher.user?.email}
                  </td>
                  <td style={styles.td}>
                    {teacher.subjects?.map(s => s.name).join(', ') || 'General Duty'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.btnGroup}>
                      <button style={styles.editBtn}>
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDelete(teacher._id)} style={styles.deleteBtn}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={styles.noData}>
                  No instructors found.
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
              <h3>Register New Instructor</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} style={styles.input} placeholder="e.g. Sarah Namubiru" />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} style={styles.input} placeholder="sarah@school.com" />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Qualification / Degree</label>
                  <input type="text" name="qualification" required value={formData.qualification} onChange={handleChange} style={styles.input} placeholder="e.g. B.Ed (Math & Physics)" />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Phone Contact</label>
                  <input type="text" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} style={styles.input} placeholder="+256 772 123456" />
                </div>

                <div style={{ ...styles.fieldGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Account Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} style={styles.input} placeholder="Default is teacher123" />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn}>
                  <Briefcase size={18} />
                  <span>Register Instructor</span>
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
    maxWidth: '580px',
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
