import React, { useState } from 'react';
import { 
  Users, Plus, Search, RefreshCw, Trash2, Edit3, 
  Phone, Mail, Award, CheckCircle, AlertCircle, X, Check
} from 'lucide-react';
import { api } from '../../services/api';

export default function TeachersTab({ 
  teachers, 
  subjects, 
  classes, 
  onRefresh, 
  showAlert 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form: Add Teacher
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: 'TeacherPass2026!',
    qualification: '',
    phoneNumber: '',
    selectedSubjects: [],
    selectedClasses: []
  });

  const toggleSubject = (subId) => {
    setTeacherForm(prev => {
      const exists = prev.selectedSubjects.includes(subId);
      if (exists) {
        return { ...prev, selectedSubjects: prev.selectedSubjects.filter(id => id !== subId) };
      } else {
        return { ...prev, selectedSubjects: [...prev.selectedSubjects, subId] };
      }
    });
  };

  const toggleClass = (clsId) => {
    setTeacherForm(prev => {
      const exists = prev.selectedClasses.includes(clsId);
      if (exists) {
        return { ...prev, selectedClasses: prev.selectedClasses.filter(id => id !== clsId) };
      } else {
        return { ...prev, selectedClasses: [...prev.selectedClasses, clsId] };
      }
    });
  };

  // Submit Add Teacher
  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await api.post('/teachers', {
        name: teacherForm.name.trim(),
        email: teacherForm.email.trim(),
        password: teacherForm.password,
        qualification: teacherForm.qualification.trim(),
        phoneNumber: teacherForm.phoneNumber.trim(),
        subjects: teacherForm.selectedSubjects,
        classes: teacherForm.selectedClasses
      });
      showAlert(`Teacher "${teacherForm.name}" registered with portal login!`);
      setShowAddModal(false);
      setTeacherForm({
        name: '',
        email: '',
        password: 'TeacherPass2026!',
        qualification: '',
        phoneNumber: '',
        selectedSubjects: [],
        selectedClasses: []
      });
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to register teacher', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit Teacher
  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setActionLoading(true);

    try {
      await api.put(`/teachers/${editingTeacher._id}`, {
        name: editingTeacher.user?.name || editingTeacher.name,
        email: editingTeacher.user?.email || editingTeacher.email,
        qualification: editingTeacher.qualification,
        phoneNumber: editingTeacher.phoneNumber,
        subjects: editingTeacher.subjects?.map(s => s._id || s) || [],
        classes: editingTeacher.classes?.map(c => c._id || c) || []
      });
      showAlert('Teacher profile updated!');
      setEditingTeacher(null);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to update teacher profile', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Teacher
  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`Are you sure you want to remove teacher "${teacherName}"?`)) return;
    setActionLoading(true);

    try {
      await api.delete(`/teachers/${teacherId}`);
      showAlert(`Teacher "${teacherName}" removed`);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to delete teacher', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered teachers
  const filtered = teachers.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (t.user?.name || t.name || '').toLowerCase();
    const email = (t.user?.email || t.email || '').toLowerCase();
    const qual = (t.qualification || '').toLowerCase();
    const phone = (t.phoneNumber || '').toLowerCase();
    return name.includes(q) || email.includes(q) || qual.includes(q) || phone.includes(q);
  });

  return (
    <div>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={28} color="#d8b257" />
            <span>Teaching Staff &amp; Faculty Management</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14.5px', margin: '6px 0 0 0' }}>
            Manage secondary school teachers, portal credentials, qualifications, and teaching allocations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onRefresh} className="ap-btn-secondary" title="Sync teachers">
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="ap-btn-primary"
            style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
          >
            <Plus size={16} />
            <span>Add New Teacher</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#0d1527', padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Registered Teachers</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{teachers.length}</div>
          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>Active Portal Staff Accounts</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Curriculum Subjects</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d8b257', marginTop: '6px' }}>{subjects.length}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Available for assignment</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Classes &amp; Streams</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>{classes.length}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Class teacher allocations</div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div style={{ backgroundColor: '#0d1527', padding: '16px 20px', borderRadius: '14px', marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ color: '#cbd5e1', fontSize: '13.5px', fontWeight: 700 }}>
          Staff Directory ({filtered.length} Teachers)
        </div>

        <div className="ap-search-box" style={{ width: '300px' }}>
          <Search size={14} />
          <input 
            type="text" 
            placeholder="Search teacher, email, phone..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="ap-search-input"
            style={{ fontSize: '13px' }}
          />
        </div>
      </div>

      {/* 4. Teachers Table */}
      {filtered.length === 0 ? (
        <div className="ap-empty-state">
          <Users size={36} color="#d8b257" />
          <p>No teachers found. Click <strong>Add New Teacher</strong> to register your faculty.</p>
        </div>
      ) : (
        <div className="ap-table-wrapper">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Teacher Name &amp; Contact</th>
                <th>Academic Qualification</th>
                <th>Phone Number</th>
                <th>Assigned Subjects</th>
                <th>Assigned Classes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const name = t.user?.name || t.name;
                const email = t.user?.email || t.email;
                return (
                  <tr key={t._id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '14.5px' }}>{name}</div>
                      <div style={{ fontSize: '12px', color: '#d8b257', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} />
                        <span>{email}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: '#cbd5e1', fontSize: '13px', maxWidth: '280px', lineHeight: 1.4 }}>
                        {t.qualification || 'B.Ed / Dip. Education'}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: '#fff', fontSize: '13px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Phone size={12} color="#c59b27" />
                        <span>{t.phoneNumber || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                        {(t.subjects && t.subjects.length > 0) ? (
                          t.subjects.map(sub => (
                            <span key={sub._id || sub} style={{ backgroundColor: '#131f37', color: '#d8b257', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              {sub.code || sub.name || 'Subject'}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>None assigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(t.classes && t.classes.length > 0) ? (
                          t.classes.map(c => (
                            <span key={c._id || c} style={{ backgroundColor: '#080e1a', color: '#34d399', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              {c.name || 'Class'}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>None assigned</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setEditingTeacher(t)}
                          className="ap-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          title="Edit teacher"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(t._id, name)}
                          className="ap-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                          title="Delete teacher"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Modal: Add Teacher */}
      {showAddModal && (
        <div className="ap-modal-overlay">
          <div className="ap-modal" style={{ maxWidth: '620px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={18} color="#d8b257" />
                <span>Register New Teacher</span>
              </h3>
              <button type="button" className="ap-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Arthur Mukasa"
                      value={teacherForm.name}
                      onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                    <input 
                      type="tel" 
                      required 
                      placeholder="+256 772 123456"
                      value={teacherForm.phoneNumber}
                      onChange={e => setTeacherForm({ ...teacherForm, phoneNumber: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Portal Login Email *</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="teacher@ndugu.ac.ug"
                      value={teacherForm.email}
                      onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Initial Password</label>
                    <input 
                      type="text" 
                      required 
                      value={teacherForm.password}
                      onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Academic Qualification *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. B.Sc with Education (Physics & Math) - Makerere University"
                    value={teacherForm.qualification}
                    onChange={e => setTeacherForm({ ...teacherForm, qualification: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>

                {/* Assign Subjects */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>Assign Subjects Taught</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', maxHeight: '140px', overflowY: 'auto', backgroundColor: '#080e1a', padding: '12px', borderRadius: '10px' }}>
                    {subjects.map(s => {
                      const checked = teacherForm.selectedSubjects.includes(s._id);
                      return (
                        <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: checked ? '#d8b257' : '#cbd5e1', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => toggleSubject(s._id)}
                            style={{ accentColor: '#c59b27' }}
                          />
                          <span>{s.code} - {s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Assign Classes */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>Assign Classes</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {classes.map(c => {
                      const checked = teacherForm.selectedClasses.includes(c._id);
                      return (
                        <label 
                          key={c._id} 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            backgroundColor: checked ? '#131f37' : '#080e1a', 
                            color: checked ? '#34d399' : '#94a3b8', 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            fontSize: '12.5px',
                            fontWeight: 700
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => toggleClass(c._id)}
                            style={{ accentColor: '#10b981' }}
                          />
                          <span>{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="ap-btn-primary" 
                  style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
                >
                  {actionLoading ? 'Registering...' : 'Register Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Edit Teacher */}
      {editingTeacher && (
        <div className="ap-modal-overlay">
          <div className="ap-modal" style={{ maxWidth: '560px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#d8b257" />
                <span>Edit Teacher Profile</span>
              </h3>
              <button type="button" className="ap-modal-close" onClick={() => setEditingTeacher(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={editingTeacher.user?.name || editingTeacher.name || ''}
                    onChange={e => {
                      if (editingTeacher.user) {
                        setEditingTeacher({ ...editingTeacher, user: { ...editingTeacher.user, name: e.target.value } });
                      } else {
                        setEditingTeacher({ ...editingTeacher, name: e.target.value });
                      }
                    }}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                    <input 
                      type="tel" 
                      value={editingTeacher.phoneNumber || ''}
                      onChange={e => setEditingTeacher({ ...editingTeacher, phoneNumber: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Email</label>
                    <input 
                      type="email" 
                      value={editingTeacher.user?.email || editingTeacher.email || ''}
                      onChange={e => {
                        if (editingTeacher.user) {
                          setEditingTeacher({ ...editingTeacher, user: { ...editingTeacher.user, email: e.target.value } });
                        } else {
                          setEditingTeacher({ ...editingTeacher, email: e.target.value });
                        }
                      }}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Academic Qualification</label>
                  <input 
                    type="text" 
                    value={editingTeacher.qualification || ''}
                    onChange={e => setEditingTeacher({ ...editingTeacher, qualification: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setEditingTeacher(null)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="ap-btn-primary" 
                  style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
                >
                  {actionLoading ? 'Saving...' : 'Update Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
