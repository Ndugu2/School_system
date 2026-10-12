const express = require('express');
const router = express.Router();
const { MIN_ACCOUNT_PASSWORD_LENGTH, isAcceptableAccountPassword } = require('../../../utils/passwordPolicy');
const Enquiry = require('../models/Enquiry');
const Application = require('../models/Application');
const Student = require('../../../models/Student');
const User = require('../../../models/User');
const Class = require('../../../models/Class');
const AcademicYear = require('../../../models/AcademicYear');
const Registration = require('../../../models/Registration');
const { protect, authorize } = require('../../../middleware/auth');
const { generateRegistrationNumber } = require('../../../utils/registrationNumber');
const { logAudit } = require('../../../middleware/auditLog');

const normalizeClassLevel = value => {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^(?:S|SENIOR)([1-6])$/);
  return match ? `S${match[1]}` : normalized;
};

// ── Helper: auto-generate application number ────────────────────────────────
const generateAppNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}-`;
  const last = await Application.findOne({ applicationNumber: new RegExp(`^${prefix}`) }).sort({ applicationNumber: -1 });
  const seq = last ? parseInt(last.applicationNumber.split('-')[2]) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// ENQUIRIES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/enquiries', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const enquiries = await Enquiry.find(query).populate('loggedBy', 'name').sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/enquiries', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  try {
    const enquiry = await Enquiry.create({ ...req.body, loggedBy: req.user._id });
    res.status(201).json(enquiry);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/enquiries/:id', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!enquiry) return res.status(404).json({ error: { message: 'Enquiry not found' } });
    res.json(enquiry);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// Convert enquiry → application
router.post('/enquiries/:id/convert', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ error: { message: 'Enquiry not found' } });

    const applicationNumber = await generateAppNumber();
    const application = await Application.create({
      enquiry: enquiry._id,
      applicationNumber,
      childName: enquiry.childName,
      childDob: enquiry.childDob,
      childGender: enquiry.childGender || 'Male',
      applyingForClass: enquiry.applyingForClass,
      applyingForTerm: enquiry.preferredStartTerm || 'Term 1',
      applyingForYear: enquiry.preferredStartYear || new Date().getFullYear(),
      parentName: enquiry.parentName,
      parentPhone: enquiry.parentPhone,
      parentEmail: enquiry.parentEmail,
      submittedBy: req.user._id,
      ...req.body,
    });

    await Enquiry.findByIdAndUpdate(enquiry._id, {
      status: 'converted-to-application',
      convertedToApplicationId: application._id,
    });

    res.status(201).json(application);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/applications', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  try {
    const { status, applyingForYear, applyingForClass } = req.query;
    const query = {};
    if (status) query.status = status;
    if (applyingForYear) query.applyingForYear = parseInt(applyingForYear);
    if (applyingForClass) query.applyingForClass = applyingForClass;

    const applications = await Application.find(query)
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/applications', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  try {
    const applicationNumber = await generateAppNumber();
    const application = await Application.create({
      ...req.body,
      applicationNumber,
      applyingForYear: parseInt(req.body.applyingForYear),
      submittedBy: req.user._id,
    });
    res.status(201).json(application);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/admissions/applications/:id/status — move pipeline stage
router.put('/applications/:id/status', protect, authorize('super-admin', 'admin', 'registrar'), async (req, res) => {
  const { status, decisionNotes, interviewDate, rejectionReason, interviewNotes } = req.body;
  try {
    const update = {
      status,
      reviewedBy: req.user._id,
      reviewerName: req.user.name,
    };
    if (decisionNotes) update.decisionNotes = decisionNotes;
    if (interviewDate) update.interviewDate = new Date(interviewDate);
    if (rejectionReason) update.rejectionReason = rejectionReason;
    if (interviewNotes) update.interviewNotes = interviewNotes;
    if (['accepted', 'rejected', 'waitlisted'].includes(status)) update.decisionDate = new Date();

    const application = await Application.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!application) return res.status(404).json({ error: { message: 'Application not found' } });
    res.json(application);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// POST /api/admissions/applications/:id/enroll — convert accepted → Student record
router.post('/applications/:id/enroll', protect, authorize('super-admin', 'admin'), async (req, res) => {
  const { classId, streamId, studentId: customStudentId, password } = req.body;
  if (!classId) return res.status(400).json({ error: { message: 'A class must be selected for enrolment' } });
  if (!isAcceptableAccountPassword(password)) {
    return res.status(400).json({ error: { message: `Set an account password of at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters` } });
  }
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ error: { message: 'Application not found' } });
    if (application.status !== 'accepted') {
      return res.status(400).json({ error: { message: 'Only accepted applications can be enrolled' } });
    }
    if (application.enrolledStudentId) {
      return res.status(400).json({ error: { message: 'Application has already been enrolled' } });
    }

    const [targetClass, academicYear] = await Promise.all([
      Class.findById(classId),
      AcademicYear.findOne({ year: application.applyingForYear }),
    ]);
    if (!targetClass) return res.status(404).json({ error: { message: 'Class not found' } });
    if (targetClass.level !== normalizeClassLevel(application.applyingForClass)) {
      return res.status(400).json({ error: { message: 'Selected class does not match the class requested in the application' } });
    }
    if (!academicYear) {
      return res.status(400).json({ error: { message: `Academic year ${application.applyingForYear} must be configured before enrolment` } });
    }
    if (!academicYear.terms.some(term => term.name === application.applyingForTerm)) {
      return res.status(400).json({ error: { message: `${application.applyingForTerm} is not configured for academic year ${application.applyingForYear}` } });
    }

    const stream = streamId ? targetClass.streams.id(streamId) : null;
    if (streamId && !stream) {
      return res.status(404).json({ error: { message: 'Stream not found in the selected class' } });
    }
    const registrationNumber = await generateRegistrationNumber(academicYear.year, application.applyingForTerm);

    // Parent email belongs to the guardian, not the student's unique login.
    const userRecord = await User.create({
      name: application.childName,
      email: `student.${application.applicationNumber.toLowerCase().replace(/-/g, '')}@school.local`,
      password,
      role: 'student',
    });

    // Count existing students for auto ID
    const studentCount = await Student.countDocuments();
    const studentIdCode = customStudentId || `STU-${new Date().getFullYear()}-${String(studentCount + 1).padStart(4, '0')}`;

    const student = await Student.create({
      user: userRecord._id,
      studentId: studentIdCode,
      admissionNumber: studentIdCode,
      studentStatus: 'enrolled',
      currentClass: targetClass._id,
      currentClassLevel: targetClass.level,
      currentStream: stream?.name || null,
      dob: application.childDob,
      gender: application.childGender,
      enrollmentDate: new Date(),
      parentName: application.parentName,
      parentPhone: application.parentPhone,
      parentEmail: application.parentEmail,
      parentRelationship: application.parentRelationship || 'Guardian',
      guardians: [
        {
          name: application.parentName,
          relationship: application.parentRelationship || 'Guardian',
          phone: application.parentPhone,
          email: application.parentEmail,
          isPrimary: true,
        },
        ...(application.secondParentName ? [{
          name: application.secondParentName,
          relationship: application.secondParentRelationship || 'Guardian',
          phone: application.secondParentPhone,
          isPrimary: false,
        }] : []),
      ],
    });

    const registration = await Registration.create({
      student: student._id,
      academicYear: academicYear._id,
      term: application.applyingForTerm,
      class: targetClass._id,
      streamId: stream?._id || null,
      streamName: stream?.name || null,
      classLevel: targetClass.level,
      status: 'enrolled',
      registrationNumber,
      registeredBy: req.user._id,
    });

    await Application.findByIdAndUpdate(req.params.id, {
      status: 'enrolled',
      enrolledStudentId: student._id,
    });
    await logAudit(req, {
      action: 'registration.created',
      module: 'registrations',
      recordId: registration._id,
      recordRef: registration.registrationNumber,
      description: `Application ${application.applicationNumber} enrolled as student ${student.studentId}`,
    });

    res.status(201).json({
      message: 'Student enrolled successfully',
      student,
    });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/stats', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const [enquiryCount, appByStatus, recentEnquiries] = await Promise.all([
      Enquiry.countDocuments({ createdAt: { $gte: new Date(year, 0, 1) } }),
      Application.aggregate([
        { $match: { applyingForYear: year } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Enquiry.find({ status: 'new' }).sort({ createdAt: -1 }).limit(5),
    ]);
    res.json({ enquiryCount, appByStatus, recentEnquiries });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
