import React, { useState } from 'react';
import { 
  School, Plus, RefreshCw, Trash2, Edit3, Users, 
  Layers, CheckCircle, AlertCircle, X, Check, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function ClassesStreamsTab({ 
  classes, 
  teachers, 
  academicYears, 
  onRefresh, 
  showAlert 
}) {
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [attachingToClass, setAttachingToClass] = useState(null); // class object
  const [actionLoading, setActionLoading] = useState(false);

  // Form: Create Class
  const [classForm, setClassForm] = useState({
    name: '',
    level: 'S1',
    classTeacher: '',
    academicYear: ''
  });

  // Form: Attach Stream
  const [streamForm, setStreamForm] = useState({
    name: '',
    classTeacher: '',
    capacity: 45
  });

  // Submit Create Class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await api.post('/classes', {
        name: classForm.name.trim(),
        level: classForm.level,
        classTeacher: classForm.classTeacher || null,
        academicYear: classForm.academicYear || undefined
      });
      showAlert(`Class "${classForm.name}" created successfully!`);
      setShowAddClassModal(false);
      setClassForm({ name: '', level: 'S1', classTeacher: '', academicYear: '' });
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to create class', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Attach Stream
  const handleAttachStream = async (e) => {
    e.preventDefault();
    if (!attachingToClass) return;
    setActionLoading(true);

    try {
      await api.post(`/classes/${attachingToClass._id}/streams`, {
        name: streamForm.name.trim(),
        classTeacher: streamForm.classTeacher || null,
        capacity: Number(streamForm.capacity) || 45
      });
      showAlert(`Stream "${streamForm.name}" attached to ${attachingToClass.name}!`);
      setAttachingToClass(null);
      setStreamForm({ name: '', classTeacher: '', capacity: 45 });
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to attach stream', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove Stream
  const handleRemoveStream = async (classId, streamId, streamName) => {
    if (!window.confirm(`Are you sure you want to remove Stream "${streamName}"?`)) return;
    setActionLoading(true);

    try {
      await api.delete(`/classes/${classId}/streams/${streamId}`);
      showAlert(`Stream "${streamName}" removed`);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to remove stream', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Class
  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to delete class "${className}" and all its attached streams?`)) return;
    setActionLoading(true);

    try {
      await api.delete(`/classes/${classId}`);
      showAlert(`Class "${className}" deleted`);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to delete class', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Stats
  const totalStreams = classes.reduce((sum, c) => sum + (c.streams?.length || 0), 0);
  const totalCapacity = classes.reduce((sum, c) => {
    const classStreamCap = (c.streams || []).reduce((sSum, st) => sSum + (st.capacity || 45), 0);
    return sum + (classStreamCap > 0 ? classStreamCap : 45);
  }, 0);

  return (
    <div>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Layers size={28} color="#d8b257" />
            <span>Classes &amp; Streams Management</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14.5px', margin: '6px 0 0 0' }}>
            Manage secondary classes (S.1 to S.6) and attach custom streams with designated stream teachers and capacities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onRefresh} className="ap-btn-secondary" title="Sync classes">
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          <button 
            onClick={() => setShowAddClassModal(true)} 
            className="ap-btn-primary"
            style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
          >
            <Plus size={16} />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#0d1527', padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Classes Configured</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{classes.length}</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>Senior 1 to Senior 6</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Attached Streams</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d8b257', marginTop: '6px' }}>{totalStreams}</div>
          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>Active Class Divisions</div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Student Capacity</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>{totalCapacity}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Across all school streams</div>
        </div>
      </div>

      {/* 3. Classes Grid with Attached Streams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
        {classes.map(cls => {
          return (
            <div 
              key={cls._id} 
              style={{ 
                backgroundColor: '#0d1527', 
                borderRadius: '18px', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px'
              }}
            >
              <div>
                {/* Class Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>
                        {cls.name}
                      </h3>
                      <span style={{ 
                        backgroundColor: '#131f37', 
                        color: '#d8b257', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: 800,
                        fontFamily: 'monospace'
                      }}>
                        {cls.level}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                      Academic Year: <strong style={{ color: '#cbd5e1' }}>{cls.academicYear?.label || cls.academicYear?.year || cls.academicYearValue || '2026'}</strong>
                      {cls.classTeacher && (
                        <span> &bull; Head Teacher: <strong style={{ color: '#d8b257' }}>{cls.classTeacher.name}</strong></span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteClass(cls._id, cls.name)}
                    className="ap-btn-secondary"
                    style={{ padding: '6px 10px', color: '#ef4444' }}
                    title="Delete Class"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Attached Streams List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Attached Streams ({cls.streams?.length || 0}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachingToClass(cls)}
                      className="ap-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px', color: '#d8b257' }}
                    >
                      <Plus size={12} />
                      <span>Attach Stream</span>
                    </button>
                  </div>

                  {(!cls.streams || cls.streams.length === 0) ? (
                    <div style={{ backgroundColor: '#080e1a', padding: '14px', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                      No streams attached yet. Click <strong>Attach Stream</strong> to add divisions (e.g. North, South, East).
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cls.streams.map(st => (
                        <div 
                          key={st._id} 
                          style={{ 
                            backgroundColor: '#080e1a', 
                            padding: '12px 14px', 
                            borderRadius: '10px',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center' 
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px', color: '#fff' }}>{st.name}</strong>
                              <span style={{ fontSize: '11px', color: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                                Cap: {st.capacity || 45}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                              Class Teacher: {st.classTeacher?.name ? <span style={{ color: '#d8b257' }}>{st.classTeacher.name}</span> : 'Unassigned'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveStream(cls._id, st._id, st.name)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Remove stream"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Button */}
              <button
                type="button"
                onClick={() => setAttachingToClass(cls)}
                className="btn-hero-ug-gold"
                style={{ width: '100%', fontSize: '13.5px', padding: '10px', borderRadius: '10px' }}
              >
                <Plus size={14} />
                <span>+ Attach Another Stream to {cls.name}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 4. Modal: Add New Class */}
      {showAddClassModal && (
        <div className="ap-modal-overlay">
          <div className="ap-modal" style={{ maxWidth: '520px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={18} color="#d8b257" />
                <span>Create New Class</span>
              </h3>
              <button type="button" className="ap-modal-close" onClick={() => setShowAddClassModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClass}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Class Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Senior 1 or S.1"
                    value={classForm.name}
                    onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Level *</label>
                    <select
                      value={classForm.level}
                      onChange={e => setClassForm({ ...classForm, level: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    >
                      <option value="S1">Senior 1 (S1)</option>
                      <option value="S2">Senior 2 (S2)</option>
                      <option value="S3">Senior 3 (S3)</option>
                      <option value="S4">Senior 4 (S4)</option>
                      <option value="S5">Senior 5 (S5)</option>
                      <option value="S6">Senior 6 (S6)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Academic Year</label>
                    <select
                      value={classForm.academicYear}
                      onChange={e => setClassForm({ ...classForm, academicYear: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    >
                      <option value="">-- Active Year (Auto) --</option>
                      {academicYears.map(yr => (
                        <option key={yr._id} value={yr._id}>
                          {yr.label || yr.year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Overall Class Teacher</label>
                  <select
                    value={classForm.classTeacher}
                    onChange={e => setClassForm({ ...classForm, classTeacher: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  >
                    <option value="">-- Select Class Teacher --</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t.user?._id || t._id}>
                        {t.user?.name || t.name} ({t.user?.email || t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setShowAddClassModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="ap-btn-primary" 
                  style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
                >
                  {actionLoading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Attach Stream to Class */}
      {attachingToClass && (
        <div className="ap-modal-overlay">
          <div className="ap-modal" style={{ maxWidth: '520px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={18} color="#d8b257" />
                <span>Attach Stream to {attachingToClass.name}</span>
              </h3>
              <button type="button" className="ap-modal-close" onClick={() => setAttachingToClass(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAttachStream}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Stream Name * (e.g. North, South, East, Stream A, Sciences)
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. North / South / Stream A / Blue"
                    value={streamForm.name}
                    onChange={e => setStreamForm({ ...streamForm, name: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Stream Class Teacher</label>
                    <select
                      value={streamForm.classTeacher}
                      onChange={e => setStreamForm({ ...streamForm, classTeacher: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    >
                      <option value="">-- Select Teacher --</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t.user?._id || t._id}>
                          {t.user?.name || t.name} ({t.user?.email || t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Max Capacity</label>
                    <input 
                      type="number" 
                      min="10" 
                      max="100" 
                      value={streamForm.capacity}
                      onChange={e => setStreamForm({ ...streamForm, capacity: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setAttachingToClass(null)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="ap-btn-primary" 
                  style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
                >
                  {actionLoading ? 'Attaching...' : 'Attach Stream to DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
