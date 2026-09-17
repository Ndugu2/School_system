const express = require('express');
const router = express.Router();
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const Registration = require('../models/Registration');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const ADMIN_ROLES = ['super-admin', 'admin', 'registrar'];

// ═══════════════════════════════════════════════════════════════════════════════
// ACADEMIC YEARS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Get all academic years
// @route GET /api/academic-years
router.get('/', protect, async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ year: -1 });
    res.json(years);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get active academic year (with active term)
// @route GET /api/academic-years/active
router.get('/active', protect, async (req, res) => {
  try {
    const active = await AcademicYear.findOne({ isActive: true });
    if (!active) return res.status(404).json({ error: { message: 'No active academic year configured' } });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get a single academic year
// @route GET /api/academic-years/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ error: { message: 'Academic year not found' } });
    res.json(year);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Create a new academic year
// @route POST /api/academic-years
router.post('/', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  const { year, label, terms, notes } = req.body;
  try {
    const existing = await AcademicYear.findOne({ year });
    if (existing) {
      return res.status(400).json({ error: { message: `Academic year ${year} already exists` } });
    }

    const academicYear = await AcademicYear.create({
      year,
      label: label || String(year),
      terms: terms || [
        { name: 'Term 1', isActive: false, isCurrent: false },
        { name: 'Term 2', isActive: false, isCurrent: false },
        { name: 'Term 3', isActive: false, isCurrent: false },
      ],
      notes,
      createdBy: req.user._id,
    });

    await logAudit(req, {
      action: 'academic-year.created',
      module: 'academic-years',
      recordId: academicYear._id,
      recordRef: String(year),
      description: `Academic year ${year} created`,
    });

    res.status(201).json(academicYear);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Update academic year details / term dates
// @route PUT /api/academic-years/:id
router.put('/:id', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!year) return res.status(404).json({ error: { message: 'Academic year not found' } });
    res.json(year);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Activate an academic year (deactivates all others)
// @route PATCH /api/academic-years/:id/activate
router.patch('/:id/activate', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    // Deactivate all
    await AcademicYear.updateMany({}, { $set: { isActive: false } });
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!year) return res.status(404).json({ error: { message: 'Academic year not found' } });

    await logAudit(req, {
      action: 'academic-year.activated',
      module: 'academic-years',
      recordId: year._id,
      recordRef: String(year.year),
      description: `Academic year ${year.year} set as active`,
    });

    res.json({ message: `Academic year ${year.year} is now active`, year });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Set a specific term as the current term
// @route PATCH /api/academic-years/:id/terms/:termName/activate
router.patch('/:id/terms/:termName/activate', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ error: { message: 'Academic year not found' } });

    const termName = decodeURIComponent(req.params.termName);
    year.terms.forEach(t => {
      t.isCurrent = (t.name === termName);
    });

    await year.save();

    await logAudit(req, {
      action: 'term.activated',
      module: 'academic-years',
      recordId: year._id,
      recordRef: `${year.year} - ${termName}`,
      description: `${termName} set as current term for ${year.year}`,
    });

    res.json({ message: `${termName} is now the current term`, year });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BULK PROMOTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc  Promote all registered students from one class level to the next
 *        for a new academic year + term.
 *
 * Example: Promote all S2 students → S3 for 2027 Term 1
 *
 * @route POST /api/academic-years/:id/promote
 * @body  {
 *           fromLevel: 'S2',
 *           toLevel: 'S3',
 *           toClass: '<classId>',     // target Class doc for toLevel in new year
 *           toStream: '<streamId>',   // optional; set later by registrar
 *           term: 'Term 1',
 *           fromAcademicYear: '<yearId>'  // the year students are currently in
 *        }
 */
router.post('/:id/promote', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  const { fromLevel, toLevel, toClass, toStream, toStreamName, term, fromAcademicYear } = req.body;

  try {
    const toAcademicYear = await AcademicYear.findById(req.params.id);
    if (!toAcademicYear) return res.status(404).json({ error: { message: 'Target academic year not found' } });

    // Find all active registrations in the source year+level
    const sourceRegistrations = await Registration.find({
      academicYear: fromAcademicYear,
      classLevel: fromLevel,
      status: 'registered'
    }).populate('student');

    if (sourceRegistrations.length === 0) {
      return res.status(404).json({ error: { message: `No registered students found in ${fromLevel} for the source year` } });
    }

    const results = { promoted: 0, skipped: 0, errors: [] };

    for (const reg of sourceRegistrations) {
      try {
        // Check if student is already registered in the new year+term
        const exists = await Registration.findOne({
          student: reg.student._id,
          academicYear: toAcademicYear._id,
          term
        });
        if (exists) { results.skipped++; continue; }

        // Generate registration number
        const regNumber = await generateRegNumber(toAcademicYear.year, term);

        await Registration.create({
          student: reg.student._id,
          academicYear: toAcademicYear._id,
          term,
          class: toClass,
          streamId: toStream || null,
          streamName: toStreamName || null,
          classLevel: toLevel,
          boardingStatus: reg.boardingStatus,
          previousClass: fromLevel,
          subjectCombination: reg.subjectCombination,
          subjects: reg.subjects,
          status: 'registered',
          registrationNumber: regNumber,
          registeredBy: req.user._id,
        });

        // Update student snapshot
        await Student.findByIdAndUpdate(reg.student._id, {
          studentStatus: 'active',
          currentClass: toClass,
          currentClassLevel: toLevel,
          currentStream: toStreamName || null
        });

        results.promoted++;
      } catch (e) {
        results.errors.push({ studentId: reg.student?.studentId, error: e.message });
      }
    }

    await logAudit(req, {
      action: 'student.promoted',
      module: 'registrations',
      recordId: toAcademicYear._id,
      recordRef: `${fromLevel}→${toLevel}`,
      description: `Bulk promotion: ${results.promoted} students promoted from ${fromLevel} to ${toLevel} for ${toAcademicYear.year} ${term}`,
    });

    res.json({
      message: `Promotion complete: ${results.promoted} promoted, ${results.skipped} skipped`,
      results
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateRegNumber = async (year, term) => {
  const termCode = term === 'Term 1' ? 'T1' : term === 'Term 2' ? 'T2' : 'T3';
  const prefix = `REG-${year}-${termCode}-`;
  const last = await Registration.findOne({
    registrationNumber: new RegExp('^' + prefix)
  }).sort({ registrationNumber: -1 });
  const seq = last ? parseInt(last.registrationNumber.split('-')[3]) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

module.exports = router;
