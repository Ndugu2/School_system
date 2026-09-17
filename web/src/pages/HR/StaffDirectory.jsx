import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, Search, Plus, Edit2, Trash2, GraduationCap, Phone, Mail, Shield, X, Save } from 'lucide-react';

const ROLES = ['Head Teacher', 'Deputy Head Teacher', 'Head of Department', 'Teacher', 'Registrar', 'Finance Manager', 'Librarian', 'Laboratory Technician', 'Counsellor', 'Security', 'Support Staff'];
const DEPTS = ['Sciences', 'Humanities', 'Languages', 'Mathematics', 'Technical', 'Administration', 'Finance', 'N/A'];
const QUALIFICATIONS = ["Certificate", "Diploma", "Bachelor's Degree", "Post Graduate Diploma", "Master's Degree", "PhD"];

const MOCK_STAFF = [
  { _id: '1', name: 'Okello James', role: 'Head Teacher', department: 'Administration', qualification: "Master's Degree", phone: '0772123456', email: 'okello@ndugu.ac.ug', status: 'active', joinDate: '2018-01-15', subjects: [] },
  { _id: '2', name: 'Nakato Sarah', role: 'Teacher', department: 'Sciences', qualification: "Bachelor's Degree", phone: '0752987654', email: 'nakato@ndugu.ac.ug', status: 'active', joinDate: '2020-02-01', subjects: ['Biology', 'Chemistry'] },
  { _id: '3', name: 'Mugisha Peter', role: 'Teacher', department: 'Mathematics', qualification: "Bachelor's Degree", phone: '0701234567', email: 'mugisha@ndugu.ac.ug', status: 'active', joinDate: '2019-08-20', subjects: ['Mathematics', 'Physics'] },
  { _id: '4', name: 'Nakazibwe Grace', role: 'Finance Manager', department: 'Finance', qualification: "Diploma", phone: '0784563210', email: 'nakazibwe@ndugu.ac.ug', status: 'active', joinDate: '2021-03-10', subjects: [] },
  { _id: '5', name: 'Wasswa Robert', role: 'Librarian', department: 'N/A', qualification: "Diploma", phone: '0712098765', email: 'wasswa@ndugu.ac.ug', status: 'active', joinDate: '2022-06-01', subjects: [] },
  { _id: '6', name: 'Amara Christine', role: 'Teacher', department: 'Humanities', qualification: "Bachelor's Degree", phone: '0709876543', email: 'amara@ndugu.ac.ug', status: 'on_leave', joinDate: '2017-04-15', subjects: ['History', 'Geography'] },
];

const emptyForm = { name: '', role: 'Teacher', department: 'Sciences', qualification: "Bachelor's Degree", phone: '', email: '', subjects: '', joinDate: '', status: 'active' };

