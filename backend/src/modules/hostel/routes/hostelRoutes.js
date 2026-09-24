const express = require('express');
const router = express.Router();
const Dormitory = require('../models/Dormitory');
const HostelRoom = require('../models/HostelRoom');
const BoarderAssignment = require('../models/BoarderAssignment');
const ExeatPass = require('../models/ExeatPass');
const { protect, authorize } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// DORMITORIES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dormitories', protect, async (req, res) => {
  try {
    const dorms = await Dormitory.find({ isActive: true }).sort({ name: 1 });
    res.json(dorms);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/dormitories', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const dorm = await Dormitory.create(req.body);
    res.status(201).json(dorm);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/dormitories/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const dorm = await Dormitory.findById(req.params.id);
    if (!dorm) return res.status(404).json({ error: { message: 'Dormitory not found' } });

    // Deactivate associated rooms and assignments
    const rooms = await HostelRoom.find({ dormitory: dorm._id });
    const roomIds = rooms.map(r => r._id);
    await BoarderAssignment.deleteMany({ room: { $in: roomIds } });
    await HostelRoom.deleteMany({ dormitory: dorm._id });
    await Dormitory.findByIdAndDelete(req.params.id);

    res.json({ message: 'Dormitory and associated rooms removed successfully' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROOMS — DYNAMIC BED SPACES & LIVE OCCUPANCY
// ═══════════════════════════════════════════════════════════════════════════

router.get('/rooms', protect, async (req, res) => {
  try {
    const { dormitoryId } = req.query;
    const query = { isActive: true };
    if (dormitoryId && dormitoryId !== 'all') query.dormitory = dormitoryId;

    const rooms = await HostelRoom.find(query)
      .populate('dormitory', 'name gender')
      .sort({ roomNumber: 1 })
      .lean();

    // Fetch active boarders for each room
    const roomIds = rooms.map(r => r._id);
    const activeAssignments = await BoarderAssignment.find({
      room: { $in: roomIds },
      status: 'active'
    }).populate({
      path: 'student',
      populate: { path: 'user', select: 'name email' }
    }).lean();

    const assignmentsByRoom = {};
    for (const a of activeAssignments) {
      const rId = String(a.room);
      if (!assignmentsByRoom[rId]) assignmentsByRoom[rId] = [];
      assignmentsByRoom[rId].push({
        _id: a._id,
        assignmentId: a._id,
        studentId: a.student?._id,
        name: a.student?.user?.name || a.student?.admissionNumber || 'Student',
        admissionNumber: a.student?.admissionNumber || a.student?.studentId || '—',
        gender: a.student?.gender,
        bedNumber: a.bedNumber || '—',
        checkInDate: a.checkInDate,
        feeStatus: a.feeStatus || 'unpaid'
      });
    }

    const enrichedRooms = rooms.map(r => {
      const boarders = assignmentsByRoom[String(r._id)] || [];
      const occupied = boarders.length;
      const capacity = Number(r.capacity) || 4;
      const freeBeds = Math.max(0, capacity - occupied);
      return {
        ...r,
        roomNo: r.roomNumber,
        dormName: r.dormitory?.name || 'Unassigned Hall',
        gender: r.dormitory?.gender || 'Mixed',
        dormitoryId: r.dormitory?._id,
        capacity,
        occupied,
        freeBeds,
        boarders,
        status: occupied >= capacity ? 'full' : 'available'
      };
    });

    res.json(enrichedRooms);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/rooms', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    let { dormitory, dormitoryName, gender = 'Male', roomNumber, capacity = 4, floor, roomType = 'dormitory', notes } = req.body;

    if (!roomNumber) {
      return res.status(400).json({ error: { message: 'Room number is required' } });
    }

    // Auto-resolve or create dormitory if dormitoryName provided
    if (!dormitory && dormitoryName) {
      let dormDoc = await Dormitory.findOne({ name: dormitoryName.trim() });
      if (!dormDoc) {
        dormDoc = await Dormitory.create({
          name: dormitoryName.trim(),
          gender: gender || 'Male'
        });
      }
      dormitory = dormDoc._id;
    }

    if (!dormitory) {
      return res.status(400).json({ error: { message: 'Dormitory or dormitory name is required' } });
    }

    // Check if room with same number already exists in this dorm
    const existing = await HostelRoom.findOne({ dormitory, roomNumber: roomNumber.trim(), isActive: true });
    if (existing) {
      return res.status(400).json({ error: { message: `Room "${roomNumber}" already exists in this dormitory` } });
    }

    const room = await HostelRoom.create({
      dormitory,
      roomNumber: roomNumber.trim(),
      capacity: parseInt(capacity) || 4,
      floor: floor?.trim(),
      roomType,
      notes: notes?.trim()
    });

    // Update dormitory totals
    await Dormitory.findByIdAndUpdate(dormitory, {
      $inc: { totalRooms: 1, totalCapacity: parseInt(capacity) || 4 },
    });

    const populatedRoom = await HostelRoom.findById(room._id).populate('dormitory', 'name gender');
    res.status(201).json(populatedRoom);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/rooms/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const oldRoom = await HostelRoom.findById(req.params.id);
    if (!oldRoom) return res.status(404).json({ error: { message: 'Room not found' } });

    const room = await HostelRoom.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    // If capacity changed, update dorm total capacity
    if (req.body.capacity && req.body.capacity !== oldRoom.capacity) {
      const diff = parseInt(req.body.capacity) - oldRoom.capacity;
      await Dormitory.findByIdAndUpdate(room.dormitory, { $inc: { totalCapacity: diff } });
    }

    res.json(room);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/rooms/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const room = await HostelRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: { message: 'Room not found' } });

    // Remove active boarders
    await BoarderAssignment.deleteMany({ room: room._id });

    // Decrement dormitory totals
    if (room.dormitory) {
      await Dormitory.findByIdAndUpdate(room.dormitory, {
        $inc: { totalRooms: -1, totalCapacity: -(room.capacity || 0) }
      });
    }

    await HostelRoom.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room and its bed spaces removed successfully' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ELIGIBLE STUDENTS & BOARDER ALLOCATIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/eligible-students', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const Student = require('../../../models/Student');
    const { search, gender } = req.query;
    const query = { studentStatus: { $in: ['active', 'enrolled', 'admitted'] } };
    if (gender && gender !== 'Mixed') {
      query.gender = gender;
    }

    const students = await Student.find(query)
      .populate('user', 'name email')
      .populate('currentClass', 'name level stream')
      .sort({ 'user.name': 1 })
      .limit(150)
      .lean();

    // Check which students already have active boarder assignments
    const activeAssignments = await BoarderAssignment.find({ status: 'active' }).lean();
    const assignedStudentIds = new Set(activeAssignments.map(a => String(a.student)));

    let list = students.map(s => ({
      _id: s._id,
      name: s.user?.name || s.admissionNumber || 'Unnamed Student',
      studentId: s.studentId,
      admissionNumber: s.admissionNumber || s.studentId,
      gender: s.gender,
      className: s.currentClass?.name || 'Unassigned',
      boardingApproval: Boolean(s.boardingApproval),
      isAssigned: assignedStudentIds.has(String(s._id))
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.admissionNumber?.toLowerCase().includes(q));
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/hostel/boarders?term=&academicYear=&dormitoryId=&status=
router.get('/boarders', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const { term, academicYear, dormitoryId, status, page = 1, limit = 100 } = req.query;
    const query = {};
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (dormitoryId) query.dormitory = dormitoryId;
    if (status) query.status = status;

    const boarders = await BoarderAssignment.find(query)
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('room', 'roomNumber floor roomType capacity')
      .populate('dormitory', 'name gender')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BoarderAssignment.countDocuments(query);
    res.json({ boarders, total });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/hostel/boarders — assign student to room
router.post('/boarders', protect, authorize('super-admin', 'admin'), async (req, res) => {
  const Student = require('../../../models/Student');
  const AcademicYear = require('../../../models/AcademicYear');
  let { student, room, bedNumber, term, academicYear, notes } = req.body;

  try {
    // Check room availability
    const hostelRoom = await HostelRoom.findById(room).populate('dormitory');
    if (!hostelRoom) return res.status(404).json({ error: { message: 'Room not found' } });

    // Determine current academic year & term if not provided
    if (!academicYear || !term) {
      const activeAY = await AcademicYear.findOne({ isActive: true });
      academicYear = academicYear || activeAY?.year || new Date().getFullYear();
      term = term || activeAY?.terms?.find(t => t.isCurrent)?.name || 'Term 1';
    }

    // Standardize term format (e.g. 'Term 1' or 'Term I')
    if (term === 'Term I') term = 'Term 1';
    if (term === 'Term II') term = 'Term 2';
    if (term === 'Term III') term = 'Term 3';

    const currentOccupants = await BoarderAssignment.countDocuments({
      room,
      status: 'active'
    });

    if (currentOccupants >= hostelRoom.capacity) {
      return res.status(400).json({
        error: { message: `Room ${hostelRoom.roomNumber} is full (${currentOccupants}/${hostelRoom.capacity} beds occupied)` }
      });
    }

    // Check if student exists and already assigned
    const studentDoc = await Student.findById(student).populate('user', 'name');
    if (!studentDoc) return res.status(404).json({ error: { message: 'Student not found' } });

    const existingAssignment = await BoarderAssignment.findOne({
      student: studentDoc._id,
      status: 'active'
    }).populate('room');

    if (existingAssignment) {
      return res.status(400).json({
        error: { message: `${studentDoc.user?.name || 'Student'} is already allocated to Room ${existingAssignment.room?.roomNumber || ''}` }
      });
    }

    const assignment = await BoarderAssignment.create({
      student: studentDoc._id,
      dormitory: hostelRoom.dormitory?._id || hostelRoom.dormitory,
      room: hostelRoom._id,
      bedNumber: bedNumber?.trim() || `Bed ${currentOccupants + 1}`,
      term: term || 'Term 1',
      academicYear: parseInt(academicYear) || new Date().getFullYear(),
      assignedBy: req.user._id,
      notes: notes?.trim(),
      status: 'active'
    });

    // Update room occupancy
    await HostelRoom.findByIdAndUpdate(room, { $inc: { currentOccupancy: 1 } });

    // Ensure student boardingApproval is true
    studentDoc.boardingApproval = true;
    await studentDoc.save();

    const populated = await BoarderAssignment.findById(assignment._id)
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('room', 'roomNumber capacity')
      .populate('dormitory', 'name gender');

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: { message: 'Student already has an active hostel assignment for this term' } });
    }
    res.status(400).json({ error: { message: err.message } });
  }
});

// DELETE /api/hostel/boarders/:id — deallocate student from bed space
router.delete('/boarders/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const assignment = await BoarderAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: { message: 'Boarder assignment not found' } });

    const roomId = assignment.room;
    await BoarderAssignment.findByIdAndDelete(req.params.id);

    // Decrement room occupancy
    await HostelRoom.findByIdAndUpdate(roomId, {
      $inc: { currentOccupancy: -1 }
    });

    res.json({ message: 'Student deallocated from room successfully' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// PUT /api/hostel/boarders/:id — update assignment (checkout, fee status, etc.)
router.put('/boarders/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const assignment = await BoarderAssignment.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!assignment) return res.status(404).json({ error: { message: 'Assignment not found' } });

    // If checked out, decrement occupancy
    if (req.body.status === 'checked-out') {
      await HostelRoom.findByIdAndUpdate(assignment.room, { $inc: { currentOccupancy: -1 } });
    }
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXEAT PASSES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/exeats', protect, authorize('super-admin', 'admin', 'supervisor', 'deputy-head', 'teacher'), async (req, res) => {
  try {
    const exeats = await ExeatPass.find().sort({ createdAt: -1 });
    res.json(exeats);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/exeats', protect, authorize('super-admin', 'admin', 'supervisor', 'deputy-head', 'teacher'), async (req, res) => {
  try {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const exeat = await ExeatPass.create({
      ...req.body,
      otp,
      status: req.body.status || 'approved',
      wardenApproved: req.body.wardenApproved ?? true,
      createdBy: req.user._id,
    });
    res.status(201).json(exeat);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/exeats/:id', protect, authorize('super-admin', 'admin', 'supervisor', 'deputy-head', 'teacher'), async (req, res) => {
  try {
    const exeat = await ExeatPass.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exeat) return res.status(404).json({ error: { message: 'Exeat pass not found' } });
    res.json(exeat);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HOSTEL STATS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/stats', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const year = parseInt(req.query.academicYear) || new Date().getFullYear();
    const term = req.query.term;

    const boarderQuery = { academicYear: year, status: 'active' };
    if (term) boarderQuery.term = term;

    const [totalDorms, totalRooms, totalBoarders, unpaidFees, byDorm] = await Promise.all([
      Dormitory.countDocuments({ isActive: true }),
      HostelRoom.countDocuments({ isActive: true }),
      BoarderAssignment.countDocuments(boarderQuery),
      BoarderAssignment.countDocuments({ ...boarderQuery, feeStatus: 'unpaid' }),
      BoarderAssignment.aggregate([
        { $match: boarderQuery },
        { $group: { _id: '$dormitory', count: { $sum: 1 } } },
        { $lookup: { from: 'dormitories', localField: '_id', foreignField: '_id', as: 'dorm' } },
        { $unwind: '$dorm' },
        { $project: { name: '$dorm.name', gender: '$dorm.gender', count: 1 } },
      ]),
    ]);

    res.json({ totalDorms, totalRooms, totalBoarders, unpaidFees, byDorm });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BOARDING APPROVALS (LICOKA BENCHMARK)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/boarding-approvals', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const Student = require('../../../models/Student');
    const { status, classLevel, search } = req.query;
    const query = {};
    if (classLevel) query.currentClassLevel = classLevel;
    if (status === 'approved') query.boardingApproval = true;
    if (status === 'pending') query.boardingApproval = false;

    let students = await Student.find(query)
      .populate('user', 'name email')
      .populate('currentClass', 'name level stream')
      .populate('boardingApprovalDetails.approvedBy', 'name role')
      .sort({ updatedAt: -1 })
      .limit(100);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      students = students.filter(s => 
        s.user?.name?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q)
      );
    }

    // Attach active room assignment if any
    const studentIds = students.map(s => s._id);
    const assignments = await BoarderAssignment.find({
      student: { $in: studentIds },
      status: 'active'
    }).populate('dormitory', 'name gender').populate('room', 'roomNumber');

    const assignmentMap = new Map();
    assignments.forEach(a => assignmentMap.set(String(a.student), a));

    const enriched = students.map(s => {
      const a = assignmentMap.get(String(s._id));
      return {
        _id: s._id,
        name: s.user?.name || 'Unnamed Student',
        studentId: s.studentId,
        admissionNumber: s.admissionNumber,
        gender: s.gender,
        classLevel: s.currentClassLevel || s.currentClass?.level || 'S1',
        className: s.currentClass?.name || 'Unassigned',
        boardingApproval: Boolean(s.boardingApproval),
        approvedAt: s.boardingApprovalDetails?.approvedAt,
        approvedBy: s.boardingApprovalDetails?.approvedBy?.name,
        notes: s.boardingApprovalDetails?.notes,
        dormitory: a?.dormitory?.name || 'Unassigned',
        room: a?.room?.roomNumber || '—',
        bedNumber: a?.bedNumber || '—'
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/boarding-approvals/:studentId', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const Student = require('../../../models/Student');
    const { approved = true, notes } = req.body;
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });

    student.boardingApproval = Boolean(approved);
    student.boardingApprovalDetails = {
      approved: Boolean(approved),
      approvedAt: new Date(),
      approvedBy: req.user._id,
      notes: notes || (approved ? 'Boarding clearance approved by warden/admin' : 'Boarding clearance revoked')
    };

    await student.save();
    res.json({
      message: `Boarding clearance ${approved ? 'approved' : 'revoked'} successfully for ${student.studentId}`,
      student
    });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

module.exports = router;
