const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Event = require('../models/Event');
const ScheduleEntry = require('../models/ScheduleEntry');
const { protect, authorize } = require('../../../middleware/auth');
const Student = require('../../../models/Student');
const { canAccessStudent, parentStudentFilter } = require('../../../middleware/recordAccess');
const { timeToMinutes, hasTimeOverlap } = require('../../../utils/scheduleConflicts');

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
  const { class: classId, teacher, room, dayOfWeek, period, startTime, endTime, term, academicYear } = req.body;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || start >= end) {
    return res.status(400).json({ error: { message: 'Schedule times must be valid 24-hour HH:mm values and end after start' } });
  }
  try {
    const year = academicYear || new Date().getFullYear();
    const conflicts = [];
    const resourceQueries = [{ class: classId }];
    if (teacher) resourceQueries.push({ teacher });
    if (room) resourceQueries.push({ room });
    const existingEntries = await ScheduleEntry.find({
      dayOfWeek,
      term,
      academicYear: year,
      isActive: true,
      $or: resourceQueries,
    });

    for (const existing of existingEntries) {
      if (!hasTimeOverlap(startTime, endTime, existing.startTime, existing.endTime)) continue;
      if (String(existing.class) === String(classId)) {
        conflicts.push({ type: 'class', message: `Class is already scheduled from ${existing.startTime} to ${existing.endTime}` });
      }
      if (teacher && String(existing.teacher) === String(teacher)) {
        conflicts.push({ type: 'teacher', message: `Teacher is already scheduled from ${existing.startTime} to ${existing.endTime}` });
      }
      if (room && String(existing.room) === String(room)) {
        conflicts.push({ type: 'room', message: `Room is already booked from ${existing.startTime} to ${existing.endTime}` });
      }
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
    if (['parent', 'student'].includes(req.user.role)) query.status = 'published';
    if (type) query.type = type;
    if (status && !['parent', 'student'].includes(req.user.role)) query.status = status;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (upcoming === 'true') query.startDate = { $gte: new Date() };

    const events = await Event.find(query)
      .populate('organizer', 'name')
      .sort({ startDate: 1 });
    if (['super-admin', 'admin'].includes(req.user.role)) return res.json(events);
    let visibleStudentIds = [];
    if (req.user.role === 'parent') {
      const children = await Student.find(parentStudentFilter(req.user)).select('_id');
      visibleStudentIds = children.map(student => String(student._id));
    } else if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id }).select('_id');
      if (student) visibleStudentIds = [String(student._id)];
    }
    res.json(events.map(event => {
      const visible = event.toObject();
      visible.permissionSlips = visibleStudentIds.length
        ? (visible.permissionSlips || []).filter(slip => visibleStudentIds.includes(String(slip.studentId)))
        : [];
      return visible;
    }));
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/operations/events
router.post('/events', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const eventData = { ...req.body };
    delete eventData.permissionSlips;
    delete eventData.organizer;
    delete eventData.organizerName;
    const event = await Event.create({
      ...eventData,
      permissionSlips: [],
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
    const existing = await Event.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: { message: 'Event not found' } });
    if (!['super-admin', 'admin'].includes(req.user.role) && String(existing.organizer) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Teachers may only update events they created' } });
    }
    const updates = { ...req.body };
    delete updates.permissionSlips;
    delete updates.organizer;
    delete updates.organizerName;
    const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route POST /api/operations/events/:id/permission-slip — parent signs
router.post('/events/:id/permission-slip', protect, authorize('parent'), async (req, res) => {
  const { studentId, action } = req.body; // action: 'sign' | 'decline'
  try {
    if (!studentId || !['sign', 'decline'].includes(action)) return res.status(400).json({ error: { message: 'A student and valid sign/decline action are required' } });
    if (!(await canAccessStudent(req.user, studentId))) return res.status(403).json({ error: { message: 'Not authorized to respond for this student' } });
    const student = await Student.findById(studentId).populate('user', 'name');
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: { message: 'Event not found' } });
    if (!event.requiresPermissionSlip) return res.status(400).json({ error: { message: 'This event does not require a permission slip' } });

    const existingIdx = event.permissionSlips.findIndex(p => String(p.studentId) === String(studentId));
    const slip = {
      studentId: String(student._id),
      studentName: student.user?.name || '',
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

    res.json({ message: `Permission slip ${action === 'sign' ? 'signed' : 'declined'} successfully`, status: slip.status });
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

// @route POST /api/operations/buses — create route
router.post('/buses', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const bus = await BusRoute.create(req.body);
    res.status(201).json(bus);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/operations/buses/:id — update route details
router.put('/buses/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const bus = await BusRoute.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bus) return res.status(404).json({ error: { message: 'Bus route not found' } });
    res.json(bus);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORT ASSIGNMENTS (student → route)
// ═══════════════════════════════════════════════════════════════════════════
const TransportAssignment = require('../models/TransportAssignment');

// GET /api/operations/transport-assignments?busRouteId=&term=&academicYear=
router.get('/transport-assignments', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const { busRouteId, term, academicYear, feeStatus } = req.query;
    const query = { isActive: true };
    if (busRouteId) query.busRoute = busRouteId;
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (feeStatus) query.feeStatus = feeStatus;

    const assignments = await TransportAssignment.find(query)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('busRoute', 'routeName busNumber driverName stops')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/operations/transport-assignments
router.post('/transport-assignments', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const assignment = await TransportAssignment.create({
      ...req.body,
      academicYear: parseInt(req.body.academicYear),
      assignedBy: req.user._id,
    });
    res.status(201).json(assignment);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: { message: 'Student already assigned to a route this term' } });
    }
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/operations/transport-assignments/:id
router.put('/transport-assignments/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const a = await TransportAssignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!a) return res.status(404).json({ error: { message: 'Assignment not found' } });
    res.json(a);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

module.exports = router;