export default function StaffDirectory() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/hr/staff').then(setStaff).catch(() => setStaff(MOCK_STAFF)).finally(() => setLoading(false));
  }, []);

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
    const matchRole = !filterRole || s.role === filterRole;
    return matchSearch && matchRole;
  });

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (st) => {
    setForm({ ...st, subjects: Array.isArray(st.subjects) ? st.subjects.join(', ') : '' });
    setEditId(st._id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    const payload = { ...form, subjects: form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : [] };
    try {
      if (editId) {
        await api.put(`/hr/staff/${editId}`, payload);
        setStaff(prev => prev.map(s => s._id === editId ? { ...s, ...payload } : s));
      } else {
        const created = await api.post('/hr/staff', payload).catch(() => ({ ...payload, _id: Date.now().toString() }));
        setStaff(prev => [...prev, created]);
      }
    } catch {
      if (!editId) setStaff(prev => [...prev, { ...payload, _id: Date.now().toString() }]);
    }
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    try { await api.delete(`/hr/staff/${id}`); } catch {}
    setStaff(prev => prev.filter(s => s._id !== id));
  };

  const statusColor = { active: '#10b981', on_leave: '#f59e0b', inactive: '#ef4444' };
  const statusLabel = { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' };

  if (loading) return <div style={s.loading}>Loading staff records...</div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.searchBox}>
            <Search size={16} color="var(--text-tertiary)" />
            <input style={s.searchInput} placeholder="Search staff by name, email, or role..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={s.filterSelect} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button style={s.addBtn} onClick={openAdd}>
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Summary Pills */}
      <div style={s.pillsRow}>
        {[
          { label: 'Total Staff', count: staff.length, color: '#4f46e5' },
          { label: 'Active', count: staff.filter(x => x.status === 'active').length, color: '#10b981' },
          { label: 'On Leave', count: staff.filter(x => x.status === 'on_leave').length, color: '#f59e0b' },
          { label: 'Teaching', count: staff.filter(x => x.subjects?.length > 0).length, color: '#8b5cf6' },
        ].map(p => (
          <div key={p.label} style={{ ...s.pill, borderLeft: `4px solid ${p.color}` }}>
            <span style={{ ...s.pillCount, color: p.color }}>{p.count}</span>
            <span style={s.pillLabel}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Staff Grid */}
      {filtered.length === 0 ? (
        <div style={s.empty}><Users size={40} color="var(--text-tertiary)" /><p>No staff records found.</p></div>
      ) : (
        <div style={s.grid}>
          {filtered.map(st => (
            <div key={st._id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.avatar}>{st.name.charAt(0).toUpperCase()}</div>
                <div style={s.cardInfo}>
                  <h3 style={s.cardName}>{st.name}</h3>
                  <div style={{ ...s.roleBadge, backgroundColor: '#e0e7ff', color: '#4338ca' }}>{st.role}</div>
                </div>
                <span style={{ ...s.statusDot, backgroundColor: statusColor[st.status] || '#6b7280' }} title={statusLabel[st.status]} />
              </div>
              <div style={s.cardBody}>
                <p style={s.cardDetail}><GraduationCap size={13} color="var(--text-tertiary)" /> {st.qualification} · {st.department}</p>
                <p style={s.cardDetail}><Phone size={13} color="var(--text-tertiary)" /> {st.phone || '—'}</p>
                <p style={s.cardDetail}><Mail size={13} color="var(--text-tertiary)" /> {st.email}</p>
                {st.subjects?.length > 0 && (
                  <div style={s.subjectsRow}>{st.subjects.map(sub => <span key={sub} style={s.subjectChip}>{sub}</span>)}</div>
                )}
              </div>
              <div style={s.cardActions}>
                <button style={s.editBtn} onClick={() => openEdit(st)}><Edit2 size={14} /> Edit</button>
                <button style={s.deleteBtn} onClick={() => handleDelete(st._id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{editId ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.label}>Full Name *</label>
                  <input style={s.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Okello James" />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Email *</label>
                  <input style={s.input} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="e.g. okello@ndugu.ac.ug" />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Role</label>
                  <select style={s.input} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Department</label>
                  <select style={s.input} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                    {DEPTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Qualification</label>
                  <select style={s.input} value={form.qualification} onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))}>
                    {QUALIFICATIONS.map(q => <option key={q}>{q}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Phone</label>
                  <input style={s.input} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 0772123456" />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Subjects Taught (comma-separated)</label>
                  <input style={s.input} value={form.subjects} onChange={e => setForm(p => ({ ...p, subjects: e.target.value }))} placeholder="e.g. Biology, Chemistry" />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Date Joined</label>
                  <input style={s.input} type="date" value={form.joinDate} onChange={e => setForm(p => ({ ...p, joinDate: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Status</label>
                  <select style={s.input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                <Save size={15} />{saving ? 'Saving...' : editId ? 'Save Changes' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 220 },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', flex: 1 },
  filterSelect: { border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  pillsRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  pill: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2, boxShadow: 'var(--shadow-sm)', minWidth: 110 },
  pillCount: { fontSize: 24, fontWeight: 800, lineHeight: 1 },
  pillLabel: { fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 },
  card: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 14, position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardName: { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  roleBadge: { display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, letterSpacing: '0.3px' },
  statusDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, position: 'absolute', top: 0, right: 0 },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 6 },
  cardDetail: { margin: 0, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 },
  subjectsRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  subjectChip: { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: 11, borderRadius: 6, padding: '2px 8px', color: 'var(--text-secondary)', fontWeight: 600 },
  cardActions: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 },
  editBtn: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  deleteBtn: { border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  empty: { textAlign: 'center', padding: 60, color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' },
  modalBody: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-primary)', fontSize: 14, color: 'var(--text-primary)', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--border)' },
  cancelBtn: { border: '1px solid var(--border)', borderRadius: 8, padding: '9px 20px', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14 },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 8, padding: '9px 20px', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
};
