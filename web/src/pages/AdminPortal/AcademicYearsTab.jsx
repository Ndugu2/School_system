import React, { useState } from 'react';
import { 
  Calendar, CheckCircle, Plus, Clock, Trash2, Edit3, 
  AlertCircle, RefreshCw, Sparkles, Check, X, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function AcademicYearsTab({ 
  academicYears, 
  onRefresh, 
  showAlert 
}) {
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state for creating academic year
  const [newYearForm, setNewYearForm] = useState({
    year: new Date().getFullYear(),
    label: `${new Date().getFullYear()} Academic Year`,
    term1Start: '',
    term1End: '',
    term2Start: '',
    term2End: '',
    term3Start: '',
    term3End: '',
    notes: ''
  });

  // Activate Academic Year
  const handleActivateYear = async (yearId, yearNumber) => {
    setActionLoading(true);
    try {
      await api.patch(`/academic-years/${yearId}/activate`);
      showAlert(`Academic Year ${yearNumber} is now set as the active school year!`);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to activate academic year', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Activate Term
  const handleActivateTerm = async (yearId, termName) => {
    setActionLoading(true);
    try {
      await api.patch(`/academic-years/${yearId}/terms/${encodeURIComponent(termName)}/activate`);
      showAlert(`${termName} is now set as the current active term!`);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to activate term', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Year
  const handleDeleteYear = async (yearId, yearNumber) => {
    if (!window.confirm(`Are you sure you want to delete Academic Year ${yearNumber}?`)) return;
    setActionLoading(true);
    try {
      await api.delete(`/academic-years/${yearId}`);
      showAlert(`Academic Year ${yearNumber} deleted`);
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to delete academic year', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Create Year
  const handleCreateYear = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    const payload = {
      year: Number(newYearForm.year),
      label: newYearForm.label.trim() || `${newYearForm.year} Academic Year`,
      notes: newYearForm.notes.trim(),
      terms: [
        { 
          name: 'Term I', 
          isActive: true, 
          isCurrent: true, 
          startDate: newYearForm.term1Start ? new Date(newYearForm.term1Start) : undefined,
          endDate: newYearForm.term1End ? new Date(newYearForm.term1End) : undefined
        },
        { 
          name: 'Term II', 
          isActive: false, 
          isCurrent: false, 
          startDate: newYearForm.term2Start ? new Date(newYearForm.term2Start) : undefined,
          endDate: newYearForm.term2End ? new Date(newYearForm.term2End) : undefined
        },
        { 
          name: 'Term III', 
          isActive: false, 
          isCurrent: false, 
          startDate: newYearForm.term3Start ? new Date(newYearForm.term3Start) : undefined,
          endDate: newYearForm.term3End ? new Date(newYearForm.term3End) : undefined
        }
      ]
    };

    try {
      await api.post('/academic-years', payload);
      showAlert(`Academic Year ${newYearForm.year} configured with Term I, II & III!`);
      setShowAddYearModal(false);
      setNewYearForm({
        year: new Date().getFullYear() + 1,
        label: `${new Date().getFullYear() + 1} Academic Year`,
        term1Start: '',
        term1End: '',
        term2Start: '',
        term2End: '',
        term3Start: '',
        term3End: '',
        notes: ''
      });
      onRefresh();
    } catch (err) {
      showAlert(err.message || 'Failed to create academic year', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const activeYear = academicYears.find(y => y.isActive);
  const currentTerm = activeYear?.terms?.find(t => t.isCurrent);

  return (
    <div>
      {/* 1. Header Banner & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={28} color="#d8b257" />
            <span>Academic Years &amp; Terms Management</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14.5px', margin: '6px 0 0 0' }}>
            Configure school calendar years, active sessions, and switch between <strong>Term I</strong>, <strong>Term II</strong>, and <strong>Term III</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onRefresh} 
            className="ap-btn-secondary" 
            title="Refresh academic years"
          >
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          <button 
            onClick={() => setShowAddYearModal(true)} 
            className="ap-btn-primary"
            style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
          >
            <Plus size={16} />
            <span>Add Academic Year</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#0d1527', padding: '22px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Active Academic Year</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d8b257', marginTop: '6px' }}>
            {activeYear ? activeYear.label || activeYear.year : 'None Configured'}
          </div>
          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>
            {activeYear ? '● Official Current Session' : 'Please activate a year'}
          </div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '22px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Current Active Term</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
            {currentTerm ? currentTerm.name : 'Term I'}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
            {activeYear ? `Under ${activeYear.year} Session` : 'No active session'}
          </div>
        </div>

        <div style={{ backgroundColor: '#0d1527', padding: '22px 24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Academic Years</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
            {academicYears.length}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Covering UNEB curriculum cycles
          </div>
        </div>
      </div>

      {/* 3. List of Academic Years & Their Terms */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {academicYears.map(yr => {
          return (
            <div 
              key={yr._id} 
              style={{ 
                backgroundColor: '#0d1527', 
                padding: '28px', 
                borderRadius: '18px',
                borderLeft: yr.isActive ? '6px solid #10b981' : '6px solid #1e293b'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
                      {yr.label || `${yr.year} Academic Year`}
                    </h3>
                    {yr.isActive ? (
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                        ✓ Active School Year
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#131f37', color: '#94a3b8', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '9999px' }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  {yr.notes && (
                    <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: '4px 0 0 0' }}>
                      {yr.notes}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {!yr.isActive && (
                    <button 
                      onClick={() => handleActivateYear(yr._id, yr.year)}
                      disabled={actionLoading}
                      className="ap-btn-primary"
                      style={{ backgroundColor: '#10b981', color: '#080e1a', fontSize: '13px', padding: '8px 16px' }}
                    >
                      <Check size={14} />
                      <span>Set Active Year</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteYear(yr._id, yr.year)}
                    disabled={actionLoading || yr.isActive}
                    className="ap-btn-secondary"
                    style={{ color: yr.isActive ? '#64748b' : '#ef4444', fontSize: '13px', padding: '8px 12px' }}
                    title={yr.isActive ? 'Active year cannot be deleted' : 'Delete year'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Three Terms within the Academic Year */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {(yr.terms || []).map(term => {
                  const isCur = term.isCurrent && yr.isActive;
                  return (
                    <div 
                      key={term._id || term.name} 
                      style={{ 
                        backgroundColor: '#080e1a', 
                        padding: '18px 20px', 
                        borderRadius: '12px',
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between',
                        gap: '14px',
                        borderLeft: isCur ? '4px solid #34d399' : '4px solid #131f37'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '17px', fontWeight: 800, color: isCur ? '#34d399' : '#fff' }}>
                            {term.name}
                          </span>
                          {isCur && (
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '4px' }}>
                              Current Term
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6 }}>
                          <div>
                            <strong>Begins:</strong> {term.startDate ? new Date(term.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set'}
                          </div>
                          <div>
                            <strong>Ends:</strong> {term.endDate ? new Date(term.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set'}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCur ? (
                          <div style={{ fontSize: '12.5px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CheckCircle size={14} />
                            <span>Currently Running Session</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleActivateTerm(yr._id, term.name)}
                            className="ap-btn-secondary"
                            style={{ width: '100%', fontSize: '12.5px', padding: '8px 12px', justifyContent: 'center' }}
                          >
                            <span>Set as Current Term</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Modal: Add Academic Year */}
      {showAddYearModal && (
        <div className="ap-modal-overlay">
          <div className="ap-modal" style={{ maxWidth: '600px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={18} color="#d8b257" />
                <span>Configure New Academic Year</span>
              </h3>
              <button 
                type="button" 
                className="ap-modal-close" 
                onClick={() => setShowAddYearModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateYear}>
              <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Year Number *</label>
                    <input 
                      type="number" 
                      required 
                      min="2020" 
                      max="2040" 
                      value={newYearForm.year}
                      onChange={e => setNewYearForm({ ...newYearForm, year: e.target.value, label: `${e.target.value} Academic Year` })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Label / Title *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. 2027 Academic Year"
                      value={newYearForm.label}
                      onChange={e => setNewYearForm({ ...newYearForm, label: e.target.value })}
                      style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px' }}
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: '#080e1a', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#d8b257', marginBottom: '12px' }}>
                    Term Dates (Term I, Term II, Term III):
                  </div>
                  
                  {/* Term 1 */}
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Term I Dates:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                      <input 
                        type="date" 
                        value={newYearForm.term1Start}
                        onChange={e => setNewYearForm({ ...newYearForm, term1Start: e.target.value })}
                        style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                      />
                      <input 
                        type="date" 
                        value={newYearForm.term1End}
                        onChange={e => setNewYearForm({ ...newYearForm, term1End: e.target.value })}
                        style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Term 2 */}
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Term II Dates:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                      <input 
                        type="date" 
                        value={newYearForm.term2Start}
                        onChange={e => setNewYearForm({ ...newYearForm, term2Start: e.target.value })}
                        style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                      />
                      <input 
                        type="date" 
                        value={newYearForm.term2End}
                        onChange={e => setNewYearForm({ ...newYearForm, term2End: e.target.value })}
                        style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Term 3 */}
                  <div>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Term III Dates:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                      <input 
                        type="date" 
                        value={newYearForm.term3Start}
                        onChange={e => setNewYearForm({ ...newYearForm, term3Start: e.target.value })}
                        style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                      />
                      <input 
                        type="date" 
                        value={newYearForm.term3End}
                        onChange={e => setNewYearForm({ ...newYearForm, term3End: e.target.value })}
                        style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Notes / Remarks (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CBC curriculum alignment, UNEB registration window"
                    value={newYearForm.notes}
                    onChange={e => setNewYearForm({ ...newYearForm, notes: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div className="ap-modal-footer">
                <button 
                  type="button" 
                  className="ap-btn-secondary" 
                  onClick={() => setShowAddYearModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="ap-btn-primary" 
                  style={{ backgroundColor: '#c59b27', color: '#080e1a' }}
                >
                  {actionLoading ? 'Configuring...' : 'Save Academic Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
