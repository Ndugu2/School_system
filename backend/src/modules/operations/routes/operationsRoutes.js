const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Event = require('../models/Event');
const ScheduleEntry = require('../models/ScheduleEntry');
const { protect, authorize } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/rooms', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ name: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/rooms', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/operations/schedule
router.get('/schedule', protect, async (req, res) => {
  try {
    const { classId, teacherId, term, academicYear } = req.query;
    const query = { isActive: true };
    if (classId) query.class = classId;
    if (teacherId) query.teacher = teacherId;
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);

    const entries = await ScheduleEntry.find(query)
      .populate('class', 'name level')
      .populate('subject', 'name code')
      .populate('teacher', 'employeeId')
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name' } })
      .sort({ dayOfWeek: 1, period: 1 });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/operations/schedule — with conflict detection
router.post('/schedule', protect, authorize('super-admin', 'admin'), async (req, res) => {
  const { class: classId, teacher, room, dayOfWeek, period, term, academicYear } = req.body;
  try {
    const year = academicYear || new Date().getFullYear();
    const conflicts = [];

    // Check teacher conflict
    if (teacher) {
      const teacherConflict = await ScheduleEntry.findOne({ teacher, dayOfWeek, period, term, academicYear: year, isActive: true });
      if (teacherConflict) conflicts.push({ type: 'teacher', message: `Teacher is already scheduled in Period ${period} on Day ${dayOfWeek}` });
    }

    // Check room conflict
    if (room) {
      const roomConflict = await ScheduleEntry.findOne({ room, dayOfWeek, period, term, academicYear: year, isActive: true });
      if (roomConflict) conflicts.push({ type: 'room', message: `Room is already booked in Period ${period} on Day ${dayOfWeek}` });
    }

    // Check class conflict
    if (classId) {
      const classConflict = await ScheduleEntry.findOne({ class: classId, dayOfWeek, period, term, academicYear: year, isActive: true });
      if (classConflict) conflicts.push({ type: 'class', message: `Class already has a lesson scheduled in Period ${period} on Day ${dayOfWeek}` });
    }

    if (conflicts.length > 0) {
      return res.status(409).json({ error: { message: 'Scheduling conflict detected', conflicts } });
    }

    const entry = await ScheduleEntry.create({ ...req.body, academicYear: year });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route DELETE /api/operations/schedule/:id
router.delete('/schedule/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    await ScheduleEntry.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Schedule entry removed' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/operations/events
router.get('/events', protect, async (req, res) => {
  try {
    const { type, status, academicYear, upcoming } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (upcoming === 'true') query.startDate = { $gte: new Date() };

    const events = await Event.find(query)
      .populate('organizer', 'name')
      .sort({ startDate: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/operations/events
router.post('/events', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizer: req.user._id,
      organizerName: req.user.name,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/operations/events/:id
router.put('/events/:id', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ error: { message: 'Event not found' } });
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route POST /api/operations/events/:id/permission-slip — parent signs
router.post('/events/:id/permission-slip', protect, async (req, res) => {
  const { studentId, studentName, action } = req.body; // action: 'sign' | 'decline'
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: { message: 'Event not found' } });
    if (!event.requiresPermissionSlip) return res.status(400).json({ error: { message: 'This event does not require a permission slip' } });

    const existingIdx = event.permissionSlips.findIndex(p => p.studentId === studentId);
    const slip = {
      studentId,
      studentName,
      parentName: req.user.name,
      signedAt: new Date(),
      status: action === 'sign' ? 'signed' : 'declined',
    };

    if (existingIdx >= 0) {
      event.permissionSlips[existingIdx] = slip;
    } else {
      event.permissionSlips.push(slip);
    }
    event.markModified('permissionSlips');
    await event.save();

    res.json({ message: `Permission slip ${action === 'sign' ? 'signed' : 'declined'} successfully`, event });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORT LOGISTICS (IoT BUS TRACKING)
// ═══════════════════════════════════════════════════════════════════════════
const BusRoute = require('../models/BusRoute');

// @route GET /api/operations/buses
router.get('/buses', protect, async (req, res) => {
  try {
    const buses = await BusRoute.find();
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route PUT /api/operations/buses/:id/location
// Simulated IoT webhook endpoint
router.put('/buses/:id/location', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const bus = await BusRoute.findByIdAndUpdate(
      req.params.id,
      { currentLocation: { lat, lng }, lastUpdated: new Date() },
      { new: true }
    );
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
