import React, { useState } from 'react';
import { 
  BookOpen, Plus, Search, RefreshCw, Trash2, Edit3, 
  CheckCircle, AlertCircle, X, Check, Award, Layers
} from 'lucide-react';
import { api } from '../../services/api';

export default function SubjectsTab({ 
  subjects, 
  teachers, 
  onRefresh, 
  showAlert 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'O' | 'A'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'compulsory' | 'optional' | 'principal' | 'subsidiary'
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    level: 'O',
    category: 'compulsory', // 'compulsory' | 'optional' | 'principal' | 'subsidiary'
    department: 'Sciences',
    teacherId: '',
    applicableLevels: ['S1', 'S2', 'S3', 'S4']
  });

  // Switch form level
  const handleFormLevelChange = (lvl) => {
    const defaultCat = lvl === 'O' ? 'compulsory' : 'principal';
    const defaultClasses = lvl === 'O' ? ['S1', 'S2', 'S3', 'S4'] : ['S5', 'S6'];
    setFormData(prev => ({
      ...prev,
      level: lvl,
      category: defaultCat,
      applicableLevels: defaultClasses
    }));
  };

  const toggleApplicableLevel = (lvl) => {
    setFormData(prev => {
      const exists = prev.applicableLevels.includes(lvl);
      if (exists) {
        return { ...prev, applicableLevels: prev.applicableLevels.filter(l => l !== lvl) };
      } else {
        return { ...prev, applicableLevels: [...prev.applicableLevels, lvl] };
      }
    });
  };

  // Submit Add Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      level: formData.level,
      category: formData.category,
      type: formData.category,
      department: formData.department,
      teacherId: formData.teacherId || null,
      applicableLevels: formData.applicableLevels,
      isCompulsory: formData.category === 'compulsory' || formData.category === 'subsidiary'
    };

    try {
      await api.post('/subjects', payload);
      showAlert(`Subject "${formData.name}" (${payload.code}) registered successfully!`);
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        level: 'O',
        category: 'compulsory',
        department: 'Sciences',
        teacherId: '',
        applicableLevels: ['S1', 'S2', 'S3', 'S4']
      });
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to create subject', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit Subject
  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject) return;
    setActionLoading(true);

    try {
      await api.put(`/subjects/${editingSubject._id}`, {
        name: editingSubject.name,
        code: editingSubject.code.toUpperCase(),
        level: editingSubject.level,
        category: editingSubject.category || editingSubject.type,
        type: editingSubject.category || editingSubject.type,
        department: editingSubject.department,
        teacherId: editingSubject.teacher?._id || editingSubject.teacher || null,
        applicableLevels: editingSubject.applicableLevels,
        isActive: editingSubject.isActive
      });
      showAlert(`Subject "${editingSubject.name}" updated!`);
      setEditingSubject(null);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to update subject', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subId, subName) => {
    if (!window.confirm(`Are you sure you want to remove subject "${subName}" from the curriculum?`)) return;
    setActionLoading(true);
    try {
      await api.delete(`/subjects/${subId}`);
      showAlert(`Subject "${subName}" removed`);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to delete subject', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Subjects
  const filtered = subjects.filter(sub => {
    if (levelFilter !== 'all' && sub.level !== levelFilter) return false;
    if (categoryFilter !== 'all') {
      const cat = sub.category || sub.type;
      if (cat !== categoryFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.name?.toLowerCase().includes(q);
      const matchCode = sub.code?.toLowerCase().includes(q);
      const matchDept = sub.department?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDept) return false;
    }
    return true;
  });

  // Stats calculation
  const totalOCompulsory = subjects.filter(s => s.level === 'O' && (s.category === 'compulsory' || s.type === 'compulsory')).length;
  const totalOOptional = subjects.filter(s => s.level === 'O' && (s.category === 'optional' || s.type === 'optional')).length;
  const totalAPrincipal = subjects.filter(s => s.level === 'A' && (s.category === 'principal' || s.type === 'principal')).length;
  const totalASubsidiary = subjects.filter(s => s.level === 'A' && (s.category === 'subsidiary' || s.type === 'subsidiary')).length;

  return (
    <div>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={28} color="#d8b257" />
            <span>Curriculum Subjects Management</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14.5px', margin: '6px 0 0 0' }}>
            Manage O-Level (Compulsory &amp; Optional) and A-Level (Principal &amp; Subsidiary) subjects with UNEB codes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onRefresh} className="ap-btn-secondary" title="Sync subjects">
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="ap-btn-primary"
            style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
          >
            <Plus size={16} />
            <span>Add New Subject</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#0d1527', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Subjects</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{subjects.length}</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>UNEB Secondary Catalog</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>O-Level Compulsory</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d8b257', marginTop: '4px' }}>{totalOCompulsory}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Core CBC Curriculum</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>O-Level Optional</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>{totalOOptional}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Electives / Vocational</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>A-Level Principal</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>{totalAPrincipal}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>3 Principal Subjects</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>A-Level Subsidiary</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>{totalASubsidiary}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>GP, Sub-Math, Sub-ICT</div>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div style={{ backgroundColor: '#0d1527', padding: '16px 20px', borderRadius: '14px', marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Level Filter Pills */}
          {[
            { id: 'all', label: 'All Levels' },
            { id: 'O', label: 'O-Level (S1-S4)' },
            { id: 'A', label: 'A-Level (S5-S6)' }
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setLevelFilter(lvl.id)}
              style={{
                backgroundColor: levelFilter === lvl.id ? '#c59b27' : '#131f37',
                color: levelFilter === lvl.id ? '#080e1a' : '#cbd5e1',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {lvl.label}
            </button>
          ))}

          {/* Classification Filter Dropdown */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '7px 12px', color: '#fff', fontSize: '12.5px' }}
          >
            <option value="all">All Classifications</option>
            <option value="compulsory">O-Level: Compulsory</option>
            <option value="optional">O-Level: Optional / Elective</option>
            <option value="principal">A-Level: Principal</option>
            <option value="subsidiary">A-Level: Subsidiary</option>
          </select>
        </div>

        <div className="ap-search-box" style={{ width: '280px' }}>
          <Search size={14} />
          <input 
            type="text" 
            placeholder="Search code or subject..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="ap-search-input"
            style={{ fontSize: '13px' }}
          />
        </div>
      </div>

      {/* 4. Subjects Table */}
      {filtered.length === 0 ? (
        <div className="ap-empty-state">
          <BookOpen size={36} color="#d8b257" />
          <p>No subjects match the selected criteria.</p>
        </div>
      ) : (
        <div className="ap-table-wrapper">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Curriculum Level</th>
                <th>Classification</th>
                <th>Department</th>
                <th>Teacher Assigned</th>
                <th>Applicable Classes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const cat = sub.category || sub.type;
                return (
                  <tr key={sub._id}>
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 800, 
                        fontSize: '13.5px',
                        backgroundColor: '#131f37',
                        color: '#d8b257',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {sub.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#fff' }}>{sub.name}</div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '3px 10px', 
                        borderRadius: '9999px', 
                        fontSize: '11.5px', 
                        fontWeight: 800,
                        backgroundColor: sub.level === 'O' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(192, 132, 252, 0.15)',
                        color: sub.level === 'O' ? '#60a5fa' : '#c084fc'
                      }}>
                        {sub.level === 'O' ? 'O-Level' : 'A-Level'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        backgroundColor: cat === 'compulsory' ? 'rgba(216, 178, 87, 0.18)' : cat === 'principal' ? 'rgba(16, 185, 129, 0.18)' : cat === 'subsidiary' ? 'rgba(192, 132, 252, 0.18)' : 'rgba(148, 163, 184, 0.18)',
                        color: cat === 'compulsory' ? '#d8b257' : cat === 'principal' ? '#34d399' : cat === 'subsidiary' ? '#c084fc' : '#cbd5e1'
                      }}>
                        {cat}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{sub.department || 'General'}</span>
                    </td>
                    <td>
                      {sub.teacher ? (
                        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                          {sub.teacher.name || sub.teacher.email}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(sub.applicableLevels && sub.applicableLevels.length > 0) ? (
                          sub.applicableLevels.map(cls => (
                            <span key={cls} style={{ backgroundColor: '#080e1a', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                              {cls}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>All</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setEditingSubject(sub)}
                          className="ap-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          title="Edit subject"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub._id, sub.name)}
                          className="ap-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                          title="Delete subject"
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

      {/* 5. Modal: Add New Subject */}
      {showAddModal && (
        <div className="ap-modal-overlay">
          <div className="ap-modal" style={{ maxWidth: '620px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={18} color="#d8b257" />
                <span>Add Curriculum Subject</span>
              </h3>
              <button type="button" className="ap-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubject}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Level Picker */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>Curriculum Level *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleFormLevelChange('O')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: formData.level === 'O' ? '#c59b27' : '#080e1a',
                        color: formData.level === 'O' ? '#080e1a' : '#fff',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      O-Level (S1 - S4)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormLevelChange('A')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: formData.level === 'A' ? '#c59b27' : '#080e1a',
                        color: formData.level === 'A' ? '#080e1a' : '#fff',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      A-Level (S5 - S6)
                    </button>
                  </div>
                </div>

                {/* Name & Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Subject Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={formData.level === 'O' ? "e.g. Mathematics / Agriculture" : "e.g. Physics / Subsidiary ICT"}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Subject Code *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={formData.level === 'O' ? "e.g. MTH" : "e.g. P510"}
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#d8b257', fontWeight: 800, fontSize: '14px', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                {/* Classification (Compulsory / Optional / Principal / Subsidiary) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      {formData.level === 'O' ? 'O-Level Classification *' : 'A-Level Classification *'}
                    </label>
                    {formData.level === 'O' ? (
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                      >
                        <option value="compulsory">Compulsory (All S1-S4 students)</option>
                        <option value="optional">Optional / Elective</option>
                      </select>
                    ) : (
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                      >
                        <option value="principal">Principal Subject (e.g. P510, P425)</option>
                        <option value="subsidiary">Subsidiary Subject (e.g. S475 Sub-Math, S850 ICT, S101 GP)</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Department</label>
                    <select
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    >
                      <option value="Sciences">Sciences</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Languages">Languages</option>
                      <option value="Humanities">Humanities</option>
                      <option value="Technical">Technical / ICT</option>
                      <option value="Vocational">Vocational / Agriculture</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Teacher */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Assigned Teacher (Head of Subject)</label>
                  <select
                    value={formData.teacherId}
                    onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  >
                    <option value="">-- No Teacher Assigned Yet --</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t.user?._id || t._id}>
                        {t.user?.name || t.name} ({t.user?.email || t.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Applicable Classes */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>Applicable Classes</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(cls => {
                      const checked = formData.applicableLevels.includes(cls);
                      return (
                        <label 
                          key={cls}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: checked ? '#131f37' : '#080e1a',
                            color: checked ? '#d8b257' : '#94a3b8',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => toggleApplicableLevel(cls)}
                            style={{ accentColor: '#c59b27' }}
                          />
                          <span>{cls}</span>
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
                  {actionLoading ? 'Saving...' : 'Register Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Edit Subject */}
      {editingSubject && (
        <div className="ap-modal-overlay">
          <div className="ap-modal" style={{ maxWidth: '580px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#d8b257" />
                <span>Edit Subject: {editingSubject.name}</span>
              </h3>
              <button type="button" className="ap-modal-close" onClick={() => setEditingSubject(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Subject Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={editingSubject.name}
                      onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Subject Code *</label>
                    <input 
                      type="text" 
                      required 
                      value={editingSubject.code}
                      onChange={e => setEditingSubject({ ...editingSubject, code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#d8b257', fontWeight: 800, fontSize: '14px', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Curriculum Level</label>
                    <select
                      value={editingSubject.level}
                      onChange={e => setEditingSubject({ ...editingSubject, level: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    >
                      <option value="O">O-Level (S1 - S4)</option>
                      <option value="A">A-Level (S5 - S6)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Classification</label>
                    <select
                      value={editingSubject.category || editingSubject.type}
                      onChange={e => setEditingSubject({ ...editingSubject, category: e.target.value, type: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    >
                      <option value="compulsory">O-Level: Compulsory</option>
                      <option value="optional">O-Level: Optional / Elective</option>
                      <option value="principal">A-Level: Principal</option>
                      <option value="subsidiary">A-Level: Subsidiary</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Department</label>
                  <input 
                    type="text" 
                    value={editingSubject.department || ''}
                    onChange={e => setEditingSubject({ ...editingSubject, department: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Teacher Assigned</label>
                  <select
                    value={editingSubject.teacher?._id || editingSubject.teacher || ''}
                    onChange={e => setEditingSubject({ ...editingSubject, teacher: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  >
                    <option value="">-- No Teacher Assigned --</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t.user?._id || t._id}>
                        {t.user?.name || t.name} ({t.user?.email || t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setEditingSubject(null)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="ap-btn-primary" 
                  style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
                >
                  {actionLoading ? 'Saving...' : 'Update Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
