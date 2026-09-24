const express = require('express');
const Permit = require('../models/Permit');
const Student = require('../models/Student');
const Class = require('../models/Class');
const StudentApplication = require('../models/StudentApplication');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// ── 1. GET /api/permits — List Class Permits ─────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { term, academicYear, classLevel, search } = req.query;
    const query = {};
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (classLevel) query.classLevel = classLevel;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { permitNumber: regex },
        { studentName: regex },
        { admissionNumber: regex }
      ];
    }

    const permits = await Permit.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(permits);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── 2. GET /api/permits/:id — Get Single Permit for Print/View ───────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const permit = await Permit.findById(req.params.id)
      .populate({
        path: 'student',
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'currentClass', select: 'name level streams' }
        ]
      })
      .populate('issuedBy', 'name');

    if (!permit) {
      return res.status(404).json({ error: { message: 'Permit not found' } });
    }

    res.json(permit);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── 3. POST /api/permits/issue — Issue or Refresh a Class Entry Permit ───────
router.post('/issue', protect, authorize('super-admin', 'admin', 'headteacher', 'dos', 'teacher'), async (req, res) => {
  try {
    const { studentId, term, academicYear, stream, optionalSubjects } = req.body;

    const student = await Student.findById(studentId).populate('user').populate('currentClass');
    if (!student) {
      return res.status(404).json({ error: { message: 'Student record not found' } });
    }

    const classLevel = student.currentClassLevel || student.currentClass?.level || 'S1';
    const year = academicYear || new Date().getFullYear();
    const activeTerm = term || 'Term 1';

    // Resolve Stream (Default to 'Green' if unassigned, matching Licoka Stream G)
    let assignedStream = stream || student.currentStream || 'Green';

    // Resolve Class Teacher
    let classTeacherName = 'Ms. Kajjubi Annet';
    if (student.currentClass && student.currentClass.classTeacher) {
      const teacherUser = await require('../models/User').findById(student.currentClass.classTeacher);
      if (teacherUser) classTeacherName = teacherUser.name;
    }

    // Default compulsory Ugandan curriculum subjects by level
    const isALevel = ['S5', 'S6'].includes(classLevel);
    const compulsorySubjects = isALevel 
      ? ['General Paper', 'Sub-Mathematics / ICT']
      : ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History & Political Education'];

    // Resolve optional subjects
    let resolvedOptionals = optionalSubjects || [];
    if (resolvedOptionals.length === 0) {
      const app = await StudentApplication.findOne({ admission_number: student.admissionNumber });
      if (app && app.selected_subjects && app.selected_subjects.length > 0) {
        resolvedOptionals = app.selected_subjects;
      } else if (app && app.combination_name) {
        resolvedOptionals = [app.combination_name];
      } else {
        resolvedOptionals = isALevel ? ['Physics', 'Chemistry', 'Mathematics (PCM)'] : ['CRE', 'Agriculture', 'Computer Studies', 'Commerce'];
      }
    }

    let permit = await Permit.findOne({
      student: student._id,
      term: activeTerm,
      academicYear: year
    });

    if (!permit) {
      const permitNumber = await Permit.generatePermitNumber();
      permit = await Permit.create({
        permitNumber,
        student: student._id,
        studentName: student.user ? student.user.name : student.studentId,
        admissionNumber: student.admissionNumber || student.studentId,
        classLevel,
        stream: assignedStream,
        term: activeTerm,
        academicYear: year,
        classTeacherName,
        compulsorySubjects,
        optionalSubjects: resolvedOptionals,
        issuedBy: req.user._id,
        status: 'active'
      });
    } else {
      permit.stream = assignedStream;
      permit.classTeacherName = classTeacherName;
      permit.compulsorySubjects = compulsorySubjects;
      permit.optionalSubjects = resolvedOptionals;
      permit.status = 'active';
      await permit.save();
    }

    res.status(201).json({
      success: true,
      message: `Class Entry Permit ${permit.permitNumber} issued for ${permit.studentName}`,
      permit
    });
  } catch (err) {
    console.error('Error issuing permit:', err);
    res.status(500).json({ error: { message: err.message || 'Server error issuing permit' } });
  }
});

module.exports = router;
