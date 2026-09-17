import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Home, Users, Bed, Plus, Search, Filter, CheckCircle2, UserCheck, X } from 'lucide-react';

const MOCK_ROOMS = [
  { _id: '1', dormName: 'Lumumba Hall', gender: 'Male', roomNo: 'Room 01', capacity: 8, occupied: 7, boarders: ['Mukasa Ronald', 'Kato Dennis', 'Ssemwogerere Paul', 'Kimbugwe Brian', 'Mutebi Isaac', 'Opio Daniel', 'Lule Patrick'], status: 'available' },
  { _id: '2', dormName: 'Lumumba Hall', gender: 'Male', roomNo: 'Room 02', capacity: 8, occupied: 8, boarders: ['Okello Denis', 'Bwambale Eric', 'Akram Juma', 'Tusiime David', 'Alinda Joseph', 'Mwesigwa Simon', 'Kayanja Fred', 'Byaruhanga Timothy'], status: 'full' },
  { _id: '3', dormName: 'Mary Stuart Hall', gender: 'Female', roomNo: 'Room 01', capacity: 6, occupied: 5, boarders: ['Kembabazi Joy', 'Atuhaire Diana', 'Akello Sarah', 'Nanteza Hope', 'Namubiru Esther'], status: 'available' },
  { _id: '4', dormName: 'Mary Stuart Hall', gender: 'Female', roomNo: 'Room 02', capacity: 6, occupied: 6, boarders: ['Auma Brenda', 'Nassanga Florence', 'Nabukeera Winnie', 'Namutebi Grace', 'Birungi Christine', 'Kemigisha Faith'], status: 'full' },
  { _id: '5', dormName: 'Kabalega Hall', gender: 'Male', roomNo: 'Room 01', capacity: 10, occupied: 4, boarders: ['Rubangakene Sam', 'Wamala George', 'Waiswa Peter', 'Baluku Ronald'], status: 'available' }
];

