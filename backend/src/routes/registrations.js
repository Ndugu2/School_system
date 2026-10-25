const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Registration = require('../models/Registration');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const FeeAccount = require('../models/FeeAccount');
const Invoice = require('../modules/finance/models/Invoice');
const { REGISTRATION_FEE_THRESHOLD } = require('../config/registration');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const ADMIN_ROLES = ['super-admin', 'admin', 'registrar'];

// Terms are stored in the database as "Term I/II/III" but Registrations and
// invoices use "Term 1/2/3". Normalise at every boundary.
const normalizeTerm = (value) => {
  if (!value) return null;
  const key = String(value).trim().toUpperCase().replace(/\s+/g, ' ');
  const aliases = {
    'TERM 1': 'Term 1', 'TERM I': 'Term 1', 'TERM ONE': 'Term 1', '1': 'Term 1',
    'TERM 2': 'Term 2', 'TERM II': 'Term 2', 'TERM TWO': 'Term 2', '2': 'Term 2',
    'TERM 3': 'Term 3', 'TERM III': 'Term 3', 'TERM THREE': 'Term 3', '3': 'Term 3'
  };
  return aliases[key] || null;
};

const resolveAcademicYear = async (academicYearId) => {
  if (academicYearId) {
    if (mongoose.Types.ObjectId.isValid(academicYearId)) {
      const byId = await AcademicYear.findById(academicYearId);
      if (byId) return byId;
    }
    if (!Number.isNaN(Number(academicYearId))) {
      const byYear = await AcademicYear.findOne({ year: Number(academicYearId) });
      if (byYear) return byYear;
    }
    return null;
  }

  return (await AcademicYear.findOne({ isActive: true }))
    || (await AcademicYear.findOne().sort({ year: -1 }));
};

const resolveTerm = (yearDoc, requestedTerm) => {
  const normalized = normalizeTerm(requestedTerm);
  if (normalized) return normalized;

  const active = yearDoc?.terms?.find(t => t.isCurrent)
    || yearDoc?.terms?.find(t => t.isActive)
    || yearDoc?.terms?.[0];

  return normalizeTerm(active?.name) || 'Term 1';
};

/**
 * Returns the fee position for one or more students for a given year + term.
 * The modern finance module (Invoice) is authoritative. If an older student
 * only has a legacy FeeAccount, its posted ledger totals are used instead.
 */
const getFeePositions = async (studentIds, academicYear, term) => {
  const ids = studentIds.map(id => String(id));
  const positions = new Map();

  ids.forEach(id => positions.set(id, {
    billed: 0,
    paid: 0,
    balance: 0,
    ratio: 0,
    percent: 0,
    invoiceCount: 0,
    source: 'none',
    eligible: false
  }));

  if (ids.length === 0) return positions;

  const [invoices, accounts] = await Promise.all([
    Invoice.find({ student: { $in: ids }, academicYear, term })
      .select('student totalAmount paidAmount'),
    FeeAccount.find({ student: { $in: ids }, academicYear, term })
      .select('student totalFees totalPaid')
  ]);

  const invoiceTotals = new Map();
  invoices.forEach(inv => {
    const key = String(inv.student);
    const current = invoiceTotals.get(key) || { billed: 0, paid: 0, count: 0 };
    current.billed += Number(inv.totalAmount) || 0;
    current.paid += Number(inv.paidAmount) || 0;
    current.count += 1;
    invoiceTotals.set(key, current);
  });

  const accountTotals = new Map();
  accounts.forEach(acc => {
    accountTotals.set(String(acc.student), {
      billed: Number(acc.totalFees) || 0,
      paid: Number(acc.totalPaid) || 0
    });
  });

  ids.forEach(id => {
    const invoice = invoiceTotals.get(id);
    const account = accountTotals.get(id);

    let billed = 0;
    let paid = 0;
    let invoiceCount = 0;
    let source = 'none';

    if (invoice && invoice.billed > 0) {
      billed = invoice.billed;
      paid = invoice.paid;
      invoiceCount = invoice.count;
      source = 'invoice';
    } else if (account && account.billed > 0) {
      billed = account.billed;
      paid = account.paid;
      source = 'fee-account';
    }

    const ratio = billed > 0 ? paid / billed : 0;

    positions.set(id, {
      billed,
      paid,
      balance: Math.max(0, billed - paid),
      ratio,
      percent: Math.round(ratio * 1000) / 10,
      invoiceCount,
      source,
      eligible: billed > 0 && ratio >= REGISTRATION_FEE_THRESHOLD
    });
  });

  return positions;
};

