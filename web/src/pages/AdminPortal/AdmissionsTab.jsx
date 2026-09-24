import React, { useState } from 'react';
import { 
  UserCheck, Search, RefreshCw, CheckCircle, AlertTriangle, 
  Clock, X, Award, Printer, ShieldCheck, MapPin, HeartHandshake,
  BookOpen, Eye, Check, AlertCircle, FileText
} from 'lucide-react';

export default function AdmissionsTab({ 
  applications, 
  onRefresh, 
  onApprove, 
  onReject, 
  actionLoading 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'O' | 'A'
  
  // Modals
  const [selectedApp, setSelectedApp] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [rejectingAppId, setRejectingAppId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Counts
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  // Filtered Applications
  const filteredApps = applications.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (levelFilter !== 'all' && app.level !== levelFilter) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const fullName = `${app.first_name || ''} ${app.last_name || ''}`.toLowerCase();
    const ref = (app.reference_number || '').toLowerCase();
    const adm = (app.admission_number || '').toLowerCase();
    const district = (app.district || '').toLowerCase();
    const parent = app.parent_details && app.parent_details[0] 
      ? `${app.parent_details[0].parent_first_name} ${app.parent_details[0].parent_last_name} ${app.parent_details[0].contact_number}`.toLowerCase()
      : '';

    return fullName.includes(q) || ref.includes(q) || adm.includes(q) || district.includes(q) || parent.includes(q);
  });

  const handleOpenReview = (app) => {
    setSelectedApp(app);
    setShowReviewModal(true);
  };

  const handleOpenLetter = (app) => {
    setSelectedApp(app);
    setShowLetterModal(true);
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectingAppId) return;
    onReject(rejectingAppId, rejectReason);
    setRejectingAppId(null);
    setRejectReason('');
    if (selectedApp && selectedApp._id === rejectingAppId) {
      setShowReviewModal(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Stat Summary Cards — Solid Dark Navy with NO Borders */}
      <div className="ap-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        
        {/* Total Applications */}
        <div className="ap-stat-card" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer', border: statusFilter === 'all' ? '2px solid #c59b27' : 'none' }}>
          <div className="ap-stat-top">
            <span className="ap-stat-label">Total Applications</span>
            <div className="ap-stat-icon">
              <UserCheck size={18} color="#d8b257" />
            </div>
          </div>
          <div className="ap-stat-val">{totalCount}</div>
          <div className="ap-stat-footer">
            <span style={{ color: '#94a3b8' }}>2026 Intake Candidates</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="ap-stat-card" onClick={() => setStatusFilter('pending')} style={{ cursor: 'pointer', border: statusFilter === 'pending' ? '2px solid #f59e0b' : 'none' }}>
          <div className="ap-stat-top">
            <span className="ap-stat-label">Pending Approval</span>
            <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
          </div>
          <div className="ap-stat-val" style={{ color: '#fbbf24' }}>{pendingCount}</div>
          <div className="ap-stat-footer">
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>Awaiting Headteacher / DOS</span>
          </div>
        </div>

        {/* Approved & Admitted */}
        <div className="ap-stat-card" onClick={() => setStatusFilter('approved')} style={{ cursor: 'pointer', border: statusFilter === 'approved' ? '2px solid #10b981' : 'none' }}>
          <div className="ap-stat-top">
            <span className="ap-stat-label">Approved &amp; Admitted</span>
            <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle size={18} color="#10b981" />
            </div>
          </div>
          <div className="ap-stat-val" style={{ color: '#34d399' }}>{approvedCount}</div>
          <div className="ap-stat-footer">
            <span style={{ color: '#34d399', fontWeight: 700 }}>Admission Numbers Issued (LCK-)</span>
          </div>
        </div>

        {/* Rejected */}
        <div className="ap-stat-card" onClick={() => setStatusFilter('rejected')} style={{ cursor: 'pointer', border: statusFilter === 'rejected' ? '2px solid #ef4444' : 'none' }}>
          <div className="ap-stat-top">
            <span className="ap-stat-label">Rejected / Waitlisted</span>
            <div className="ap-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
          </div>
          <div className="ap-stat-val" style={{ color: '#f87171' }}>{rejectedCount}</div>
          <div className="ap-stat-footer">
            <span style={{ color: '#94a3b8' }}>Unsuccessful applicants</span>
          </div>
        </div>
      </div>

      {/* 2. Main Board Card with Filters & Table */}
      <div className="ap-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={20} color="#d8b257" />
              <span>Student Admission Applications ({filteredApps.length})</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Official admissions workflow. Approving an applicant issues a formal sequential admission number (e.g. LCK-00001) and provisions a student profile.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onRefresh} className="ap-btn-secondary" title="Sync application records">
              <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', backgroundColor: '#0b1220', padding: '14px 18px', borderRadius: '14px', marginBottom: '20px' }}>
          
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'pending', label: `Pending (${pendingCount})`, color: '#f59e0b' },
              { id: 'approved', label: `Approved (${approvedCount})`, color: '#10b981' },
              { id: 'rejected', label: `Rejected (${rejectedCount})`, color: '#ef4444' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                style={{
                  backgroundColor: statusFilter === pill.id ? (pill.color || '#c59b27') : '#131f37',
                  color: statusFilter === pill.id ? '#080e1a' : '#cbd5e1',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Level Filter & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              style={{ backgroundColor: '#131f37', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
            >
              <option value="all">All Levels</option>
              <option value="O">O-Level (S1 - S4)</option>
              <option value="A">A-Level (S5 - S6)</option>
            </select>

            <div className="ap-search-box" style={{ width: '260px' }}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search applicant or district..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ap-search-input"
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* 3. Applications Table */}
        {filteredApps.length === 0 ? (
          <div className="ap-empty-state">
            <UserCheck size={36} color="#d8b257" />
            <p>No student applications match the selected criteria.</p>
          </div>
        ) : (
          <div className="ap-table-wrapper">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Tracking Ref</th>
                  <th>Applicant Name</th>
                  <th>Class / Level</th>
                  <th>District / Residence</th>
                  <th>Parent / Guardian</th>
                  <th>Combination / Subjects</th>
                  <th>Status</th>
                  <th>Official Admission No</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => {
                  const primaryParent = (app.parent_details && app.parent_details[0]) || {};
                  return (
                    <tr key={app._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d8b257' }}>
                        {app.reference_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#fff' }}>
                          {app.first_name} {app.last_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                          {app.gender === 'M' ? 'Male' : 'Female'} &bull; Prev: {app.former_school}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                          {app.ple_pass_slip && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#34d399', fontSize: '10.5px', backgroundColor: 'rgba(52, 211, 153, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                              <FileText size={10} /> PLE Slip
                            </span>
                          )}
                          {app.recommendation_letter && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#60a5fa', fontSize: '10.5px', backgroundColor: 'rgba(96, 165, 250, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                              <FileText size={10} /> Recom. Letter
                            </span>
                          )}
                          {app.uce_pass_slip && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#c084fc', fontSize: '10.5px', backgroundColor: 'rgba(192, 132, 252, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                              <FileText size={10} /> UCE Slip
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="ap-badge" style={{ backgroundColor: '#131f37', color: '#fff' }}>
                          {app.class_applying} ({app.level}-Level)
                        </span>
                      </td>
                      <td>
                        <div style={{ color: '#e2e8f0', fontSize: '13px' }}>{app.district}</div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{app.place_of_residence}</div>
                      </td>
                      <td>
                        <div style={{ color: '#fff', fontSize: '13px' }}>
                          {primaryParent.parent_first_name} {primaryParent.parent_last_name} ({primaryParent.relation})
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#d8b257' }}>
                          {primaryParent.contact_number}
                        </div>
                      </td>
                      <td>
                        {app.level === 'A' ? (
                          <span style={{ color: '#d8b257', fontWeight: 700, fontSize: '12.5px' }}>
                            {app.combination_name || 'A-Level Comb'}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                            {app.selected_subjects?.length || 7} CBC Subjects
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          backgroundColor: app.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : app.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: app.status === 'approved' ? '#34d399' : app.status === 'rejected' ? '#f87171' : '#fbbf24',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {app.status === 'approved' && <CheckCircle size={12} />}
                          {app.status === 'pending' && <Clock size={12} />}
                          {app.status === 'rejected' && <AlertTriangle size={12} />}
                          <span>{app.status}</span>
                        </span>
                      </td>
                      <td>
                        {app.admission_number ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#34d399', fontSize: '13.5px' }}>
                            {app.admission_number}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>Pending Approval</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {/* Review Dossier Button */}
                          <button
                            onClick={() => handleOpenReview(app)}
                            className="ap-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title="Review full application dossier"
                          >
                            <Eye size={13} />
                            <span>Review</span>
                          </button>

                          {/* Quick Approve Button (if pending) */}
                          {app.status === 'pending' && (
                            <button
                              onClick={() => onApprove(app._id)}
                              disabled={actionLoading}
                              className="ap-btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#10b981', color: '#080e1a' }}
                              title="Approve and issue LCK- admission number"
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Quick Reject Button (if pending) */}
                          {app.status === 'pending' && (
                            <button
                              onClick={() => setRejectingAppId(app._id)}
                              className="ap-btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '12px', color: '#f87171' }}
                              title="Reject application"
                            >
                              <X size={13} />
                            </button>
                          )}

                          {/* Print Letter Button (if approved) */}
                          {app.status === 'approved' && (
                            <button
                              onClick={() => handleOpenLetter(app)}
                              className="ap-btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', color: '#d8b257' }}
                              title="View official admission letter"
                            >
                              <FileText size={13} />
                              <span>Letter</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. REVIEW APPLICATION MODAL DOSSIER ─────────────────────── */}
      {showReviewModal && selectedApp && (
        <div className="ap-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="ap-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCheck size={20} color="#d8b257" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Application Dossier &bull; {selectedApp.first_name} {selectedApp.last_name}
                </h3>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="ap-btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px 28px', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Header Status Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#080e1a', padding: '16px 20px', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Tracking Reference Number</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#d8b257', fontFamily: 'monospace' }}>
                    {selectedApp.reference_number}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Official Admission Number</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: selectedApp.admission_number ? '#34d399' : '#fbbf24', fontFamily: 'monospace' }}>
                    {selectedApp.admission_number || 'Awaiting Approval (LCK-)'}
                  </div>
                </div>
              </div>

              {/* Personal Biodata */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#d8b257', marginBottom: '12px' }}>1. Student Biodata</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', backgroundColor: '#0b1220', padding: '16px', borderRadius: '12px', fontSize: '13.5px' }}>
                  <div><strong>Full Name:</strong> <span style={{ color: '#fff' }}>{selectedApp.first_name} {selectedApp.last_name}</span></div>
                  <div><strong>Gender:</strong> <span style={{ color: '#fff' }}>{selectedApp.gender === 'M' ? 'Male' : 'Female'}</span></div>
                  <div><strong>Date of Birth:</strong> <span style={{ color: '#fff' }}>{new Date(selectedApp.date_of_birth).toLocaleDateString('en-GB')}</span></div>
                  <div><strong>Former School:</strong> <span style={{ color: '#fff' }}>{selectedApp.former_school}</span></div>
                </div>
              </div>

              {/* Academic Track */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#d8b257', marginBottom: '12px' }}>2. Academic Placement &amp; Subject Combinations</h4>
                <div style={{ backgroundColor: '#0b1220', padding: '16px', borderRadius: '12px', fontSize: '13.5px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Level &amp; Class Applying:</strong> <span style={{ color: '#fff', fontWeight: 700 }}>{selectedApp.class_applying} ({selectedApp.level}-Level)</span>
                  </div>
                  {selectedApp.level === 'A' ? (
                    <div>
                      <strong>A-Level Subject Combination:</strong> <span style={{ color: '#d8b257', fontWeight: 800 }}>{selectedApp.combination_name || 'PCM / ICT'}</span>
                    </div>
                  ) : (
                    <div>
                      <strong>O-Level Subjects Selected:</strong>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {(selectedApp.selected_subjects || ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History']).map(s => (
                          <span key={s} style={{ backgroundColor: '#131f37', color: '#cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Geographic Origin */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#d8b257', marginBottom: '12px' }}>3. Origin, District &amp; Residence</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', backgroundColor: '#0b1220', padding: '16px', borderRadius: '12px', fontSize: '13.5px' }}>
                  <div><strong>Place of Residence:</strong> <span style={{ color: '#fff' }}>{selectedApp.place_of_residence}</span></div>
                  <div><strong>Place of Origin:</strong> <span style={{ color: '#fff' }}>{selectedApp.place_of_origin}</span></div>
                  <div><strong>District:</strong> <span style={{ color: '#fff' }}>{selectedApp.district}</span></div>
                  <div><strong>County:</strong> <span style={{ color: '#fff' }}>{selectedApp.county}</span></div>
                  <div><strong>Sub-County:</strong> <span style={{ color: '#fff' }}>{selectedApp.sub_county}</span></div>
                  <div><strong>Village / LC1:</strong> <span style={{ color: '#fff' }}>{selectedApp.village}</span></div>
                </div>
              </div>

              {/* Health and Chronic Diseases */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#d8b257', marginBottom: '12px' }}>4. Medical &amp; Special Health Conditions</h4>
                <div style={{ backgroundColor: '#0b1220', padding: '14px 16px', borderRadius: '12px', fontSize: '13.5px' }}>
                  <strong>Chronic Disease / Allergies:</strong> <span style={{ color: selectedApp.chronic_disease && selectedApp.chronic_disease !== 'None' ? '#f87171' : '#34d399', fontWeight: 700 }}>{selectedApp.chronic_disease || 'None'}</span>
                </div>
              </div>

              {/* Parent Details */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#d8b257', marginBottom: '12px' }}>5. Parent / Guardian Records</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(selectedApp.parent_details || []).map((p, idx) => (
                    <div key={idx} style={{ backgroundColor: '#0b1220', padding: '16px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13.5px' }}>
                      <div><strong>Guardian Name:</strong> <span style={{ color: '#fff' }}>{p.parent_first_name} {p.parent_last_name}</span></div>
                      <div><strong>Relation:</strong> <span style={{ color: '#d8b257', fontWeight: 700 }}>{p.relation}</span></div>
                      <div><strong>Contact Phone:</strong> <span style={{ color: '#fff', fontFamily: 'monospace' }}>{p.contact_number}</span></div>
                      <div><strong>Occupation:</strong> <span style={{ color: '#cbd5e1' }}>{p.occupation || 'N/A'}</span></div>
                      <div><strong>Email:</strong> <span style={{ color: '#cbd5e1' }}>{p.email || 'N/A'}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Uploaded Academic Documents */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#d8b257', marginBottom: '12px' }}>
                  6. Uploaded Academic Credentials (PDFs)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  
                  {/* PLE Pass Slip */}
                  <div style={{ backgroundColor: '#0b1220', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        UNEB PLE Pass Slip
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                        Primary Leaving Exam
                      </div>
                    </div>
                    {selectedApp.ple_pass_slip ? (
                      <a 
                        href={selectedApp.ple_pass_slip} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ap-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#d8b257', textDecoration: 'none', padding: '8px 12px' }}
                      >
                        <FileText size={14} />
                        <span>View PLE Slip (PDF)</span>
                        <Eye size={12} />
                      </a>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#ef4444' }}>Not Uploaded</span>
                    )}
                  </div>

                  {/* Recommendation Letter (for S.2-S.4) */}
                  {['S2', 'S3', 'S4'].includes(selectedApp.class_applying) && (
                    <div style={{ backgroundColor: '#0b1220', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Former School Letter
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                          Headteacher Recommendation
                        </div>
                      </div>
                      {selectedApp.recommendation_letter ? (
                        <a 
                          href={selectedApp.recommendation_letter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ap-btn-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#d8b257', textDecoration: 'none', padding: '8px 12px' }}
                        >
                          <FileText size={14} />
                          <span>View Letter (PDF)</span>
                          <Eye size={12} />
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#ef4444' }}>Not Uploaded</span>
                      )}
                    </div>
                  )}

                  {/* UCE Pass Slip (for S.5-S.6) */}
                  {['S5', 'S6'].includes(selectedApp.class_applying) && (
                    <div style={{ backgroundColor: '#0b1220', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          UNEB S.4 (UCE) Slip
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                          O-Level Certificate
                        </div>
                      </div>
                      {selectedApp.uce_pass_slip ? (
                        <a 
                          href={selectedApp.uce_pass_slip} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ap-btn-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#d8b257', textDecoration: 'none', padding: '8px 12px' }}
                        >
                          <FileText size={14} />
                          <span>View UCE Slip (PDF)</span>
                          <Eye size={12} />
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#ef4444' }}>Not Uploaded</span>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Decision / Audit Details */}
              {selectedApp.approved_by_name && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '14px 18px', borderRadius: '12px', fontSize: '13px', color: '#34d399' }}>
                  ✓ Approved by <strong>{selectedApp.approved_by_name}</strong> on {new Date(selectedApp.decision_date || selectedApp.updated_at).toLocaleDateString('en-GB')}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="ap-modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {selectedApp.status === 'approved' && (
                  <button onClick={() => { setShowReviewModal(false); setShowLetterModal(true); }} className="ap-btn-secondary" style={{ color: '#d8b257' }}>
                    <Printer size={15} />
                    <span>Print Official Letter</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="ap-btn-secondary" onClick={() => setShowReviewModal(false)}>
                  Close
                </button>

                {selectedApp.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectingAppId(selectedApp._id)}
                      className="ap-btn-secondary"
                      style={{ color: '#f87171' }}
                    >
                      Reject Application
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        onApprove(selectedApp._id);
                        setShowReviewModal(false);
                      }}
                      className="ap-btn-primary"
                      style={{ backgroundColor: '#10b981', color: '#080e1a' }}
                    >
                      <Check size={16} />
                      <span>Approve Admission &amp; Issue LCK- No</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. REJECTION REASON PROMPT MODAL ───────────────────────── */}
      {rejectingAppId && (
        <div className="ap-modal-overlay" onClick={() => setRejectingAppId(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="ap-modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f87171', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                <span>Confirm Application Rejection</span>
              </h3>
              <button onClick={() => setRejectingAppId(null)} className="ap-btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>
                  Please state the formal reason for rejecting this admission application. This will be recorded in the audit trail.
                </p>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Class capacity reached for 2026 intake / Prerequisite subject credits not satisfied..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  style={{ backgroundColor: '#080e1a', border: 'none', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div className="ap-modal-footer">
                <button type="button" className="ap-btn-secondary" onClick={() => setRejectingAppId(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="ap-btn-primary" style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. PRINTABLE ADMISSION LETTER MODAL ────────────────────── */}
      {showLetterModal && selectedApp && (
        <div className="ap-modal-overlay" onClick={() => setShowLetterModal(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', backgroundColor: '#ffffff', color: '#0f172a', padding: '40px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#080e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c59b27' }}>
                  <Award size={32} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Cinzel', fontSize: '22px', fontWeight: 900, margin: 0, color: '#080e1a' }}>NDUGU ACADEMY SECONDARY SCHOOL</h2>
                  <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Diligence &bull; Character &bull; Excellence</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Plot 14-18, Ndugu Hill Road, Wakiso District &bull; UNEB Centre: U3824</div>
                </div>
              </div>
              <button 
                onClick={() => setShowLetterModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', height: 'fit-content' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ backgroundColor: '#f1f5f9', padding: '6px 16px', borderRadius: '9999px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#0f172a', textTransform: 'uppercase' }}>
                Official Letter of Admission
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px' }}>
              <div><strong>Student Name:</strong> {selectedApp.first_name} {selectedApp.last_name}</div>
              <div><strong>Admission No:</strong> <span style={{ color: '#b45309', fontWeight: 800 }}>{selectedApp.admission_number}</span></div>
              <div><strong>Class Admitted:</strong> {selectedApp.class_applying} ({selectedApp.level}-Level)</div>
              <div><strong>Academic Year:</strong> 2026 Intake</div>
            </div>

            <div style={{ fontSize: '14.5px', lineHeight: 1.8, color: '#334155', marginBottom: '30px' }}>
              <p>Dear Parent / Guardian,</p>
              <p>
                Following the review of the applicant's credentials and interview records, the Admissions Board of 
                Ndugu Academy is pleased to offer <strong>{selectedApp.first_name} {selectedApp.last_name}</strong> a place in 
                <strong> {selectedApp.class_applying}</strong> for the 2026 Academic Year.
              </p>
              <p>
                This admission is subject to adherence to the school rules, completion of term clearance, 
                and presentation of the original PLE / UCE result slip upon reporting day on <strong>24th May, 2026</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div>
                <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px', color: '#1e293b' }}>Emmanuel Ssebaggala</div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>Mr. Emmanuel Ssebaggala, M.Ed</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Headteacher &bull; Ndugu Academy</div>
              </div>

              <button 
                onClick={() => window.print()}
                style={{ backgroundColor: '#080e1a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
              >
                <Printer size={16} />
                <span>Print Admission Letter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