export default function RoomAssignment() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dormFilter, setDormFilter] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    api.get('/hostel/rooms').then(data => setRooms(data?.length ? data : MOCK_ROOMS)).catch(() => setRooms(MOCK_ROOMS)).finally(() => setLoading(false));
  }, []);

  const openAssign = (room) => {
    setSelectedRoom(room);
    setStudentName('');
    setShowAssignModal(true);
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!studentName.trim() || !selectedRoom) return;
    setRooms(prev => prev.map(r => {
      if (r._id === selectedRoom._id) {
        const nextOccupied = r.occupied + 1;
        return {
          ...r,
          occupied: nextOccupied,
          boarders: [...r.boarders, studentName.trim()],
          status: nextOccupied >= r.capacity ? 'full' : 'available'
        };
      }
      return r;
    }));
    setShowAssignModal(false);
  };

  const filtered = rooms.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.roomNo.toLowerCase().includes(q) || r.dormName.toLowerCase().includes(q) || r.boarders.some(b => b.toLowerCase().includes(q));
    const matchDorm = dormFilter === 'all' || r.dormName === dormFilter;
    return matchQ && matchDorm;
  });

  if (loading) return <div style={s.loading}>Loading dormitory room registry...</div>;

  return (
    <div style={s.container}>
      {/* Controls */}
      <div style={s.header}>
        <div style={s.filters}>
          <div style={s.searchBox}>
            <Search size={16} color="var(--text-tertiary)" />
            <input style={s.searchInput} placeholder="Search room number, dorm, or student..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={s.select} value={dormFilter} onChange={e => setDormFilter(e.target.value)}>
            <option value="all">All Dormitories</option>
            <option value="Lumumba Hall">Lumumba Hall (Male)</option>
            <option value="Mary Stuart Hall">Mary Stuart Hall (Female)</option>
            <option value="Kabalega Hall">Kabalega Hall (Male)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiRow}>
        <div style={s.kpiCard}>
          <span style={s.kpiVal}>{rooms.length}</span>
          <span style={s.kpiLbl}>Total Rooms</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#4f46e5' }}>{rooms.reduce((a, r) => a + r.capacity, 0)}</span>
          <span style={s.kpiLbl}>Bed Space Capacity</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#10b981' }}>{rooms.reduce((a, r) => a + r.occupied, 0)}</span>
          <span style={s.kpiLbl}>Current Boarders</span>
        </div>
        <div style={s.kpiCard}>
          <span style={{ ...s.kpiVal, color: '#f59e0b' }}>
            {rooms.reduce((a, r) => a + (r.capacity - r.occupied), 0)}
          </span>
          <span style={s.kpiLbl}>Available Beds</span>
        </div>
      </div>

      {/* Rooms Grid */}
      <div style={s.grid}>
        {filtered.map(r => (
          <div key={r._id} style={s.card}>
            <div style={s.cardHead}>
              <div>
                <h3 style={s.roomNo}>{r.roomNo}</h3>
                <span style={s.dormName}>{r.dormName} ({r.gender})</span>
              </div>
              <span style={{ ...s.badge, backgroundColor: r.status === 'full' ? '#fee2e2' : '#dcfce7', color: r.status === 'full' ? '#b91c1c' : '#15803d' }}>
                {r.status === 'full' ? 'Fully Booked' : `${r.capacity - r.occupied} Beds Free`}
              </span>
            </div>

            {/* Occupancy bar */}
            <div style={s.barWrap}>
              <div style={{ ...s.barFill, width: `${(r.occupied / r.capacity) * 100}%`, backgroundColor: r.status === 'full' ? '#ef4444' : 'var(--primary)' }} />
            </div>
            <div style={s.occupancyText}>
              <span>{r.occupied} / {r.capacity} Beds Occupied</span>
              <span>{Math.round((r.occupied / r.capacity) * 100)}%</span>
            </div>

            {/* Boarder list */}
            <div style={s.boarderBox}>
              <span style={s.boarderTitle}>Allocated Boarders:</span>
              <div style={s.boarderTags}>
                {r.boarders.map((b, idx) => (
                  <span key={idx} style={s.tag}>{b}</span>
                ))}
              </div>
            </div>

            <div style={s.cardFoot}>
              <button
                style={{ ...s.assignBtn, opacity: r.status === 'full' ? 0.5 : 1, cursor: r.status === 'full' ? 'not-allowed' : 'pointer' }}
                disabled={r.status === 'full'}
                onClick={() => openAssign(r)}
              >
                <Plus size={14} /> Allocate Student
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAssignModal && selectedRoom && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowAssignModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Allocate Bed in {selectedRoom.roomNo}</h3>
              <button style={s.closeBtn} onClick={() => setShowAssignModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssign} style={s.form}>
              <p style={s.roomMeta}>
                Dormitory: <strong>{selectedRoom.dormName}</strong> ({selectedRoom.gender}) • Available: <strong>{selectedRoom.capacity - selectedRoom.occupied} Beds</strong>
              </p>
              <div style={s.fGroup}>
                <label style={s.label}>Student Name / Admission No *</label>
                <input style={s.input} required value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. Wasswa Brian (NDU/2026/091)" />
              </div>
              <div style={s.modalFoot}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Confirm Room Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  filters: { display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 240 },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', flex: 1 },
  select: { border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  kpiCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: 'var(--shadow-sm)' },
  kpiVal: { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' },
  kpiLbl: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  card: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-sm)' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  roomNo: { margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' },
  dormName: { fontSize: 12, color: 'var(--text-secondary)' },
  badge: { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  barWrap: { height: 6, backgroundColor: 'var(--border)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
  occupancyText: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 },
  boarderBox: { backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 },
  boarderTitle: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' },
  boarderTags: { display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 80, overflowY: 'auto' },
  tag: { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)' },
  cardFoot: { marginTop: 'auto', paddingTop: 8 },
  assignBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' },
  form: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  roomMeta: { margin: 0, fontSize: 13, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', padding: 10, borderRadius: 6 },
  fGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' },
  input: { border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-primary)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' },
  modalFoot: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 },
  submitBtn: { padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }
};
