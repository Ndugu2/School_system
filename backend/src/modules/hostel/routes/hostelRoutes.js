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

router.put('/dormitories/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const dorm = await Dormitory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dorm) return res.status(404).json({ error: { message: 'Dormitory not found' } });
    res.json(dorm);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/rooms', protect, async (req, res) => {
  try {
    const { dormitoryId } = req.query;
    const query = { isActive: true };
    if (dormitoryId) query.dormitory = dormitoryId;

    const rooms = await HostelRoom.find(query)
      .populate('dormitory', 'name gender')
      .sort({ dormitory: 1, roomNumber: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/rooms', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const room = await HostelRoom.create(req.body);
    // Update dormitory totals
    await Dormitory.findByIdAndUpdate(req.body.dormitory, {
      $inc: { totalRooms: 1, totalCapacity: req.body.capacity || 4 },
    });
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/rooms/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const room = await HostelRoom.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ error: { message: 'Room not found' } });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BOARDER ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

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
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('room', 'roomNumber floor roomType')
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
  const { student, room, term, academicYear } = req.body;
  try {
    // Check room availability
    const hostelRoom = await HostelRoom.findById(room);
    if (!hostelRoom) return res.status(404).json({ error: { message: 'Room not found' } });

    const currentOccupants = await BoarderAssignment.countDocuments({
      room, term, academicYear: parseInt(academicYear), status: 'active',
    });
    if (currentOccupants >= hostelRoom.capacity) {
      return res.status(400).json({ error: { message: `Room is full (${hostelRoom.capacity}/${hostelRoom.capacity})` } });
    }

    const assignment = await BoarderAssignment.create({
      ...req.body,
      academicYear: parseInt(academicYear),
      assignedBy: req.user._id,
    });

    // Update room occupancy
    await HostelRoom.findByIdAndUpdate(room, { $inc: { currentOccupancy: 1 } });

    res.status(201).json(assignment);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: { message: 'Student already has a hostel assignment for this term' } });
    }
    res.status(400).json({ error: { message: err.message } });
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
