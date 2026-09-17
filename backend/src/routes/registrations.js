const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const ADMIN_ROLES = ['super-admin', 'admin', 'registrar'];

// ── Registration Number Generator ─────────────────────────────────────────────
const generateRegNumber = async (year, term) => {
  const termCode = term === 'Term 1' ? 'T1' : term === 'Term 2' ? 'T2' : 'T3';
  const prefix = `REG-${year}-${termCode}-`;
  const last = await Registration.findOne({
    registrationNumber: new RegExp('^' + prefix)
  }).sort({ registrationNumber: -1 });
  const seq = last ? parseInt(last.registrationNumber.split('-')[3]) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALL REGISTRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  List registrations with filters
// @route GET /api/registrations
router.get('/', protect, authorize(...ADMIN_ROLES, 'class-teacher', 'teacher'), async (req, res) => {
  try {
    const { academicYear, term, classLevel, class: classId, streamName, status, page = 1, limit = 50 } = req.query;

    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (classLevel) query.classLevel = classLevel;
    if (classId) query.class = classId;
    if (streamName) query.streamName = streamName;
    if (status) query.status = status;

    const total = await Registration.countDocuments(query);
    const registrations = await Registration.find(query)
      .populate('student', 'studentId admissionNumber parentName parentPhone photoUrl')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('academicYear', 'year label')
      .populate('class', 'name level')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ registrations, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get a student's full registration history
// @route GET /api/registrations/student/:studentId
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const registrations = await Registration.find({ student: req.params.studentId })
      .populate('academicYear', 'year label')
      .populate('class', 'name level')
      .sort({ createdAt: -1 });
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get single registration
// @route GET /api/registrations/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id)
      .populate('student')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('academicYear')
      .populate('class');
    if (!reg) return res.status(404).json({ error: { message: 'Registration not found' } });
    res.json(reg);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER A STUDENT FOR A TERM
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Register a student for a given academic year + term + class + stream
// @route POST /api/registrations
router.post('/', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  const {
    studentId,
    academicYearId,
    term,
    classId,
    streamId,
    streamName,
    boardingStatus,
    subjectCombination,
    subjects,
    notes,
  } = req.body;

  try {
    // Check for duplicate registration
    const existing = await Registration.findOne({ student: studentId, academicYear: academicYearId, term });
    if (existing) {
      return res.status(400).json({
        error: { message: `Student is already registered for ${term} in this academic year` }
      });
    }

    // Validate academic year + class
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) return res.status(404).json({ error: { message: 'Academic year not found' } });

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ error: { message: 'Class not found' } });

    // Validate stream if provided
    let resolvedStreamName = streamName || null;
    if (streamId) {
      const stream = cls.streams.id(streamId);
      if (!stream) return res.status(404).json({ error: { message: 'Stream not found in this class' } });
      resolvedStreamName = stream.name;
    }

    const registrationNumber = await generateRegNumber(academicYear.year, term);

    const registration = await Registration.create({
      student: studentId,
      academicYear: academicYearId,
      term,
      class: classId,
      streamId: streamId || null,
      streamName: resolvedStreamName,
      classLevel: cls.level,
      boardingStatus: boardingStatus || 'day',
      subjectCombination,
      subjects: subjects || [],
      status: 'registered',
      registrationNumber,
      notes,
      registeredBy: req.user._id,
    });

    // Update student's current class snapshot
    await Student.findByIdAndUpdate(studentId, {
      studentStatus: 'active',
      currentClass: classId,
      currentClassLevel: cls.level,
      currentStream: resolvedStreamName
    });

    await logAudit(req, {
      action: 'registration.created',
      module: 'registrations',
      recordId: registration._id,
      recordRef: registration.registrationNumber,
      description: `Student registered for ${academicYear.year} ${term} — ${cls.level} ${resolvedStreamName || ''}`,
    });

    const populated = await Registration.findById(registration._id)
      .populate('student')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('academicYear', 'year label')
      .populate('class', 'name level');

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Update registration (stream change, boarding status, status, notes)
// @route PATCH /api/registrations/:id
router.patch('/:id', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  const allowedUpdates = [
    'streamId', 'streamName', 'boardingStatus', 'status',
    'subjectCombination', 'subjects', 'notes', 'outstandingRequirements', 'allRequirementsSubmitted'
  ];
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: { message: 'Registration not found' } });

    const oldValue = reg.toObject();
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) reg[field] = req.body[field];
    });
    await reg.save();

    await logAudit(req, {
      action: 'record.updated',
      module: 'registrations',
      recordId: reg._id,
      recordRef: reg.registrationNumber,
      oldValue,
      newValue: reg.toObject(),
    });

    res.json(reg);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Cancel a registration
