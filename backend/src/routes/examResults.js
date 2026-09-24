const express = require('express');
const router = express.Router();
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');
const { teacherAssignments, canAccessStudent } = require('../middleware/recordAccess');

const ENTRY_ROLES = ['super-admin', 'admin', 'academic-admin', 'teacher', 'class-teacher'];
const APPROVAL_ROLES = ['super-admin', 'admin', 'academic-admin', 'hod'];

const validateTeacherAssignments = async (user, results) => {
  if (!['teacher', 'class-teacher'].includes(user.role)) return null;
  const { classIds, subjectIds } = await teacherAssignments(user._id);
  for (const result of results) {
    if (!classIds.includes(String(result.class)) || !subjectIds.includes(String(result.subject))) {
      return 'You may only enter results for your assigned classes and subjects';
    }
    const student = await Student.findById(result.student).select('currentClass');
    if (!student || String(student.currentClass) !== String(result.class)) {
      return 'Each result must belong to a student in the selected class';
    }
  }
  return null;
};

// ─── Uganda Grading Helper ─────────────────────────────────────────────────────
const getGrade = (percentage) => {
  if (percentage >= 80) return { grade: 'D1', points: 1 };
  if (percentage >= 70) return { grade: 'D2', points: 2 };
  if (percentage >= 65) return { grade: 'C3', points: 3 };
  if (percentage >= 60) return { grade: 'C4', points: 4 };
  if (percentage >= 55) return { grade: 'C5', points: 5 };
  if (percentage >= 50) return { grade: 'C6', points: 6 };
  if (percentage >= 45) return { grade: 'P7', points: 7 };
  if (percentage >= 40) return { grade: 'P8', points: 8 };
  return { grade: 'F9', points: 9 };
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Get results with filters
// @route GET /api/exam-results
router.get('/', protect, authorize('admin', 'super-admin', 'hod', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  try {
    const { student, class: classId, subject, term, academicYear, examType, approvalStatus, page = 1, limit = 100 } = req.query;

    const query = {};
    if (student) query.student = student;
    if (classId) query.class = classId;
    if (subject) query.subject = subject;
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (examType) query.examType = examType;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    // Students and parents can only see published results
    if (['student', 'parent'].includes(req.user.role)) {
      query.approvalStatus = 'published';
    }
    if (req.user.role === 'parent') {
      const children = await Student.find({ $or: [{ parentUser: req.user._id }, { parentEmail: req.user.email }] }, '_id');
      const childIds = children.map(child => child._id);
      query.student = student ? { $in: childIds.filter(id => String(id) === String(student)) } : { $in: childIds };
    }
    if (req.user.role === 'student') {
      const studentProfile = await Student.findOne({ user: req.user._id }, '_id');
      query.student = studentProfile ? studentProfile._id : null;
    }
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const { classIds } = await teacherAssignments(req.user._id);
      if (classId && !classIds.includes(String(classId))) {
        return res.status(403).json({ error: { message: 'Not authorized to view results for this class' } });
      }
      query.class = classId || { $in: classIds };
    }

    const total = await ExamResult.countDocuments(query);
    const results = await ExamResult.find(query)
      .populate('student', 'studentId')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('subject', 'name code')
      .populate('class', 'name level')
      .sort({ academicYear: -1, term: 1, 'subject.name': 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ results, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get full report card data for a student for a term
// @route GET /api/exam-results/report-card/:studentId
router.get('/report-card/:studentId', protect, authorize('admin', 'super-admin', 'hod', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  try {
    const { term, academicYear } = req.query;
    if (!term || !academicYear) return res.status(400).json({ error: { message: 'term and academicYear are required' } });

    const student = await Student.findById(req.params.studentId)
      .populate('user', 'name');
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });
    if (req.user.role === 'parent' && String(student.parentUser) !== String(req.user._id) && student.parentEmail !== req.user.email) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
    }
    if (req.user.role === 'student' && String(student.user?._id || student.user) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
    }
    if (!(await canAccessStudent(req.user, student._id))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
    }

    const query = {
      student: req.params.studentId,
      term,
      academicYear: parseInt(academicYear),
      approvalStatus: 'published',
    };
    if (req.query.includeDraft === 'true' && !['student', 'parent'].includes(req.user.role)) {
      query.approvalStatus = { $in: ['draft', 'hod-approved', 'admin-approved', 'published'] };
    }

    const results = await ExamResult.find(query)
      .populate('subject', 'name code type')
      .sort({ 'subject.name': 1 });

    // Calculate aggregate stats
    const totalMarks = results.reduce((s, r) => s + r.marksObtained, 0);
    const totalMax = results.reduce((s, r) => s + r.maxMarks, 0);
    const averagePercentage = results.length > 0 ? Math.round(totalMarks / totalMax * 100) : 0;
    const totalPoints = results.reduce((s, r) => s + (r.gradePoints || 0), 0);

    // Class position (rank among published results in same class/term)
    let classPosition = null;
    if (student.currentClass) {
      const classmates = await ExamResult.aggregate([
        {
          $match: {
            class: student.currentClass,
            term,
            academicYear: parseInt(academicYear),
            approvalStatus: 'published'
          }
        },
        { $group: { _id: '$student', totalPoints: { $sum: '$gradePoints' }, count: { $sum: 1 } } },
        { $sort: { totalPoints: 1 } }  // lower points = better in Uganda
      ]);

      const idx = classmates.findIndex(c => c._id.toString() === req.params.studentId);
      if (idx >= 0) classPosition = { position: idx + 1, outOf: classmates.length };
    }

    res.json({
      student: {
        name: student.user?.name,
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        class: student.currentClassLevel,
        stream: student.currentStream,
      },
      term,
      academicYear: parseInt(academicYear),
      results,
      summary: {
        totalSubjects: results.length,
        totalMarks,
        totalMax,
        averagePercentage,
        totalGradePoints: totalPoints,
        aggregateGrade: getGrade(averagePercentage),
        classPosition
      }
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENTER RESULTS (Teacher)
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Enter / update a single result (draft only)
// @route POST /api/exam-results
router.post('/', protect, authorize(...ENTRY_ROLES), async (req, res) => {
  const { student, subject, class: classId, registration, term, academicYear, examType, marksObtained, maxMarks, remarks, classLevel, streamName } = req.body;

  try {
    const assignmentError = await validateTeacherAssignments(req.user, [{ student, subject, class: classId }]);
    if (assignmentError) return res.status(403).json({ error: { message: assignmentError } });
    const existing = await ExamResult.findOne({ student, subject, examType, term, academicYear: parseInt(academicYear) });

    if (existing) {
      if (existing.approvalStatus !== 'draft') {
        return res.status(400).json({ error: { message: `Cannot edit result that is already ${existing.approvalStatus}. Revert to draft first.` } });
      }
      // Update existing draft
      const old = existing.toObject();
      existing.marksObtained = marksObtained;
      existing.maxMarks = maxMarks || existing.maxMarks;
      existing.remarks = remarks;
      await existing.save();

      await logAudit(req, {
        action: 'result.entered',
        module: 'results',
        recordId: existing._id,
        oldValue: old,
        newValue: existing.toObject(),
      });

      return res.json(existing);
    }

    // New result
    const result = await ExamResult.create({
      student, subject, class: classId, registration,
      academicYear: parseInt(academicYear), term, examType,
      marksObtained, maxMarks: maxMarks || 100,
      remarks, classLevel, streamName,
      enteredBy: req.user._id,
      enteredByName: req.user.name,
      approvalStatus: 'draft',
    });

    await logAudit(req, {
      action: 'result.entered',
      module: 'results',
      recordId: result._id,
      description: `${req.user.name} entered result for student`,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Bulk enter results for a class (teacher batch entry)
// @route POST /api/exam-results/bulk
router.post('/bulk', protect, authorize(...ENTRY_ROLES), async (req, res) => {
  const { results } = req.body; // Array of result objects
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: { message: 'results must be a non-empty array' } });
  }
  const assignmentError = await validateTeacherAssignments(req.user, results);
  if (assignmentError) return res.status(403).json({ error: { message: assignmentError } });

  const saved = [], errors = [];
  for (const r of results) {
    try {
      const existing = await ExamResult.findOne({
        student: r.student, subject: r.subject,
        examType: r.examType, term: r.term, academicYear: parseInt(r.academicYear)
      });

      if (existing) {
        if (existing.approvalStatus !== 'draft') {
          errors.push({ student: r.student, error: `Already ${existing.approvalStatus}` });
          continue;
        }
        existing.marksObtained = r.marksObtained;
        existing.maxMarks = r.maxMarks || existing.maxMarks;
        existing.remarks = r.remarks;
        await existing.save();
        saved.push(existing);
      } else {
        const result = await ExamResult.create({
          ...r,
          academicYear: parseInt(r.academicYear),
          enteredBy: req.user._id,
          enteredByName: req.user.name,
          approvalStatus: 'draft',
        });
        saved.push(result);
      }
    } catch (e) {
      errors.push({ student: r.student, error: e.message });
    }
  }

  res.json({ saved: saved.length, errors });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  HoD approves results for a class/term (bulk)
// @route PATCH /api/exam-results/approve-hod
router.patch('/approve-hod', protect, authorize(...APPROVAL_ROLES), async (req, res) => {
  const { class: classId, term, academicYear, subject } = req.body;

  const filter = { term, academicYear: parseInt(academicYear), approvalStatus: 'submitted' };
  if (classId) filter.class = classId;
  if (subject) filter.subject = subject;

  try {
    const result = await ExamResult.updateMany(filter, {
      $set: {
        approvalStatus: 'hod-approved',
        hodApprovedBy: req.user._id,
        hodApprovedAt: new Date(),
      }
    });

    await logAudit(req, {
      action: 'result.hod-approved',
      module: 'results',
      recordId: req.user._id, // context record
      description: `HoD approved ${result.modifiedCount} results for ${term} ${academicYear}`,
    });

    res.json({ message: `${result.modifiedCount} results approved by HoD` });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Submit draft results for HoD review
// @route PATCH /api/exam-results/submit-review
router.patch('/submit-review', protect, authorize(...ENTRY_ROLES), async (req, res) => {
  const { class: classId, term, academicYear, subject } = req.body;
  const filter = { term, academicYear: parseInt(academicYear), approvalStatus: 'draft' };
  if (classId) filter.class = classId;
  if (subject) filter.subject = subject;
  try {
    const result = await ExamResult.updateMany(filter, { $set: { approvalStatus: 'submitted' } });
    res.json({ message: `${result.modifiedCount} results submitted for review`, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Return submitted results to the teacher for revision
// @route PATCH /api/exam-results/return-revision
router.patch('/return-revision', protect, authorize(...APPROVAL_ROLES), async (req, res) => {
  const { class: classId, term, academicYear, subject } = req.body;
  const filter = { term, academicYear: parseInt(academicYear), approvalStatus: { $in: ['submitted', 'hod-approved'] } };
  if (classId) filter.class = classId;
  if (subject) filter.subject = subject;
  try {
    const result = await ExamResult.updateMany(filter, { $set: { approvalStatus: 'draft' } });
    res.json({ message: `${result.modifiedCount} results returned for revision`, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Admin publishes results (makes visible to students/parents)
// @route PATCH /api/exam-results/publish
router.patch('/publish', protect, authorize('super-admin', 'admin', 'academic-admin'), async (req, res) => {
  const { class: classId, subject, term, academicYear } = req.body;

  const filter = { term, academicYear: parseInt(academicYear), approvalStatus: 'hod-approved' };
  if (classId) filter.class = classId;
  if (subject) filter.subject = subject;

  try {
    const result = await ExamResult.updateMany(filter, {
      $set: {
        approvalStatus: 'published',
        adminApprovedBy: req.user._id,
        adminApprovedAt: new Date(),
        publishedAt: new Date(),
      }
    });

    await logAudit(req, {
      action: 'result.published',
      module: 'results',
      recordId: req.user._id,
      description: `Published ${result.modifiedCount} results for ${term} ${academicYear}`,
    });

    res.json({ message: `${result.modifiedCount} results published` });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Revert a result to draft (for correction — logged)
// @route PATCH /api/exam-results/:id/revert-draft
router.patch('/:id/revert-draft', protect, authorize('super-admin', 'academic-admin'), async (req, res) => {
  try {
    const result = await ExamResult.findById(req.params.id);
    if (!result) return res.status(404).json({ error: { message: 'Result not found' } });

    const old = result.approvalStatus;
    result.approvalStatus = 'draft';
    await result.save();

    await logAudit(req, {
      action: 'result.unpublished',
      module: 'results',
      recordId: result._id,
      oldValue: { approvalStatus: old },
      newValue: { approvalStatus: 'draft' },
      reason: req.body.reason,
      description: `Result reverted to draft for correction by ${req.user.name}`,
    });

    res.json({ message: 'Result reverted to draft for correction', result });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Class performance summary for a term
// @route GET /api/exam-results/analytics/class-performance
router.get('/analytics/class-performance', protect, authorize(...APPROVAL_ROLES, 'teacher', 'class-teacher'), async (req, res) => {
  try {
    const { class: classId, term, academicYear, examType = 'EOT' } = req.query;
    if (!classId || !term || !academicYear) return res.status(400).json({ error: { message: 'class, term, and academicYear are required' } });

    const results = await ExamResult.find({
      class: classId, term, academicYear: parseInt(academicYear),
      examType, approvalStatus: { $in: ['hod-approved', 'admin-approved', 'published'] }
    })
      .populate('subject', 'name code')
      .populate('student', 'studentId')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } });

    // Group by subject
    const bySubject = {};
    for (const r of results) {
      const key = r.subject?.name || 'Unknown';
      if (!bySubject[key]) bySubject[key] = { subject: r.subject, marks: [] };
      bySubject[key].marks.push(r.percentage);
    }

    const subjectSummary = Object.entries(bySubject).map(([name, data]) => {
      const avg = data.marks.reduce((s, m) => s + m, 0) / data.marks.length;
      const passing = data.marks.filter(m => m >= 40).length;
      return {
        subject: name,
        subjectCode: data.subject?.code,
        average: Math.round(avg),
        passRate: Math.round((passing / data.marks.length) * 100),
        count: data.marks.length,
        highest: Math.max(...data.marks),
        lowest: Math.min(...data.marks),
      };
    });

    res.json({ classId, term, academicYear: parseInt(academicYear), examType, subjectSummary });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LICOKA FINANCIAL EXAM GATE (Eligibility based on StudentPass / 40% threshold)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/eligibility/:classId/:term', protect, async (req, res) => {
  try {
    const { classId, term } = req.params;
    const academicYear = req.query.academicYear ? parseInt(req.query.academicYear) : new Date().getFullYear();
    const StudentPass = require('../models/StudentPass');

    const students = await Student.find({ currentClass: classId })
      .populate('user', 'name email')
      .sort({ studentId: 1 });

    const studentIds = students.map(s => s._id);
    const passes = await StudentPass.find({
      student: { $in: studentIds },
      term,
      academicYear
    });

    const passMap = new Map();
    passes.forEach(p => passMap.set(String(p.student), p));

    const eligibilityList = students.map(s => {
      const pass = passMap.get(String(s._id));
      const isCleared = pass && pass.isValid && pass.examPermitted;
      return {
        studentId: s._id,
        regNumber: s.studentId,
        admissionNumber: s.admissionNumber || s.studentId,
        name: s.user ? s.user.name : s.studentId,
        isPermitted: Boolean(isCleared),
        passNumber: pass ? pass.passNumber : null,
        percentageCleared: pass ? pass.percentageCleared : 0,
        status: isCleared ? 'EXAM_PERMITTED' : 'PASS_WITHHELD',
        reason: isCleared ? 'Financial requirement (>=40%) satisfied' : 'Fees cleared below 40% requirement'
      };
    });

    const clearedCount = eligibilityList.filter(e => e.isPermitted).length;

    res.json({
      classId,
      term,
      academicYear,
      totalStudents: students.length,
      clearedForExams: clearedCount,
      withheldCount: students.length - clearedCount,
      students: eligibilityList
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;

