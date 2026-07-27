import React, { useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, X } from 'lucide-react';

// Mock notifications data
const mockNotifications = [
  { id: 1, type: 'academic', title: 'New Grade Posted', message: 'Your Math grade for Term II 2026 is now available.', read: false },
  { id: 2, type: 'finance', title: 'Invoice Due', message: 'Fee invoice for P7A is due tomorrow.', read: false },
  { id: 3, type: 'event', title: 'School Closure', message: 'Campus will be closed on Friday due to maintenance.', read: true },
  { id: 4, type: 'announcement', title: 'Parent-Teacher Meeting', message: 'Scheduled for 10th July at 3 PM.', read: false },
  { id: 5, type: 'academic', title: 'Assignment Reminder', message: 'Submit your Science project by end of week.', read: true },
];

const typeColors = {
  academic: 'var(--primary)',
  finance: '#f59e0b',
  event: '#ef4444',
  announcement: '#10b981',
};

export default function NotificationsHub() {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(mockNotifications);

  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Notifications Hub</h2>
        <button onClick={markAllRead} style={styles.actionBtn}>Mark all as read</button>
        <button onClick={() => setFilter('all')} style={styles.filterBtn}>All</button>
        {Object.keys(typeColors).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{ ...styles.filterBtn, ...(filter === t ? styles.filterBtnActive : {}) }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div style={styles.list}>
        {filtered.length === 0 ? (
          <p style={styles.empty}>No notifications for this filter.</p>
        ) : (
          filtered.map((n) => (
            <div key={n.id} style={{ ...styles.item, backgroundColor: n.read ? 'var(--bg-primary)' : 'var(--bg-secondary)' }}>
              <div style={{ ...styles.iconWrapper, backgroundColor: typeColors[n.type] }}>
                <Bell size={18} color="#fff" />
              </div>
              <div style={styles.content}>
                <strong>{n.title}</strong>
                <p style={styles.message}>{n.message}</p>
              </div>
              <button onClick={() => toggleRead(n.id)} style={styles.readBtn}>
                {n.read ? <CheckCircle size={14} color="#10b981" /> : <AlertTriangle size={14} color="#f59e0b" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  actionBtn: {
    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
  },
  filterBtn: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
  },
  filterBtnActive: {
    background: 'var(--primary-light)',
    color: 'var(--primary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-secondary)',
  },
  iconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
  },
  content: {
    flex: 1,
  },
  message: {
    margin: 0,
    color: 'var(--text-tertiary)',
    fontSize: '13px',
  },
  readBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  empty: {
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
};