// @route PATCH /api/registrations/:id/cancel
router.patch('/:id/cancel', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: { message: 'Registration not found' } });
    if (reg.status === 'cancelled') return res.status(400).json({ error: { message: 'Already cancelled' } });

    const oldStatus = reg.status;
    reg.status = 'cancelled';
    await reg.save();

    // Update student status
    await Student.findByIdAndUpdate(reg.student, { studentStatus: 'withdrawn' });

    await logAudit(req, {
      action: 'registration.cancelled',
      module: 'registrations',
      recordId: reg._id,
      recordRef: reg.registrationNumber,
      oldValue: { status: oldStatus },
      newValue: { status: 'cancelled' },
      reason: req.body.reason,
    });

    res.json({ message: 'Registration cancelled', registration: reg });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY STATS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Registration summary for a given year + term
// @route GET /api/registrations/stats/summary
router.get('/stats/summary', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    const matchQ = {};
    if (academicYear) matchQ.academicYear = new (require('mongoose').Types.ObjectId)(academicYear);
    if (term) matchQ.term = term;

    const [byLevel, byBoarding] = await Promise.all([
      Registration.aggregate([
        { $match: { ...matchQ, status: 'registered' } },
        { $group: { _id: '$classLevel', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Registration.aggregate([
        { $match: { ...matchQ, status: 'registered' } },
        { $group: { _id: '$boardingStatus', count: { $sum: 1 } } }
      ]),
    ]);

    const total = byLevel.reduce((s, l) => s + l.count, 0);
    res.json({ total, byLevel, byBoarding });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRATION CLEARANCE WORKFLOW (5-Step Clearance Pipeline)
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Execute a clearance step (fee-assessment, materials-check, parent-confirmation, approve-registration)
// @route PATCH /api/registrations/:id/clearance-step
router.patch('/:id/clearance-step', protect, authorize(...ADMIN_ROLES, 'bursar', 'supervisor', 'deputy-head', 'class-teacher'), async (req, res) => {
  const { step, feeStatus, materialsStatus, parentConfirmed, notes } = req.body;

  try {
    const reg = await Registration.findById(req.params.id).populate('student');
    if (!reg) return res.status(404).json({ error: { message: 'Registration not found' } });

    switch (step) {
      case 'fee-assessment':
        if (feeStatus) reg.feeClearanceStatus = feeStatus;
        reg.registrationStage = 'fee_assessed';
        break;

      case 'materials-check':
        if (materialsStatus) reg.materialsCheckStatus = materialsStatus;
        reg.registrationStage = 'materials_checked';
        break;

      case 'parent-confirmation':
        reg.parentConfirmed = parentConfirmed !== undefined ? parentConfirmed : true;
        reg.registrationStage = 'parent_confirmed';
        break;

      case 'approve-registration':
        // Only admin or registrar can do final approval
        if (!ADMIN_ROLES.includes(req.user.role)) {
          return res.status(403).json({ error: { message: 'Only administrators or registrars can approve registration' } });
        }
        reg.status = 'registered';
        reg.registrationStage = 'approved';
        reg.approvedBy = req.user._id;
        reg.approvedAt = new Date();

        // Activate the student in primary student record
        await Student.findByIdAndUpdate(reg.student._id || reg.student, {
          studentStatus: 'active',
          currentClass: reg.class,
          currentClassLevel: reg.classLevel,
          currentStream: reg.streamName || null
        });
        break;

      default:
        return res.status(400).json({ error: { message: 'Invalid clearance step specified' } });
    }

    if (notes) reg.notes = (reg.notes ? reg.notes + ' | ' : '') + notes;
    await reg.save();

    await logAudit(req, {
      action: 'registration.clearance_step',
      module: 'registrations',
      recordId: reg._id,
      recordRef: reg.registrationNumber,
      description: `Registration clearance step '${step}' completed for student ${reg.student?.studentId || reg.student}`,
    });

    res.json({ message: `Clearance step '${step}' recorded`, registration: reg });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get active registered roster (cleared students for attendance, exams, teacher dashboards)
// @route GET /api/registrations/active-roster
router.get('/active-roster', protect, async (req, res) => {
  try {
    const { classId, streamName, term, academicYear } = req.query;
    const query = { status: 'registered' };

    if (classId) query.class = classId;
    if (streamName) query.streamName = streamName;
    if (term) query.term = term;
    if (academicYear) query.academicYear = academicYear;

    const roster = await Registration.find(query)
      .populate('student', 'studentId admissionNumber parentName parentPhone photoUrl gender dob studentStatus')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('class', 'name level')
      .sort({ 'student.studentId': 1 });

    res.json(roster);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
