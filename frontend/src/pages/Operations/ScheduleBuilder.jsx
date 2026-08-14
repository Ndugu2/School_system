import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Plus, AlertTriangle, Trash2, X } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const PERIOD_TIMES = { 1:'07:30', 2:'08:30', 3:'09:30', 4:'10:30', 5:'11:30', 6:'13:00', 7:'14:00', 8:'15:00' };
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function ScheduleBuilder() {
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(null); // { day, period }
  const [form, setForm] = useState({ subject: '', room: '', startTime: '', endTime: '', entryType: 'class' });
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/classes'),
      api.get('/subjects'),
      api.get('/operations/rooms'),
    ]).then(([cls, sub, rm]) => {
      setClasses(cls);
      setSubjects(sub);
      setRooms(rm);
      if (cls.length > 0) setSelectedClass(cls[0]._id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    fetchSchedule();
  }, [selectedClass, selectedTerm]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/operations/schedule?classId=${selectedClass}&term=${selectedTerm}`);
      setEntries(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getEntry = (day, period) => {
    const dayNum = DAYS.indexOf(day) + 1;
    return entries.find(e => e.dayOfWeek === dayNum && e.period === period);
  };

  const handleCellClick = (day, period) => {
    const existing = getEntry(day, period);
    if (existing) return; // occupied
    setConflict(null);
    setForm({ subject: subjects[0]?._id || '', room: '', startTime: PERIOD_TIMES[period] || '', endTime: '', entryType: 'class' });
    setShowModal({ day, period });
  };

  const handleSave = async () => {
    if (!form.subject || !showModal) return;
    const dayNum = DAYS.indexOf(showModal.day) + 1;
    setConflict(null);
    try {
      await api.post('/operations/schedule', {
        class: selectedClass,
        classLevel: classes.find(c => c._id === selectedClass)?.level || '',
        subject: form.subject,
        subjectName: subjects.find(s => s._id === form.subject)?.name || '',
        room: form.room || undefined,
        roomName: rooms.find(r => r._id === form.room)?.name || '',
        dayOfWeek: dayNum,
        period: showModal.period,
        startTime: form.startTime,
        endTime: form.endTime,
        entryType: form.entryType,
        term: selectedTerm,
        academicYear: new Date().getFullYear(),
      });
      setShowModal(null);
      fetchSchedule();
    } catch (err) {
      if (err.message.includes('conflict') || err.message.includes('409')) {
        setConflict(err.message);
      } else {
        alert(`❌ ${err.message}`);
      }
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm('Remove this schedule entry?')) return;
    try {
      await api.delete(`/operations/schedule/${entry._id}`);
      fetchSchedule();
    } catch (err) { alert(err.message); }
  };

  const entryTypeColors = { class: '#4f46e5', exam: '#ef4444', club: '#10b981', assembly: '#f59e0b', break: '#94a3b8' };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Schedule Builder</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select style={s.select} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name} ({c.level})</option>)}
          </select>
          <select style={s.select} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={s.hint}>
        <AlertTriangle size={13} color="#f59e0b" />
        Click any empty cell to add a lesson. Conflicts with teacher or room bookings are automatically detected.
      </div>

      {/* Timetable Grid */}
      <div style={s.gridWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.cornerCell}>Period</th>
              {DAYS.map(d => <th key={d} style={s.dayHeader}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(period => (
              <tr key={period}>
                <td style={s.periodCell}>
                  <span style={s.periodNum}>{period}</span>
                  <span style={s.periodTime}>{PERIOD_TIMES[period]}</span>
                </td>
                {DAYS.map(day => {
                  const entry = getEntry(day, period);
                  return (
                    <td
                      key={day}
                      style={{ ...s.cell, ...(entry ? {} : s.emptyCell) }}
                      onClick={() => handleCellClick(day, period)}
                    >
                      {entry ? (
                        <div style={{ ...s.entryCard, borderLeft: `3px solid ${entryTypeColors[entry.entryType] || '#4f46e5'}` }}>
                          <p style={s.entrySubject}>{entry.subjectName}</p>
                          {entry.teacherName && <p style={s.entryTeacher}>{entry.teacherName}</p>}
                          {entry.roomName && <p style={s.entryRoom}>📍 {entry.roomName}</p>}
                          <button
                            style={s.deleteBtn}
                            onClick={e => { e.stopPropagation(); handleDelete(entry); }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ) : (
                        <div style={s.addHint}><Plus size={12} /></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Entry Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHead}>
              <h3 style={s.mTitle}>Add Lesson — {showModal.day}, Period {showModal.period}</h3>
              <button style={s.closeBtn} onClick={() => setShowModal(null)}><X size={18} /></button>
            </div>
            {conflict && (
              <div style={s.conflictAlert}>
                <AlertTriangle size={14} color="#ef4444" /> {conflict}
              </div>
            )}
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Subject *</label>
                <select style={s.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                  {subjects.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Room (optional)</label>
                <select style={s.input} value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}>
                  <option value="">No room assigned</option>
                  {rooms.map(r => <option key={r._id} value={r._id}>{r.name} (cap: {r.capacity})</option>)}
                </select>
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Start Time</label>
                  <input type="time" style={s.input} value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>End Time</label>
                  <input type="time" style={s.input} value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Type</label>
                <select style={s.input} value={form.entryType} onChange={e => setForm({ ...form, entryType: e.target.value })}>
                  {['class', 'exam', 'club', 'assembly', 'break'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <button style={s.primaryBtn} onClick={handleSave}>Save Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' },
  select: { padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 },
  hint: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', fontWeight: 500 },
  gridWrap: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'auto', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  cornerCell: { padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', width: 80, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'center' },
  dayHeader: { padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', minWidth: 130 },
  periodCell: { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' },
  periodNum: { display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--primary)' },
  periodTime: { display: 'block', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 },
  cell: { border: '1px solid var(--border)', padding: 8, verticalAlign: 'top', minHeight: 70, cursor: 'pointer', transition: 'background 0.2s' },
  emptyCell: { backgroundColor: 'transparent' },
  entryCard: { position: 'relative', backgroundColor: 'var(--bg-tertiary)', borderRadius: 6, padding: '8px 10px', minHeight: 60 },
  entrySubject: { fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 },
  entryTeacher: { fontSize: 11, color: 'var(--text-secondary)' },
  entryRoom: { fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 },
  deleteBtn: { position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2, borderRadius: 4, display: 'flex', opacity: 0.6 },
  addHint: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, color: 'var(--border)', opacity: 0.5 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)' },
  mHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  mTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' },
  conflictAlert: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 16, fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 12 },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '10px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: 13, width: '100%' },
  primaryBtn: { backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginTop: 4 },
};
