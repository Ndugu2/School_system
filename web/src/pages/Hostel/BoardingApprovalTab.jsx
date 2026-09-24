import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Home,
  ShieldCheck,
  User,
  AlertTriangle
} from 'lucide-react';

export default function BoardingApprovalTab() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (classFilter) params.append('classLevel', classFilter);
      if (search.trim()) params.append('search', search.trim());

      const data = await api.get(`/hostel/boarding-approvals?${params.toString()}`);
      setApprovals(data || []);
    } catch (err) {
      console.error('Error fetching boarding approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [filterStatus, classFilter]);

  const handleToggleApproval = async (studentId, currentApproved) => {
    setActionLoading(studentId);
    try {
      const nextApproved = !currentApproved;
      await api.post(`/hostel/boarding-approvals/${studentId}`, {
        approved: nextApproved,
        notes: nextApproved ? 'Boarding clearance verified by Warden' : 'Clearance revoked by Warden'
      });
      setMessage({
        text: `Student boarding status marked as ${nextApproved ? 'APPROVED' : 'PENDING'}`,
        type: 'success'
      });
      fetchApprovals();
    } catch (err) {
      setMessage({
        text: err.response?.data?.error?.message || err.message || 'Failed to update boarding approval',
        type: 'error'
      });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  return (
    <div style={s.container}>
      {/* Alert Notification */}
      {message && (
        <div style={{ ...s.alert, backgroundColor: message.type === 'error' ? '#2a1616' : '#092318', color: message.type === 'error' ? '#fca5a5' : '#34d399' }}>
          {message.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Action Header & Filters */}
      <div style={s.filterBar}>
        <div style={s.searchBox}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search student name, ID or admission #..."
            value={search}
            onChange={(e) => setSearch}
            onKeyDown={(e) => e.key === 'Enter' && fetchApprovals()}
            style={s.searchInput}
          />
          {search && (
            <button onClick={() => { setSearch(''); fetchApprovals(); }} style={s.clearBtn}>
              &times;
            </button>
          )}
        </div>

        <div style={s.filterGroup}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={s.select}>
            <option value="all">All Clearances</option>
            <option value="approved">Approved Boarders</option>
            <option value="pending">Pending Approval</option>
          </select>

          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={s.select}>
            <option value="">All Classes</option>
            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>

          <button onClick={fetchApprovals} style={s.refreshBtn} title="Reload records">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Boarding Approvals Table */}
      <div style={s.tableCard}>
        {loading ? (
          <div style={s.loadingState}>
            <div className="animate-spin" style={s.spinner} />
            <p>Loading residential boarding roster...</p>
          </div>
        ) : approvals.length === 0 ? (
          <div style={s.emptyState}>
            <ShieldCheck size={36} color="#c59b27" />
            <p style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>No boarding approval records match criteria</p>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Try clearing filters or enrolling students into the residential registry.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Student ID</th>
                  <th style={s.th}>Student Name</th>
                  <th style={s.th}>Class / Level</th>
                  <th style={s.th}>Dormitory &amp; Room</th>
                  <th style={s.th}>Warden Status</th>
                  <th style={s.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((st) => (
                  <tr key={st._id} style={s.tr}>
                    <td style={{ ...s.td, fontFamily: 'monospace', color: '#d8b257', fontWeight: 700 }}>
                      {st.admissionNumber || st.studentId}
                    </td>
                    <td style={{ ...s.td, color: '#fff', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={s.studentAvatar}>{st.name?.charAt(0) || 'S'}</div>
                        <div>
                          <div>{st.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{st.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={s.classBadge}>{st.classLevel}</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0' }}>
                        <Home size={14} color="#d8b257" />
                        <span>{st.dormitory}</span>
                        {st.room !== '—' && (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            (Rm {st.room} • Bed {st.bedNumber})
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={s.td}>
                      {st.boardingApproval ? (
                        <span style={s.badgeApproved}>
                          <CheckCircle size={12} /> Approved
                        </span>
                      ) : (
                        <span style={s.badgePending}>
                          <XCircle size={12} /> Pending Approval
                        </span>
                      )}
                    </td>
                    <td style={s.td}>
                      <button
                        onClick={() => handleToggleApproval(st._id, st.boardingApproval)}
                        disabled={actionLoading === st._id}
                        style={{
                          ...s.actionBtn,
                          backgroundColor: st.boardingApproval ? '#2a1616' : '#c59b27',
                          color: st.boardingApproval ? '#fca5a5' : '#080e1a'
                        }}
                      >
                        {actionLoading === st._id
                          ? 'Updating...'
                          : st.boardingApproval
                          ? 'Revoke Clearance'
                          : 'Approve Boarding'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 18 },
  alert: {
    padding: '12px 18px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontWeight: 700,
    fontSize: 13
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1527',
    padding: '9px 14px',
    borderRadius: 10,
    flex: '1 1 280px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    outline: 'none',
    fontSize: 13.5,
    width: '100%'
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 16
  },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 10 },
  select: {
    backgroundColor: '#0d1527',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '9px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer'
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 15px',
    backgroundColor: '#131f37',
    color: '#d8b257',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  },
  tableCard: {
    backgroundColor: '#0d1527',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: {
    padding: '14px 18px',
    fontSize: 11.5,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#64748b',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(8, 14, 26, 0.4)'
  },
  td: {
    padding: '14px 18px',
    fontSize: 13.5,
    color: '#cbd5e1',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
  },
  tr: {
    transition: 'background-color 0.15s ease'
  },
  studentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    color: '#d8b257',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 12
  },
  classBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#080e1a',
    color: '#38bdf8',
    fontWeight: 700,
    fontSize: 12
  },
  badgeApproved: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 9999,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    color: '#34d399',
    fontSize: 11.5,
    fontWeight: 700
  },
  badgePending: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 9999,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#f87171',
    fontSize: 11.5,
    fontWeight: 700
  },
  actionBtn: {
    padding: '7px 12px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loadingState: {
    padding: 60,
    textAlign: 'center',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid #c59b27'
  },
  emptyState: {
    padding: 60,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10
  }
};