const getFeePosition = async (studentId, academicYear, term) => {
  const positions = await getFeePositions([studentId], academicYear, term);
  return positions.get(String(studentId));
};

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

// @desc  Fee-cleared registration queue for the DOS / Registrar
// @route GET /api/registrations/eligibility?academicYearId=&term=
router.get(
  '/eligibility',
  protect,
  authorize(...ADMIN_ROLES, 'director-of-studies', 'deputy-head', 'bursar'),
  async (req, res) => {
    try {
      const academicYear = await resolveAcademicYear(req.query.academicYearId || req.query.academicYear);
      if (!academicYear) {
        return res.status(404).json({ error: { message: 'No academic year configured' } });
      }

      const term = resolveTerm(academicYear, req.query.term);

      const students = await Student.find({
        studentStatus: { $in: ['admitted', 'enrolled', 'active'] }
      })
        .select('studentId admissionNumber studentStatus currentClass currentClassLevel currentStream user')
        .populate('user', 'name email')
        .populate('currentClass', 'name level')
        .sort({ createdAt: -1 });

      const studentIds = students.map(s => s._id);

      const [feePositions, registrations] = await Promise.all([
        getFeePositions(studentIds, academicYear.year, term),
        Registration.find({
          student: { $in: studentIds },
          academicYear: academicYear._id,
          term,
          status: { $ne: 'cancelled' }
        })
          .select('student registrationNumber status registrationStage class streamName')
          .populate('class', 'name level')
      ]);

      const registrationByStudent = new Map();
      registrations.forEach(reg => {
        registrationByStudent.set(String(reg.student), {
          _id: reg._id,
          registrationNumber: reg.registrationNumber,
          status: reg.status,
          stage: reg.registrationStage,
          className: reg.class?.name || null,
          classLevel: reg.class?.level || null,
          streamName: reg.streamName || null
        });
      });

      const rows = students.map(student => {
        const fee = feePositions.get(String(student._id));
        const registration = registrationByStudent.get(String(student._id)) || null;

        let status = 'awaiting_fees';
        if (registration) status = 'registered';
        else if (fee.eligible) status = 'eligible';
        else if (fee.billed === 0) status = 'no_invoice';

        return {
          studentId: student._id,
          name: student.user?.name || 'Unnamed Student',
          studentNumber: student.studentId,
          admissionNumber: student.admissionNumber,
          studentStatus: student.studentStatus,
          level: student.currentClassLevel || student.currentClass?.level || null,
          currentClass: student.currentClass
            ? { _id: student.currentClass._id, name: student.currentClass.name, level: student.currentClass.level }
            : null,
          currentStream: student.currentStream || null,
          fee: {
            billed: fee.billed,
            paid: fee.paid,
            balance: fee.balance,
            percent: fee.percent,
            source: fee.source,
            invoiceCount: fee.invoiceCount,
            eligible: fee.eligible
          },
          registration,
          status
        };
      });

      // Pending (eligible first), then registered, then fee-blocked.
      const rank = { eligible: 0, awaiting_fees: 1, no_invoice: 2, registered: 3 };
      rows.sort((a, b) => {
        const diff = rank[a.status] - rank[b.status];
        if (diff !== 0) return diff;
        return String(a.name).localeCompare(String(b.name));
      });

      const pending = rows.filter(r => r.status !== 'registered');
      const stats = {
        total: rows.length,
        eligible: pending.filter(r => r.status === 'eligible').length,
        awaitingFees: pending.filter(r => r.status === 'awaiting_fees').length,
        noInvoice: pending.filter(r => r.status === 'no_invoice').length,
        registered: rows.filter(r => r.status === 'registered').length
      };

      res.json({
        academicYear: { _id: academicYear._id, year: academicYear.year, label: academicYear.label },
        term,
        threshold: REGISTRATION_FEE_THRESHOLD,
        thresholdPercent: Math.round(REGISTRATION_FEE_THRESHOLD * 100),
        stats,
        students: rows
      });
    } catch (err) {
      res.status(500).json({ error: { message: err.message } });
    }
  }
);

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
router.post('/', protect, authorize(...ADMIN_ROLES, 'director-of-studies', 'deputy-head'), async (req, res) => {
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
    activate
  } = req.body;

  try {
    // Validate academic year first (needed for the fee clearance check)
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) return res.status(404).json({ error: { message: 'Academic year not found' } });

    const normalizedTerm = normalizeTerm(term);
    if (!normalizedTerm) {
      return res.status(400).json({ error: { message: 'Term must be Term 1, Term 2 or Term 3' } });
    }

    // Check for duplicate registration
    const existing = await Registration.findOne({
      student: studentId,
      academicYear: academicYearId,
      term: normalizedTerm,
      status: { $ne: 'cancelled' }
    });
    if (existing) {
      return res.status(400).json({
        error: { message: `Student is already registered for ${normalizedTerm} in this academic year` }
      });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });

    // ── Fee clearance gate ────────────────────────────────────────────────────
    // The student must have paid the configured share (default 50%) of the
    // term's invoiced fees before the DOS can register them for the term.
    const fee = await getFeePosition(studentId, academicYear.year, normalizedTerm);
    if (!fee.eligible) {
      const reason = fee.billed === 0
        ? 'No fee invoice has been raised for this term yet. Ask the Bursar to raise the invoice and record a payment.'
        : `Only ${fee.percent}% of the term fees have been paid. At least ${Math.round(REGISTRATION_FEE_THRESHOLD * 100)}% is required before registration.`;
      return res.status(403).json({
        error: {
          message: `Registration blocked: ${reason}`,
          code: 'FEE_CLEARANCE_REQUIRED',
          feeStatus: fee
        }
      });
    }

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ error: { message: 'Class not found' } });

    // Validate stream if provided
    let resolvedStreamName = streamName || null;
    if (streamId) {
      const stream = cls.streams.id(streamId);
      if (!stream) return res.status(404).json({ error: { message: 'Stream not found in this class' } });
      resolvedStreamName = stream.name;
    }

    const isActivation = activate === true;
    const registrationNumber = await generateRegNumber(academicYear.year, normalizedTerm);

    const registration = await Registration.create({
      student: studentId,
      academicYear: academicYearId,
      term: normalizedTerm,
      class: classId,
      streamId: streamId || null,
      streamName: resolvedStreamName,
      classLevel: cls.level,
      boardingStatus: boardingStatus || 'day',
      subjectCombination,
      subjects: subjects || [],
      status: isActivation ? 'registered' : 'enrolled',
      registrationStage: isActivation ? 'approved' : 'enrolled',
      feeClearanceStatus: fee.ratio >= 1 ? 'cleared' : 'partial',
      approvedBy: isActivation ? req.user._id : undefined,
      approvedAt: isActivation ? new Date() : undefined,
      registrationNumber,
      notes,
      registeredBy: req.user._id,
    });

    // Update student's current class snapshot. A DOS registration activates the
    // student immediately; a draft enrolment stays in the 'enrolled' state.
    await Student.findByIdAndUpdate(studentId, {
      studentStatus: isActivation ? 'active' : 'enrolled',
      currentClass: classId,
      currentClassLevel: cls.level,
      currentStream: resolvedStreamName
    });

    await logAudit(req, {
      action: 'registration.created',
      module: 'registrations',
      recordId: registration._id,
      recordRef: registration.registrationNumber,
      description: `Student registered for ${academicYear.year} ${normalizedTerm} — ${cls.level} ${resolvedStreamName || ''} (${fee.percent}% fees paid)`,
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
        if (reg.feeClearanceStatus !== 'cleared') {
          return res.status(400).json({ error: { message: 'Fee assessment must be cleared before approval' } });
        }
        if (reg.materialsCheckStatus !== 'verified') {
          return res.status(400).json({ error: { message: 'Required materials must be verified before approval' } });
        }
        if (!reg.parentConfirmed) {
          return res.status(400).json({ error: { message: 'Guardian confirmation is required before approval' } });
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
