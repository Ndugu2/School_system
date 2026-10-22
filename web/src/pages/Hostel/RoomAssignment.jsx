import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  Home,
  Users,
  Bed,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  UserCheck,
  X,
  Trash2,
  Building2,
  UserMinus,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';

export default function RoomAssignment() {
  const [rooms, setRooms] = useState([]);
  const [dormitories, setDormitories] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dormFilter, setDormFilter] = useState('all');

  // Modal States
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Add Room Form
  const [newRoom, setNewRoom] = useState({
    dormitoryMode: 'existing', // 'existing' | 'new'
    dormitoryId: '',
    newDormName: '',
    gender: 'Male',
    roomNumber: '',
    capacity: 4,
    floor: 'Ground Floor',
    roomType: 'dormitory',
    notes: ''
  });

  // Assign Student Form
  const [assignmentForm, setAssignmentForm] = useState({
    studentId: '',
    bedNumber: '',
    notes: ''
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [roomsData, dormsData] = await Promise.all([
        api.get('/hostel/rooms'),
        api.get('/hostel/dormitories')
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setDormitories(Array.isArray(dormsData) ? dormsData : []);
      
      // Auto-set default dormitory for Add Room form if available
      if (Array.isArray(dormsData) && dormsData.length > 0) {
        setNewRoom(prev => ({
          ...prev,
          dormitoryId: prev.dormitoryId || dormsData[0]._id
        }));
      }
    } catch (err) {
      console.error('Failed to load hostel data:', err);
      showNotification('error', err.message || 'Error loading hostel rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Allocate Modal and load eligible students for room's gender
  const openAssignModal = async (room) => {
    setSelectedRoom(room);
    setAssignmentForm({
      studentId: '',
      bedNumber: `Bed ${room.occupied + 1}`,
      notes: ''
    });
    setShowAssignModal(true);

    try {
      const students = await api.get(`/hostel/eligible-students?gender=${room.gender || ''}`);
      setEligibleStudents(Array.isArray(students) ? students : []);
    } catch (err) {
      console.error('Failed to load eligible students:', err);
    }
  };

  // Submit Add Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.roomNumber.trim()) {
      showNotification('error', 'Please enter a room number or code');
      return;
    }

    if (newRoom.dormitoryMode === 'new' && !newRoom.newDormName.trim()) {
      showNotification('error', 'Please enter a name for the new dormitory');
      return;
    }

    if (newRoom.dormitoryMode === 'existing' && !newRoom.dormitoryId) {
      showNotification('error', 'Please select a dormitory hall');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        roomNumber: newRoom.roomNumber.trim(),
        capacity: parseInt(newRoom.capacity, 10) || 4,
        floor: newRoom.floor,
        roomType: newRoom.roomType,
        notes: newRoom.notes
      };

      if (newRoom.dormitoryMode === 'new') {
        payload.dormitoryName = newRoom.newDormName.trim();
        payload.gender = newRoom.gender;
      } else {
        payload.dormitory = newRoom.dormitoryId;
      }

      await api.post('/hostel/rooms', payload);
      showNotification('success', `Room ${newRoom.roomNumber} created with ${newRoom.capacity} bed spaces!`);
      setShowAddRoomModal(false);
      setNewRoom({
        dormitoryMode: 'existing',
        dormitoryId: dormitories[0]?._id || '',
        newDormName: '',
        gender: 'Male',
        roomNumber: '',
        capacity: 4,
        floor: 'Ground Floor',
        roomType: 'dormitory',
        notes: ''
      });
      loadData(true);
    } catch (err) {
      showNotification('error', err.message || 'Failed to create room');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Student Allocation
  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!assignmentForm.studentId || !selectedRoom) {
      showNotification('error', 'Please select a student to allocate');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.post('/hostel/boarders', {
        student: assignmentForm.studentId,
        room: selectedRoom._id,
        bedNumber: assignmentForm.bedNumber,
        notes: assignmentForm.notes
      });

      showNotification('success', 'Student allocated to bed space successfully!');
      setShowAssignModal(false);
      loadData(true);
    } catch (err) {
      showNotification('error', err.message || 'Failed to allocate student to bed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Remove / Deallocate Student
  const handleDeallocateStudent = async (boarder, room) => {
    if (!window.confirm(`Deallocate ${boarder.name} from ${room.roomNo}? This will free up 1 bed space.`)) {
      return;
    }

    try {
      await api.delete(`/hostel/boarders/${boarder.assignmentId || boarder._id}`);
      showNotification('success', `${boarder.name} deallocated. 1 bed space freed.`);
      loadData(true);
    } catch (err) {
      showNotification('error', err.message || 'Failed to deallocate student');
    }
  };

  // Delete Room
  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Are you sure you want to delete ${room.roomNo} in ${room.dormName}? All bed allocations in this room will be removed.`)) {
      return;
    }

    try {
      await api.delete(`/hostel/rooms/${room._id}`);
      showNotification('success', `Room ${room.roomNo} deleted successfully.`);
      loadData(true);
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete room');
    }
  };

  // Computed KPI Metrics (100% Dynamic)
  const totalRooms = rooms.length;
  const totalCapacity = useMemo(() => rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0), [rooms]);
  const totalOccupied = useMemo(() => rooms.reduce((acc, r) => acc + (Number(r.occupied) || 0), 0), [rooms]);
  const totalFreeBeds = useMemo(() => Math.max(0, totalCapacity - totalOccupied), [totalCapacity, totalOccupied]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter(r => {
      const matchQ =
        !q ||
        r.roomNo?.toLowerCase().includes(q) ||
        r.dormName?.toLowerCase().includes(q) ||
        (Array.isArray(r.boarders) &&
          r.boarders.some(
            b =>
              b.name?.toLowerCase().includes(q) ||
              b.admissionNumber?.toLowerCase().includes(q) ||
              b.bedNumber?.toLowerCase().includes(q)
          ));
      const matchDorm =
        dormFilter === 'all' ||
        String(r.dormitoryId) === String(dormFilter) ||
        r.dormName === dormFilter;
      return matchQ && matchDorm;
    });
  }, [rooms, search, dormFilter]);

  if (loading) {
    return (
      <div style={s.loadingBox}>
        <RefreshCw size={24} className="animate-spin" color="#d8b257" />
        <span>Loading dynamic dormitory &amp; bed registry...</span>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Toast Feedback */}
      {feedback && (
        <div style={{ ...s.toast, backgroundColor: feedback.type === 'error' ? '#ef4444' : '#10b981' }}>
          {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Dynamic Summary Cards */}
      <div style={s.kpiRow}>
        <div style={s.kpiCard}>
          <div style={s.kpiTop}>
            <span style={s.kpiLbl}>Total Registered Rooms</span>
            <div style={{ ...s.kpiIconWrap, backgroundColor: 'rgba(96, 165, 250, 0.12)', color: '#60a5fa' }}>
              <Building2 size={15} />
            </div>
          </div>
          <span style={s.kpiVal}>{totalRooms}</span>
          <span style={s.kpiSub}>Dormitory Room Units</span>
        </div>

        <div style={s.kpiCard}>
          <div style={s.kpiTop}>
            <span style={s.kpiLbl}>Bed Space Capacity</span>
            <div style={{ ...s.kpiIconWrap, backgroundColor: 'rgba(197, 155, 39, 0.12)', color: '#d8b257' }}>
              <Bed size={15} />
            </div>
          </div>
          <span style={{ ...s.kpiVal, color: '#d8b257' }}>{totalCapacity}</span>
          <span style={s.kpiSub}>Configured Bed Spaces</span>
        </div>

        <div style={s.kpiCard}>
          <div style={s.kpiTop}>
            <span style={s.kpiLbl}>Occupied Bed Spaces</span>
            <div style={{ ...s.kpiIconWrap, backgroundColor: 'rgba(52, 211, 153, 0.12)', color: '#34d399' }}>
              <Users size={15} />
            </div>
          </div>
          <span style={{ ...s.kpiVal, color: '#34d399' }}>{totalOccupied}</span>
          <span style={s.kpiSub}>Active Boarding Students</span>
        </div>

        <div style={s.kpiCard}>
          <div style={s.kpiTop}>
            <span style={s.kpiLbl}>Available Free Beds</span>
            <div style={{ ...s.kpiIconWrap, backgroundColor: totalFreeBeds > 0 ? 'rgba(52, 211, 153, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: totalFreeBeds > 0 ? '#34d399' : '#ef4444' }}>
              <CheckCircle2 size={15} />
            </div>
          </div>
          <span style={{ ...s.kpiVal, color: totalFreeBeds > 0 ? '#34d399' : '#ef4444' }}>{totalFreeBeds}</span>
          <span style={s.kpiSub}>Vacant Bed Spaces</span>
        </div>
      </div>

      {/* Control Header & Filters */}
      <div style={s.headerBar}>
        <div style={s.filterGroup}>
          <div style={s.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              style={s.searchInput}
              placeholder="Search room, dorm hall, or student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={s.iconClearBtn}>
                <X size={13} />
              </button>
            )}
          </div>

          <select
            style={s.selectInput}
            value={dormFilter}
            onChange={e => setDormFilter(e.target.value)}
          >
            <option value="all">All Dormitory Halls</option>
            {dormitories.map(d => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.gender})
              </option>
            ))}
          </select>

          <button
            onClick={() => loadData(true)}
            style={s.refreshBtn}
            title="Refresh room and bed occupancy"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <button
          onClick={() => setShowAddRoomModal(true)}
          style={s.addRoomBtn}
        >
          <Plus size={15} />
          <span>Add Room</span>
        </button>
      </div>

      {/* Dynamic Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div style={s.emptyBox}>
          <Building2 size={36} color="#d8b257" />
          <h3 style={s.emptyTitle}>
            {rooms.length === 0 ? 'No Dormitory Rooms Created Yet' : 'No Matching Rooms Found'}
          </h3>
          <p style={s.emptyDesc}>
            {rooms.length === 0
              ? 'Get started by creating your first dormitory room and setting its total bed space capacity.'
              : 'Try clearing your search keyword or changing the dormitory filter.'}
          </p>
          {rooms.length === 0 && (
            <button
              onClick={() => setShowAddRoomModal(true)}
              style={s.addRoomBtn}
            >
              <Plus size={15} /> Add First Room
            </button>
          )}
        </div>
      ) : (
        <div style={s.grid}>
          {filteredRooms.map(r => {
            const isFull = r.occupied >= r.capacity;
            const occupancyPct = Math.round(((r.occupied || 0) / (r.capacity || 1)) * 100);
            const freeBeds = Math.max(0, (r.capacity || 0) - (r.occupied || 0));

            return (
              <div key={r._id} style={s.roomCard}>
                {/* Header */}
                <div style={s.roomHead}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h4 style={s.roomNumber}>{r.roomNo}</h4>
                      {r.floor && <span style={s.floorPill}>{r.floor}</span>}
                    </div>
                    <span style={s.roomDorm}>
                      {r.dormName} <strong style={{ color: r.gender === 'Female' ? '#ec4899' : '#60a5fa' }}>({r.gender})</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        ...s.statusBadge,
                        backgroundColor: isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                        color: isFull ? '#ef4444' : '#34d399'
                      }}
                    >
                      {isFull ? 'Fully Booked' : `${freeBeds} Beds Free`}
                    </span>
                    <button
                      onClick={() => handleDeleteRoom(r)}
                      style={s.deleteBtn}
                      title="Delete room"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Occupancy Progress Bar */}
                <div style={s.progressWrap}>
                  <div
                    style={{
                      ...s.progressFill,
                      width: `${Math.min(100, occupancyPct)}%`,
                      backgroundColor: isFull ? '#ef4444' : occupancyPct >= 75 ? '#f59e0b' : '#34d399'
                    }}
                  />
                </div>

                <div style={s.occupancyDetails}>
                  <span style={s.occupancyText}>
                    <strong>{r.occupied}</strong> / {r.capacity} Beds Occupied
                  </span>
                  <span style={{ ...s.occupancyPct, color: isFull ? '#ef4444' : '#34d399' }}>
                    {occupancyPct}%
                  </span>
                </div>

                {/* Allocated Students List */}
                <div style={s.boarderSection}>
                  <div style={s.boarderHeader}>
                    <span>Allocated Boarders ({r.occupied}):</span>
                    {r.roomType && <span style={{ textTransform: 'capitalize', color: '#64748b' }}>{r.roomType}</span>}
                  </div>

                  {Array.isArray(r.boarders) && r.boarders.length > 0 ? (
                    <div style={s.boardersList}>
                      {r.boarders.map((b, idx) => (
                        <div key={b.assignmentId || b._id || idx} style={s.boarderChip}>
                          <div style={s.boarderInfo}>
                            <span style={s.boarderName}>{b.name}</span>
                            <span style={s.boarderBed}>{b.bedNumber || `Bed ${idx + 1}`}</span>
                          </div>
                          <button
                            onClick={() => handleDeallocateStudent(b, r)}
                            style={s.deallocateBtn}
                            title="Remove student from bed space"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={s.noBoarders}>No boarders allocated to this room yet.</p>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => openAssignModal(r)}
                  disabled={isFull}
                  style={{
                    ...s.allocateBtn,
                    opacity: isFull ? 0.45 : 1,
                    cursor: isFull ? 'not-allowed' : 'pointer'
                  }}
                  title={isFull ? 'Room is fully occupied' : 'Assign student to free bed'}
                >
                  <Plus size={14} />
                  <span>{isFull ? 'Room Full' : '+ Allocate Student'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: ADD ROOM ── */}
      {showAddRoomModal && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAddRoomModal(false)}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="#d8b257" />
                <h3 style={s.modalTitle}>Add Dormitory Room</h3>
              </div>
              <button style={s.closeIconBtn} onClick={() => setShowAddRoomModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} style={s.modalBody}>
              {/* Dormitory Choice */}
              <div style={s.formField}>
                <label style={s.label}>Dormitory Hall *</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <button
                    type="button"
                    style={{
                      ...s.toggleBtn,
                      backgroundColor: newRoom.dormitoryMode === 'existing' ? 'rgba(197, 155, 39, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: newRoom.dormitoryMode === 'existing' ? '#d8b257' : 'rgba(255, 255, 255, 0.08)',
                      color: newRoom.dormitoryMode === 'existing' ? '#d8b257' : '#94a3b8'
                    }}
                    onClick={() => setNewRoom({ ...newRoom, dormitoryMode: 'existing' })}
                  >
                    Existing Dormitory
                  </button>
                  <button
                    type="button"
                    style={{
                      ...s.toggleBtn,
                      backgroundColor: newRoom.dormitoryMode === 'new' ? 'rgba(197, 155, 39, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: newRoom.dormitoryMode === 'new' ? '#d8b257' : 'rgba(255, 255, 255, 0.08)',
                      color: newRoom.dormitoryMode === 'new' ? '#d8b257' : '#94a3b8'
                    }}
                    onClick={() => setNewRoom({ ...newRoom, dormitoryMode: 'new' })}
                  >
                    + Create New Dormitory
                  </button>
                </div>

                {newRoom.dormitoryMode === 'existing' ? (
                  dormitories.length > 0 ? (
                    <select
                      style={s.formInput}
                      value={newRoom.dormitoryId}
                      onChange={e => setNewRoom({ ...newRoom, dormitoryId: e.target.value })}
                      required
                    >
                      {dormitories.map(d => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.gender})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 12, color: '#f59e0b', padding: '6px 0' }}>
                      No dormitories exist yet. Switch to "+ Create New Dormitory" to add one!
                    </div>
                  )
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                    <input
                      style={s.formInput}
                      placeholder="e.g. Lumumba Hall, Mary Stuart"
                      value={newRoom.newDormName}
                      onChange={e => setNewRoom({ ...newRoom, newDormName: e.target.value })}
                      required
                    />
                    <select
                      style={s.formInput}
                      value={newRoom.gender}
                      onChange={e => setNewRoom({ ...newRoom, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Room Number & Bed Space Capacity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div style={s.formField}>
                  <label style={s.label}>Room Number / Code *</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. Room 01, A-101"
                    value={newRoom.roomNumber}
                    onChange={e => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                    required
                  />
                </div>

                <div style={s.formField}>
                  <label style={s.label}>Bed Space Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    style={s.formInput}
                    value={newRoom.capacity}
                    onChange={e => setNewRoom({ ...newRoom, capacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Floor and Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={s.formField}>
                  <label style={s.label}>Floor / Wing</label>
                  <input
                    style={s.formInput}
                    placeholder="e.g. Ground Floor, East Wing"
                    value={newRoom.floor}
                    onChange={e => setNewRoom({ ...newRoom, floor: e.target.value })}
                  />
                </div>

                <div style={s.formField}>
                  <label style={s.label}>Room Type</label>
                  <select
                    style={s.formInput}
                    value={newRoom.roomType}
                    onChange={e => setNewRoom({ ...newRoom, roomType: e.target.value })}
                  >
                    <option value="dormitory">Standard Dormitory</option>
                    <option value="semi-private">Semi-Private</option>
                    <option value="private">Private (Prefect/Senior)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div style={s.formField}>
                <label style={s.label}>Notes (Optional)</label>
                <input
                  style={s.formInput}
                  placeholder="Special instructions or amenities..."
                  value={newRoom.notes}
                  onChange={e => setNewRoom({ ...newRoom, notes: e.target.value })}
                />
              </div>

              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => setShowAddRoomModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={s.submitBtn}
                >
                  {formSubmitting ? 'Creating...' : 'Create Room & Bed Spaces'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ALLOCATE STUDENT TO BED ── */}
      {showAssignModal && selectedRoom && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAssignModal(false)}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bed size={18} color="#d8b257" />
                <h3 style={s.modalTitle}>Allocate Bed in {selectedRoom.roomNo}</h3>
              </div>
              <button style={s.closeIconBtn} onClick={() => setShowAssignModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignStudent} style={s.modalBody}>
              <div style={s.roomInfoBanner}>
                <div>
                  <strong>{selectedRoom.dormName}</strong> ({selectedRoom.gender})
                </div>
                <div style={{ fontSize: 12, color: '#34d399', marginTop: 2 }}>
                  ● Available Bed Spaces: <strong>{selectedRoom.freeBeds} of {selectedRoom.capacity} free</strong>
                </div>
              </div>

              {/* Student Selector */}
              <div style={s.formField}>
                <label style={s.label}>Select Student to Allocate *</label>
                {eligibleStudents.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>
                    No students currently available matching {selectedRoom.gender} gender.
                  </p>
                ) : (
                  <select
                    style={s.formInput}
                    value={assignmentForm.studentId}
                    onChange={e => setAssignmentForm({ ...assignmentForm, studentId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Eligible Student --</option>
                    {eligibleStudents.map(s => (
                      <option
                        key={s._id}
                        value={s._id}
                        disabled={s.isAssigned}
                      >
                        {s.name} ({s.admissionNumber || s.studentId}) — {s.className || 'Class'}
                        {s.isAssigned ? ' [Already in a Room]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bed Number */}
              <div style={s.formField}>
                <label style={s.label}>Bed Number / Label *</label>
                <input
                  style={s.formInput}
                  placeholder="e.g. Bed 1, Lower Bunk A"
                  value={assignmentForm.bedNumber}
                  onChange={e => setAssignmentForm({ ...assignmentForm, bedNumber: e.target.value })}
                  required
                />
              </div>

              {/* Notes */}
              <div style={s.formField}>
                <label style={s.label}>Allocation Notes (Optional)</label>
                <input
                  style={s.formInput}
                  placeholder="e.g. Special medical condition, lower bunk assigned"
                  value={assignmentForm.notes}
                  onChange={e => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                />
              </div>

              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !assignmentForm.studentId}
                  style={s.submitBtn}
                >
                  {formSubmitting ? 'Allocating...' : 'Confirm Bed Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SLEEK EXECUTIVE STYLING ──
const s = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  loadingBox: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: '#94a3b8',
    fontSize: 13
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12
  },
  kpiCard: {
    backgroundColor: '#0d1527',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
  },
  kpiTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  kpiLbl: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  kpiIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.15
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748b'
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexWrap: 'wrap'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1527',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: '7px 12px',
    minWidth: 260,
    flex: 1
  },
  searchInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: 13,
    width: '100%'
  },
  iconClearBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center'
  },
  selectInput: {
    backgroundColor: '#0d1527',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: '7px 12px',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer'
  },
  refreshBtn: {
    backgroundColor: '#0d1527',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: '8px 10px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addRoomBtn: {
    backgroundColor: '#c59b27',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    color: '#080e1a',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.16s ease',
    boxShadow: '0 2px 6px rgba(197, 155, 39, 0.2)'
  },
  emptyBox: {
    backgroundColor: '#0d1527',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 10
  },
  emptyTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#fff'
  },
  emptyDesc: {
    margin: 0,
    fontSize: 13,
    color: '#94a3b8',
    maxWidth: 420,
    lineHeight: 1.4
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: 14
  },
  roomCard: {
    backgroundColor: '#0d1527',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.22)',
    transition: 'all 0.18s ease'
  },
  roomHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  roomNumber: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: '#fff'
  },
  floorPill: {
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#94a3b8',
    fontWeight: 600
  },
  roomDorm: {
    fontSize: 12,
    color: '#94a3b8'
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    whiteSpace: 'nowrap'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: 3,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 4
  },
  progressWrap: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease'
  },
  occupancyDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 11.5
  },
  occupancyText: {
    color: '#94a3b8'
  },
  occupancyPct: {
    fontWeight: 800
  },
  boarderSection: {
    backgroundColor: '#070c18',
    borderRadius: 8,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  boarderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase'
  },
  boardersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 110,
    overflowY: 'auto'
  },
  boarderChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 5,
    fontSize: 11.5
  },
  boarderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden'
  },
  boarderName: {
    color: '#fff',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  boarderBed: {
    color: '#d8b257',
    fontSize: 10.5,
    fontWeight: 700,
    whiteSpace: 'nowrap'
  },
  deallocateBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '1px 3px',
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center'
  },
  noBoarders: {
    margin: 0,
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic'
  },
  allocateBtn: {
    marginTop: 'auto',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    backgroundColor: '#c59b27',
    color: '#080e1a',
    border: 'none',
    borderRadius: 7,
    fontSize: 12.5,
    fontWeight: 700,
    transition: 'all 0.16s ease'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(4, 7, 15, 0.82)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16
  },
  modalContent: {
    backgroundColor: '#0d1527',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
  },
  modalTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: '#fff'
  },
  closeIconBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center'
  },
  modalBody: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  roomInfoBanner: {
    backgroundColor: 'rgba(197, 155, 39, 0.1)',
    border: '1px solid rgba(197, 155, 39, 0.2)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: '#fff'
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  formInput: {
    backgroundColor: '#070c18',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#fff',
    fontSize: 13,
    outline: 'none'
  },
  toggleBtn: {
    flex: 1,
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.16s ease'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '8px 16px',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  submitBtn: {
    backgroundColor: '#c59b27',
    border: 'none',
    borderRadius: 8,
    padding: '8px 18px',
    color: '#080e1a',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(197, 155, 39, 0.25)'
  }
};
