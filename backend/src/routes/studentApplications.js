const express = require('express');
const router = express.Router();
const StudentApplication = require('../models/StudentApplication');
const ALevelCombination = require('../models/ALevelCombination');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

let uploadsDir = path.join(__dirname, '../../uploads/admissions');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (_err) {
  uploadsDir = path.join('/tmp', 'uploads', 'admissions');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E6)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ── 0. PUBLIC: Upload Academic Document (PDF / Scan) ─────────────────────────
router.post('/upload', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }
    const fileUrl = `/uploads/admissions/${req.file.filename}`;
    res.json({
      success: true,
      originalName: req.file.originalname,
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── Public Helper: Generate Application Tracking Reference ───────────────────
const generateReferenceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `NDA-${year}-`;
  const count = await StudentApplication.countDocuments();
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

// ── 1. PUBLIC: Submit Student Application ─────────────────────────────────────
router.post('/apply', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      level,
      class_applying,
      former_school,
      place_of_residence,
      place_of_origin,
      district,
      county,
      sub_county,
      village,
      chronic_disease,
      parent_details,
      combination,
      combination_name,
      selected_subjects,
      ple_pass_slip,
      recommendation_letter,
      uce_pass_slip,
      birth_certificate,
      photo
    } = req.body;

    // Validation
    if (!first_name || !last_name || !date_of_birth || !gender || !level || !class_applying || !former_school) {
      return res.status(400).json({ error: { message: 'Please provide all required student personal and academic details.' } });
    }

    if (!place_of_residence || !place_of_origin || !district || !county || !sub_county || !village) {
      return res.status(400).json({ error: { message: 'Please provide all origin, residence, district, county, sub-county and village details.' } });
    }

    if (!parent_details || !Array.isArray(parent_details) || parent_details.length === 0) {
      return res.status(400).json({ error: { message: 'At least one parent/guardian detail is required.' } });
    }

    // Academic Document Requirements validation:
    // S.1: PLE pass slip
    // S.2 - S.4: PLE pass slip + recommendation letter from former school
    // S.5 - S.6: PLE pass slip + S.4 (UCE) pass slip
    if (!ple_pass_slip) {
      return res.status(400).json({ 
        error: { message: 'Primary Leaving Examination (PLE) pass slip is required for all candidates (S.1 to S.6).' } 
      });
    }

    if (['S2', 'S3', 'S4'].includes(class_applying) && !recommendation_letter) {
      return res.status(400).json({ 
        error: { message: `Applicants for ${class_applying} must upload a recommendation letter from their former school (PDF).` } 
      });
    }

    if (['S5', 'S6'].includes(class_applying) && !uce_pass_slip) {
      return res.status(400).json({ 
        error: { message: `Applicants for ${class_applying} must upload their Senior 4 (UCE) result pass slip (PDF).` } 
      });
    }

    const reference_number = await generateReferenceNumber();

    const application = await StudentApplication.create({
      reference_number,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      date_of_birth: new Date(date_of_birth),
      gender,
      level,
      class_applying,
      former_school: former_school.trim(),
      place_of_residence: place_of_residence.trim(),
      place_of_origin: place_of_origin.trim(),
      district: district.trim(),
      county: county.trim(),
      sub_county: sub_county.trim(),
      village: village.trim(),
      chronic_disease: chronic_disease ? chronic_disease.trim() : 'None',
      parent_details,
      combination: combination || null,
      combination_name: combination_name || '',
      selected_subjects: selected_subjects || [],
      ple_pass_slip: ple_pass_slip || null,
      recommendation_letter: recommendation_letter || null,
      uce_pass_slip: uce_pass_slip || null,
      birth_certificate: birth_certificate || null,
      photo: photo || null,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Admission application received and is pending headteacher/DOS approval.',
      reference_number: application.reference_number,
      application
    });
  } catch (err) {
    console.error('Error submitting student application:', err);
    res.status(500).json({ error: { message: err.message || 'Server error submitting application' } });
  }
});

