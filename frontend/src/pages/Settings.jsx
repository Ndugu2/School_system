import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  School, Calendar, Users, Bell, Shield, Smartphone,
  Save, Edit3, CheckCircle, Plus, Trash2, Key, Globe, 
  BookOpen, Clock, AlertTriangle
} from 'lucide-react';

const TABS = [
  { id: 'school', label: 'School Profile', icon: School },
  { id: 'academic', label: 'Academic Calendar', icon: Calendar },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'notifications', label: 'Notifications & SMS', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('school');
  const [saved, setSaved] = useState(false);

  // School Profile state
  const [schoolProfile, setSchoolProfile] = useState({
    name: 'Ndugu Academy',
    motto: 'Nurturing Excellence, Building Tomorrow',
    address: 'Plot 14, Ntinda Road, Kampala, Uganda',
    phone: '+256 700 123 456',
    email: 'info@nduguacademy.ac.ug',
    website: 'www.nduguacademy.ac.ug',
    headteacher: 'Mr. Ssekiboobi James',
    founded: '1998',
    type: 'Mixed Day & Boarding',
    ura_tin: 'URA/SCH/2024/00142',
  });

  // Academic Calendar state
  const [terms, setTerms] = useState([
    { id: 1, name: 'Term I', start: '2026-02-03', end: '2026-04-11', status: 'completed' },
    { id: 2, name: 'Term II', start: '2026-05-12', end: '2026-08-08', status: 'active' },
    { id: 3, name: 'Term III', start: '2026-09-15', end: '2026-11-28', status: 'upcoming' },
  ]);
  const [currentYear, setCurrentYear] = useState('2026');

  // Users state
  const [users, setUsers] = useState([
    { id: 1, name: 'Ssekiboobi James', email: 'headteacher@ndugu.ac.ug', role: 'super-admin', status: 'active' },
    { id: 2, name: 'Nakato Sarah', email: 'nakato.s@ndugu.ac.ug', role: 'admin', status: 'active' },
    { id: 3, name: 'Tumwine Peter', email: 'tumwine.p@ndugu.ac.ug', role: 'teacher', status: 'active' },
    { id: 4, name: 'Nalumansi Grace', email: 'nalumansi.g@ndugu.ac.ug', role: 'teacher', status: 'active' },
    { id: 5, name: 'Kato Moses', email: 'kato.m@ndugu.ac.ug', role: 'teacher', status: 'inactive' },
  ]);

  // Notifications state
  const [notifConfig, setNotifConfig] = useState({
    smsAttendance: true,
    smsFees: true,
    smsExamResults: false,
    smsEvents: false,
    emailReports: true,
    emailAlerts: true,
    atApiKey: '',
    atUsername: 'sandbox',
    atSenderId: 'NduguAcad',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const roleColors = {
    'super-admin': { bg: '#ede9fe', color: '#5b21b6' },
    admin: { bg: '#dbeafe', color: '#1d4ed8' },
    teacher: { bg: '#d1fae5', color: '#065f46' },
    student: { bg: '#fef3c7', color: '#92400e' },
    parent: { bg: '#fce7f3', color: '#9d174d' },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>System Settings</h1>
          <p style={styles.pageSubtitle}>Manage your school's configuration, academic calendar, and user accounts</p>
        </div>
        <button onClick={handleSave} style={styles.saveBtn}>
          {saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {/* Saved Toast */}
      {saved && (
        <div style={styles.toast}>
          <CheckCircle size={18} color="#10b981" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <div style={styles.layout}>
        {/* Sidebar Tabs */}
        <aside style={styles.tabSidebar}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // Only super-admin can see Security
            if (tab.id === 'security' && user?.role !== 'super-admin') return null;
            return (
              <button
                key={tab.id}
                style={{ ...styles.tabBtn, ...(isActive ? styles.tabBtnActive : {}) }}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Panel Content */}
        <div style={styles.panelContent}>

          {/* === SCHOOL PROFILE === */}
          {activeTab === 'school' && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <School size={20} color="#6366f1" />
                <h2 style={styles.panelTitle}>School Profile</h2>
              </div>
              <div style={styles.formGrid}>
                {[
                  { label: 'School Name', key: 'name' },
                  { label: 'Motto', key: 'motto' },
                  { label: 'Physical Address', key: 'address' },
                  { label: 'Phone Number', key: 'phone' },
                  { label: 'Email Address', key: 'email' },
                  { label: 'Website', key: 'website' },
                  { label: 'Head Teacher', key: 'headteacher' },
                  { label: 'Year Founded', key: 'founded' },
                  { label: 'School Type', key: 'type' },
                  { label: 'URA TIN / Registration No.', key: 'ura_tin' },
                ].map(field => (
                  <div key={field.key} style={styles.formGroup}>
                    <label style={styles.formLabel}>{field.label}</label>
                    <input
                      style={styles.formInput}
                      value={schoolProfile[field.key]}
                      onChange={e => setSchoolProfile({ ...schoolProfile, [field.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === ACADEMIC CALENDAR === */}
          {activeTab === 'academic' && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <Calendar size={20} color="#10b981" />
                <h2 style={styles.panelTitle}>Academic Calendar</h2>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Current Academic Year</label>
                <select
                  style={styles.formInput}
                  value={currentYear}
                  onChange={e => setCurrentYear(e.target.value)}
                >
                  {['2024', '2025', '2026', '2027'].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {terms.map((term, i) => (
                  <div key={term.id} style={styles.termCard}>
                    <div style={styles.termCardLeft}>
                      <div style={styles.termName}>
                        <BookOpen size={16} color="#6366f1" />
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{term.name}</span>
                        <span style={{
                          padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          backgroundColor: term.status === 'active' ? '#d1fae5' : term.status === 'completed' ? '#e0e7ff' : '#fef3c7',
                          color: term.status === 'active' ? '#065f46' : term.status === 'completed' ? '#3730a3' : '#92400e',
                        }}>
                          {term.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Start Date</label>
                          <input
                            type="date" style={styles.formInput}
                            value={term.start}
                            onChange={e => {
                              const updated = [...terms];
                              updated[i] = { ...term, start: e.target.value };
                              setTerms(updated);
                            }}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>End Date</label>
                          <input
                            type="date" style={styles.formInput}
                            value={term.end}
                            onChange={e => {
                              const updated = [...terms];
                              updated[i] = { ...term, end: e.target.value };
                              setTerms(updated);
                            }}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Status</label>
                          <select
                            style={styles.formInput}
                            value={term.status}
                            onChange={e => {
                              const updated = [...terms];
                              updated[i] = { ...term, status: e.target.value };
                              setTerms(updated);
                            }}
                          >
                            <option value="upcoming">Upcoming</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} />
                Academic year runs from February to December
              </div>
            </div>
          )}

          {/* === USER MANAGEMENT === */}
          {activeTab === 'users' && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <Users size={20} color="#8b5cf6" />
                <h2 style={styles.panelTitle}>System Users</h2>
                <button style={{ ...styles.saveBtn, marginLeft: 'auto', padding: '7px 14px', fontSize: 13 }}>
                  <Plus size={14} /> Add User
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email / Username</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => {
                      const rc = roleColors[u.role] || { bg: '#f3f4f6', color: '#374151' };
                      return (
                        <tr key={u.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={{ ...styles.td, fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                backgroundColor: '#6366f1', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700, flexShrink: 0,
                              }}>
                                {u.name.charAt(0)}
                              </div>
                              {u.name}
                            </div>
                          </td>
                          <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>{u.email}</td>
                          <td style={styles.td}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, backgroundColor: rc.bg, color: rc.color }}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                              backgroundColor: u.status === 'active' ? '#d1fae5' : '#fee2e2',
                              color: u.status === 'active' ? '#065f46' : '#991b1b',
                            }}>
                              {u.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button style={styles.actionBtn} title="Edit">
                                <Edit3 size={14} />
                              </button>
                              <button style={styles.actionBtn} title="Reset Password">
                                <Key size={14} />
                              </button>
                              {u.id !== 1 && (
                                <button style={{ ...styles.actionBtn, color: '#ef4444' }} title="Remove">
                                  <Trash2 size={14} />
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
            </div>
          )}

          {/* === NOTIFICATIONS & SMS === */}
          {activeTab === 'notifications' && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <Bell size={20} color="#f59e0b" />
                <h2 style={styles.panelTitle}>Notifications &amp; SMS Configuration</h2>
              </div>

              <div style={{ marginBottom: 28 }}>
                <h3 style={styles.sectionLabel}>SMS Alerts — Africa's Talking API</h3>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>API Key</label>
                    <input
                      type="password"
                      style={styles.formInput}
                      placeholder="Enter your AT API Key"
                      value={notifConfig.atApiKey}
                      onChange={e => setNotifConfig({ ...notifConfig, atApiKey: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Username</label>
                    <input
                      style={styles.formInput}
                      value={notifConfig.atUsername}
                      onChange={e => setNotifConfig({ ...notifConfig, atUsername: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Sender ID (shortcode/name)</label>
                    <input
                      style={styles.formInput}
                      value={notifConfig.atSenderId}
                      onChange={e => setNotifConfig({ ...notifConfig, atSenderId: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} color="#f59e0b" />
                  Leave Username as "sandbox" for testing. Requires a live account for production SMS delivery.
                </div>
              </div>

              <div>
                <h3 style={styles.sectionLabel}>Alert Triggers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { key: 'smsAttendance', label: 'SMS when student is marked absent', icon: '📵' },
                    { key: 'smsFees', label: 'SMS fee reminders for outstanding balances', icon: '💰' },
                    { key: 'smsExamResults', label: 'SMS when term results are published', icon: '📋' },
                    { key: 'smsEvents', label: 'SMS for upcoming school events', icon: '📅' },
                    { key: 'emailReports', label: 'Email end-of-term reports to parents', icon: '📧' },
                    { key: 'emailAlerts', label: 'Email system alerts to administrators', icon: '⚠️' },
                  ].map(item => (
                    <div key={item.key} style={styles.toggleRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span style={{ fontSize: 15, color: 'var(--text-primary)' }}>{item.label}</span>
                      </div>
                      <label style={styles.toggle}>
                        <input
                          type="checkbox"
                          style={{ display: 'none' }}
                          checked={notifConfig[item.key]}
                          onChange={e => setNotifConfig({ ...notifConfig, [item.key]: e.target.checked })}
                        />
                        <div style={{
                          ...styles.toggleTrack,
                          backgroundColor: notifConfig[item.key] ? '#6366f1' : 'var(--border)',
                        }}>
                          <div style={{
                            ...styles.toggleThumb,
                            transform: notifConfig[item.key] ? 'translateX(24px)' : 'translateX(2px)',
                          }} />
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === SECURITY === */}
          {activeTab === 'security' && user?.role === 'super-admin' && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <Shield size={20} color="#ef4444" />
                <h2 style={styles.panelTitle}>Security Settings</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>JWT Secret Key (server restart required)</label>
                  <input type="password" style={styles.formInput} placeholder="••••••••••••••••" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Session Timeout (minutes)</label>
                  <input type="number" style={styles.formInput} defaultValue="60" />
                </div>
                <div style={styles.toggleRow}>
                  <span style={{ fontSize: 15, color: 'var(--text-primary)' }}>Enforce strong password policy (min. 8 chars, special character)</span>
                  <label style={styles.toggle}>
                    <input type="checkbox" style={{ display: 'none' }} defaultChecked />
                    <div style={{ ...styles.toggleTrack, backgroundColor: '#6366f1' }}>
                      <div style={{ ...styles.toggleThumb, transform: 'translateX(24px)' }} />
                    </div>
                  </label>
                </div>
                <div style={styles.toggleRow}>
                  <span style={{ fontSize: 15, color: 'var(--text-primary)' }}>Allow parents to self-register via portal</span>
                  <label style={styles.toggle}>
                    <input type="checkbox" style={{ display: 'none' }} />
                    <div style={{ ...styles.toggleTrack, backgroundColor: 'var(--border)' }}>
                      <div style={{ ...styles.toggleThumb, transform: 'translateX(2px)' }} />
                    </div>
                  </label>
                </div>
                <div style={styles.toggleRow}>
                  <span style={{ fontSize: 15, color: 'var(--text-primary)' }}>Two-Factor Authentication for Admins</span>
                  <label style={styles.toggle}>
                    <input type="checkbox" style={{ display: 'none' }} />
                    <div style={{ ...styles.toggleTrack, backgroundColor: 'var(--border)' }}>
                      <div style={{ ...styles.toggleThumb, transform: 'translateX(2px)' }} />
                    </div>
                  </label>
                </div>
                <div style={{ padding: '16px 20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 14, color: '#991b1b', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Changes to security settings may require all users to re-authenticate. Ensure you have confirmed access before applying changes.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 24 },
  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: 'var(--text-tertiary)' },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  toast: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 20px', backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7', borderRadius: 10,
    fontSize: 14, fontWeight: 600, color: '#065f46',
    animation: 'fadeIn 0.3s ease',
  },
  layout: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' },
  tabSidebar: {
    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
    boxShadow: 'var(--shadow-sm)',
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', border: 'none', borderRadius: 8,
    backgroundColor: 'transparent', color: 'var(--text-secondary)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
    width: '100%', transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700,
  },
  panelContent: { display: 'flex', flexDirection: 'column', gap: 0 },
  panel: {
    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 28, boxShadow: 'var(--shadow-sm)',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24,
  },
  panelTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  sectionLabel: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  formLabel: { fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formInput: {
    padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
  },
  termCard: {
    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '16px 20px',
  },
  termCardLeft: { display: 'flex', flexDirection: 'column', gap: 0 },
  termName: { display: 'flex', alignItems: 'center', gap: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700,
    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-primary)',
  },
  td: { padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' },
  trEven: { backgroundColor: 'var(--bg-secondary)' },
  trOdd: { backgroundColor: 'var(--bg-primary)' },
  actionBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  toggleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)', borderRadius: 10,
  },
  toggle: { cursor: 'pointer' },
  toggleTrack: {
    width: 48, height: 26, borderRadius: 13, position: 'relative',
    transition: 'background-color 0.3s',
  },
  toggleThumb: {
    position: 'absolute', top: 3, width: 20, height: 20,
    borderRadius: '50%', backgroundColor: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    transition: 'transform 0.3s',
  },
};
