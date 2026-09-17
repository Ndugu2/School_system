const express = require('express');
const router = express.Router();
const Requirement = require('../models/Requirement');
const StudentRequirement = require('../models/StudentRequirement');
const Registration = require('../models/Registration');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const ADMIN_ROLES = ['super-admin', 'admin', 'registrar'];

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS CONFIGURATION (Admin only)
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Get all configured requirements
// @route GET /api/requirements
router.get('/', protect, async (req, res) => {
  try {
    const { isActive = 'true' } = req.query;
    const query = {};
    if (isActive !== 'all') query.isActive = isActive === 'true';
    const requirements = await Requirement.find(query).sort({ category: 1, name: 1 });
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Create a new requirement
// @route POST /api/requirements
router.post('/', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const req_ = await Requirement.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(req_);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Update a requirement
// @route PUT /api/requirements/:id
router.put('/:id', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const req_ = await Requirement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!req_) return res.status(404).json({ error: { message: 'Requirement not found' } });
    res.json(req_);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Delete (deactivate) a requirement
// @route DELETE /api/requirements/:id
router.delete('/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    await Requirement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Requirement deactivated' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Get a student's requirements for a registration
// @route GET /api/requirements/student/:registrationId
router.get('/student/:registrationId', protect, async (req, res) => {
  try {
    const items = await StudentRequirement.find({ registration: req.params.registrationId })
      .populate('requirement', 'name description category dueDaysAfterRegistration')
      .populate('verifiedBy', 'name')
      .sort({ requirementCategory: 1, requirementName: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Assign requirements to a registration (called after registration created)
// @route POST /api/requirements/assign/:registrationId
router.post('/assign/:registrationId', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) return res.status(404).json({ error: { message: 'Registration not found' } });

    // Find all active requirements that apply to this student
    const allReqs = await Requirement.find({ isActive: true });
    const applicable = allReqs.filter(r => {
      // Class level filter
      if (r.applicableClassLevels.length > 0 && !r.applicableClassLevels.includes(registration.classLevel)) return false;
      // Term filter
      if (r.applicableTerms.length > 0 && !r.applicableTerms.includes(registration.term)) return false;
      // Boarding status filter
      if (r.applicableBoardingStatus !== 'all' && r.applicableBoardingStatus !== registration.boardingStatus) return false;
      return true;
    });

    const created = [];
    const skipped = [];

    for (const req_ of applicable) {
      const exists = await StudentRequirement.findOne({ student: registration.student, registration: registration._id, requirement: req_._id });
      if (exists) { skipped.push(req_.name); continue; }

      const dueDate = new Date(registration.registrationDate);
      dueDate.setDate(dueDate.getDate() + (req_.dueDaysAfterRegistration || 14));

      const sr = await StudentRequirement.create({
        student: registration.student,
        registration: registration._id,
        requirement: req_._id,
        requirementName: req_.name,
        requirementCategory: req_.category,
        isRequired: req_.isRequired,
        dueDate,
        status: 'pending',
      });
      created.push(sr);
    }

    res.status(201).json({ message: `${created.length} requirements assigned, ${skipped.length} skipped`, created, skipped });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Update a student requirement (mark submitted / verified / rejected / waived)
// @route PATCH /api/requirements/student-requirement/:id
router.patch('/student-requirement/:id', protect, authorize(...ADMIN_ROLES, 'supervisor', 'deputy-head', 'class-teacher', 'teacher'), async (req, res) => {
  try {
    const sr = await StudentRequirement.findById(req.params.id);
    if (!sr) return res.status(404).json({ error: { message: 'Student requirement not found' } });

    const { status, notes, waiverReason } = req.body;
    const oldStatus = sr.status;

    if (status) sr.status = status;
    if (notes) sr.notes = notes;

    if (status === 'submitted') sr.submittedDate = new Date();

    if (status === 'verified') {
      sr.verifiedDate = new Date();
      sr.verifiedBy = req.user._id;
    }

    if (status === 'rejected') {
      sr.rejectedDate = new Date();
      sr.rejectedBy = req.user._id;
      sr.rejectionReason = req.body.rejectionReason || 'Item did not meet school specifications';
    }

    if (status === 'waived') {
      sr.waivedBy = req.user._id;
      sr.waiverReason = waiverReason;
    }

    await sr.save();

    // Check if all requirements for this registration are done
    const allForReg = await StudentRequirement.find({ registration: sr.registration });
    const allDone = allForReg.every(r => ['submitted', 'verified', 'waived'].includes(r.status) || !r.isRequired);
    await Registration.findByIdAndUpdate(sr.registration, { 
      allRequirementsSubmitted: allDone,
      materialsCheckStatus: allDone ? 'verified' : 'partial'
    });

    await logAudit(req, {
      action: 'record.updated',
      module: 'registrations',
      recordId: sr._id,
      recordRef: sr.requirementName,
      oldValue: { status: oldStatus },
      newValue: { status: sr.status },
      description: `Requirement "${sr.requirementName}" marked ${sr.status}`,
    });

    res.json(sr);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Get outstanding requirements summary (school-wide)
// @route GET /api/requirements/outstanding
router.get('/outstanding', protect, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const { registrationId } = req.query;
    const query = { status: { $in: ['pending', 'rejected'] }, isRequired: true };
    if (registrationId) query.registration = registrationId;

    const items = await StudentRequirement.find(query)
      .populate('student', 'studentId admissionNumber parentName parentPhone')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('registration', 'classLevel streamName term')
      .sort({ dueDate: 1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Comprehensive Outstanding Requirements Report grouped by student
// @route GET /api/requirements/outstanding-report
router.get('/outstanding-report', protect, authorize(...ADMIN_ROLES, 'class-teacher'), async (req, res) => {
  try {
    const { classLevel, term } = req.query;

    const query = { status: { $in: ['pending', 'rejected'] }, isRequired: true };
    
    const items = await StudentRequirement.find(query)
      .populate({
        path: 'student',
        select: 'studentId admissionNumber parentName parentPhone currentClassLevel currentStream',
        populate: { path: 'user', select: 'name' }
      })
      .populate('registration', 'classLevel streamName term');

    // Group by student
    const studentMap = {};
    items.forEach(item => {
      const studentId = item.student?._id?.toString();
      if (!studentId) return;

      if (classLevel && item.registration?.classLevel !== classLevel) return;
      if (term && item.registration?.term !== term) return;

      if (!studentMap[studentId]) {
        studentMap[studentId] = {
          student: item.student,
          registration: item.registration,
          outstandingCount: 0,
          requirements: []
        };
      }

      studentMap[studentId].outstandingCount++;
      studentMap[studentId].requirements.push({
        _id: item._id,
        name: item.requirementName,
        category: item.requirementCategory,
        status: item.status,
        rejectionReason: item.rejectionReason,
        dueDate: item.dueDate
      });
    });

    const report = Object.values(studentMap);
    res.json({ totalStudentsWithOutstanding: report.length, report });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