// ── 2. PUBLIC: Track Application Status ───────────────────────────────────────
router.get('/track/:reference', async (req, res) => {
  try {
    const ref = req.params.reference.trim();
    // Allow lookup by reference_number, admission_number, or parent contact
    const application = await StudentApplication.findOne({
      $or: [
        { reference_number: ref },
        { admission_number: ref },
        { 'parent_details.contact_number': ref }
      ]
    }).select('-__v');

    if (!application) {
      return res.status(404).json({ error: { message: 'No application found with that reference number or phone contact.' } });
    }

    res.json({
      success: true,
      reference_number: application.reference_number,
      applicant_name: `${application.first_name} ${application.last_name}`,
      class_applying: application.class_applying,
      level: application.level,
      status: application.status,
      former_school: application.former_school,
      ple_pass_slip: application.ple_pass_slip || null,
      recommendation_letter: application.recommendation_letter || null,
      uce_pass_slip: application.uce_pass_slip || null,
      admission_number: application.admission_number || null,
      approved_by_name: application.approved_by_name || null,
      decision_date: application.decision_date || null,
      rejection_reason: application.rejection_reason || null,
      created_at: application.created_at
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── 3. PUBLIC / PROTECTED: List A-Level Combinations & Subjects ───────────────
router.get('/meta/options', async (req, res) => {
  try {
    const [combinations, subjects] = await Promise.all([
      ALevelCombination.find().sort({ name: 1 }),
      Subject.find({ isActive: true }).select('name code level isCompulsory department')
    ]);

    // Default combinations if database has none seeded
    const defaultCombinations = [
      { name: 'PCM / ICT', description: 'Physics, Chemistry, Mathematics + ICT + General Paper' },
      { name: 'BCM / Sub-Math', description: 'Biology, Chemistry, Mathematics + Sub-Math + General Paper' },
      { name: 'PCB / Sub-Math', description: 'Physics, Chemistry, Biology + Sub-Math + General Paper' },
      { name: 'HEL / Divinity', description: 'History, Economics, Literature + Divinity + General Paper' },
      { name: 'MEG / Sub-Math', description: 'Mathematics, Economics, Geography + Sub-Math + General Paper' },
      { name: 'HEG / Sub-Math', description: 'History, Economics, Geography + Sub-Math + General Paper' },
      { name: 'DEG / Sub-Math', description: 'Divinity, Economics, Geography + Sub-Math + General Paper' },
      { name: 'PEM / ICT', description: 'Physics, Economics, Mathematics + ICT + General Paper' },
    ];

    const defaultSubjects = [
      { name: 'English Language', code: 'ENG', level: 'O', isCompulsory: true, department: 'Languages' },
      { name: 'Mathematics', code: 'MTH', level: 'O', isCompulsory: true, department: 'Sciences' },
      { name: 'Physics', code: 'PHY', level: 'O', isCompulsory: true, department: 'Sciences' },
      { name: 'Chemistry', code: 'CHM', level: 'O', isCompulsory: true, department: 'Sciences' },
      { name: 'Biology', code: 'BIO', level: 'O', isCompulsory: true, department: 'Sciences' },
      { name: 'Geography', code: 'GEO', level: 'O', isCompulsory: true, department: 'Humanities' },
      { name: 'History & Political Education', code: 'HIS', level: 'O', isCompulsory: true, department: 'Humanities' },
      { name: 'Christian Religious Education', code: 'CRE', level: 'O', isCompulsory: false, department: 'Humanities' },
      { name: 'Islamic Religious Education', code: 'IRE', level: 'O', isCompulsory: false, department: 'Humanities' },
      { name: 'Information & Comm. Technology', code: 'ICT', level: 'O', isCompulsory: false, department: 'Technical' },
      { name: 'Agriculture', code: 'AGR', level: 'O', isCompulsory: false, department: 'Sciences' },
      { name: 'Entrepreneurship', code: 'ENT', level: 'O', isCompulsory: false, department: 'Business' },
      { name: 'Literature in English', code: 'LIT', level: 'O', isCompulsory: false, department: 'Languages' },
      { name: 'Kiswahili', code: 'KIS', level: 'O', isCompulsory: false, department: 'Languages' },
      { name: 'Fine Art', code: 'ART', level: 'O', isCompulsory: false, department: 'Technical' }
    ];

    res.json({
      combinations: combinations.length > 0 ? combinations : defaultCombinations,
      subjects: (subjects && subjects.length > 0) ? subjects : defaultSubjects
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── 4. PROTECTED: Get All Applications (Admin / DOS / Headteacher) ────────────
router.get('/', protect, authorize('super-admin', 'admin', 'headteacher', 'dos', 'teacher', 'registrar'), async (req, res) => {
  try {
    const { status, level, class_applying, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (level && level !== 'all') {
      query.level = level;
    }
    if (class_applying && class_applying !== 'all') {
      query.class_applying = class_applying;
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { first_name: regex },
        { last_name: regex },
        { reference_number: regex },
        { admission_number: regex },
        { district: regex },
        { former_school: regex },
        { 'parent_details.parent_first_name': regex },
        { 'parent_details.parent_last_name': regex },
        { 'parent_details.contact_number': regex },
      ];
    }

    const applications = await StudentApplication.find(query)
      .populate('combination', 'name description')
      .populate('approved_by', 'name role')
      .populate('rejected_by', 'name role')
      .sort({ created_at: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── 5. PROTECTED: Get Summary Stats ──────────────────────────────────────────
router.get('/stats', protect, authorize('super-admin', 'admin', 'headteacher', 'dos', 'registrar'), async (req, res) => {
  try {
    const [total, pending, approved, rejected, oLevel, aLevel] = await Promise.all([
      StudentApplication.countDocuments(),
      StudentApplication.countDocuments({ status: 'pending' }),
      StudentApplication.countDocuments({ status: 'approved' }),
      StudentApplication.countDocuments({ status: 'rejected' }),
      StudentApplication.countDocuments({ level: 'O' }),
      StudentApplication.countDocuments({ level: 'A' }),
    ]);

    res.json({
      total,
      pending,
      approved,
      rejected,
      oLevel,
      aLevel
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── 6. PROTECTED: Get Single Application By ID ───────────────────────────────
router.get('/:id', protect, authorize('super-admin', 'admin', 'headteacher', 'dos', 'teacher', 'registrar'), async (req, res) => {
  try {
    const application = await StudentApplication.findById(req.params.id)
      .populate('combination', 'name description')
      .populate('approved_by', 'name role')
      .populate('rejected_by', 'name role');

    if (!application) {
      return res.status(404).json({ error: { message: 'Application not found' } });
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── 7. PROTECTED: Approve Application & Issue Admission Number ───────────────
router.put('/:id/approve', protect, authorize('super-admin', 'admin', 'headteacher', 'dos'), async (req, res) => {
  try {
    const application = await StudentApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: { message: 'Application not found' } });
    }

    if (application.status === 'approved') {
      return res.status(400).json({ 
        error: { message: `Application is already approved with admission number ${application.admission_number}` } 
      });
    }

    // 1. Generate sequential admission number (e.g. LCK-00001)
    const admission_number = await StudentApplication.generateAdmissionNumber();

    // 2. Set approval fields
    application.status = 'approved';
    application.admission_number = admission_number;
    application.approved_by = req.user._id;
    application.approved_by_name = req.user.name || 'Headteacher / DOS';
    application.decision_date = new Date();
    application.rejection_reason = null;

    // 3. Attempt to auto-provision Student / User record if class can be resolved
    try {
      const primaryParent = (application.parent_details && application.parent_details[0]) || {};
      const studentUsername = `${application.first_name.toLowerCase()}.${application.last_name.toLowerCase()}.${Math.floor(100 + Math.random() * 900)}`;
      const studentEmail = primaryParent.email || `${studentUsername}@ndugu.ac.ug`;

      // Check if user already exists
      let studentUser = await User.findOne({ email: studentEmail });
      if (!studentUser) {
        studentUser = await User.create({
          name: `${application.first_name} ${application.last_name}`,
          email: studentEmail,
          password: 'StudentPass2026!',
          role: 'student'
        });
      }

      // Check if student record exists with this admission number
      let studentRecord = await Student.findOne({ admissionNumber: admission_number });
      if (!studentRecord) {
        // Find matching Class if available (e.g. S1 Main, S5 Sciences)
        const targetClass = await Class.findOne({ level: application.class_applying });

        studentRecord = await Student.create({
          user: studentUser._id,
          studentId: `STU-${new Date().getFullYear()}-${admission_number.replace('LCK-', '')}`,
          admissionNumber: admission_number,
          studentStatus: 'admitted',
          currentClass: targetClass ? targetClass._id : null,
          currentClassLevel: application.class_applying,
          dob: application.date_of_birth,
          gender: application.gender === 'M' ? 'Male' : 'Female',
          nationality: 'Ugandan',
          parentName: `${primaryParent.parent_first_name || ''} ${primaryParent.parent_last_name || ''}`.trim() || 'Parent',
          parentPhone: primaryParent.contact_number || '+256 700 000000',
          parentEmail: primaryParent.email || ''
        });

        application.enrolled_student = studentRecord._id;
      }
    } catch (provisionErr) {
      console.warn('Note: Could not automatically provision student record, but application approved successfully:', provisionErr.message);
    }

    await application.save();

    res.json({
      success: true,
      message: `Application approved successfully. Issued Admission Number: ${admission_number}`,
      admission_number,
      application
    });
  } catch (err) {
    console.error('Error approving application:', err);
    res.status(500).json({ error: { message: err.message || 'Server error approving application' } });
  }
});

// ── 8. PROTECTED: Reject Application ─────────────────────────────────────────
router.put('/:id/reject', protect, authorize('super-admin', 'admin', 'headteacher', 'dos'), async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await StudentApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: { message: 'Application not found' } });
    }

    application.status = 'rejected';
    application.rejected_by = req.user._id;
    application.rejected_by_name = req.user.name || 'Headteacher / DOS';
    application.rejection_reason = reason || 'Does not meet academic or interview criteria for 2026 intake';
    application.decision_date = new Date();

    await application.save();

    res.json({
      success: true,
      message: 'Application marked as rejected.',
      application
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message || 'Server error rejecting application' } });
  }
});

module.exports = router;
