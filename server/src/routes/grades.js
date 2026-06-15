const express = require('express');
const Grade = require('../models/Grade');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Helper to determine Uganda grade value based on marks
const calculateUgGrade = (marks) => {
  if (marks >= 90) return 'D1';
  if (marks >= 80) return 'D2';
  if (marks >= 70) return 'C3';
  if (marks >= 65) return 'C4';
  if (marks >= 60) return 'C5';
  if (marks >= 50) return 'C6';
  if (marks >= 45) return 'P7';
  if (marks >= 40) return 'P8';
  return 'F9';
};

// @route   POST /api/grades
// @desc    Enter or update a student's grade
// @access  Private (Admin/Super-Admin/Teacher)
router.post('/', protect, authorize('admin', 'super-admin', 'teacher'), async (req, res) => {
  const { studentId, subjectId, classId, term, academicYear, botMarks, motMarks, eotMarks, remarks } = req.body;

  if (!studentId || !subjectId || !classId || !term) {
    return res.status(400).json({ error: { message: 'Missing required fields' } });
  }

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ error: { message: 'Subject not found' } });
    }

    const year = academicYear || new Date().getFullYear();

    // Calculate total marks.
    // In many schools: 30% from CA (BOT + MOT / 2) + 70% from EOT, or simply average or total.
    // Let's assume totalMarks = eotMarks for simplicity, or calculated as a weighted sum:
    // botMarks (15%) + motMarks (15%) + eotMarks (70%)
    // Let's allow simple total input, or calculate from eot if others aren't given.
    const bot = parseFloat(botMarks) || 0;
    const mot = parseFloat(motMarks) || 0;
    const eot = parseFloat(eotMarks) || 0;
    
    // Weighted formula: BOT (15%) + MOT (15%) + EOT (70%)
    const totalMarks = Math.round((bot * 0.15) + (mot * 0.15) + (eot * 0.70));
    const gradeValue = calculateUgGrade(totalMarks);

    const filter = { student: studentId, subject: subjectId, term, academicYear: year };
    const update = {
      class: classId,
      botMarks: bot,
      motMarks: mot,
      eotMarks: eot,
      totalMarks,
      gradeValue,
      remarks: remarks || '',
      gradedBy: req.user._id
    };

    const grade = await Grade.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true
    }).populate('student').populate('subject').populate('gradedBy', 'name');

    res.status(200).json(grade);
  } catch (error) {
    console.error('Submit grade error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/grades
// @desc    Get grades with filters (student, class, term)
// @access  Private
router.get('/', protect, async (req, res) => {
  const { studentId, classId, term, academicYear } = req.query;
  const filter = {};

  if (studentId) filter.student = studentId;
  if (classId) filter.class = classId;
  if (term) filter.term = term;
  if (academicYear) filter.academicYear = academicYear;

  try {
    const grades = await Grade.find(filter)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('subject')
      .populate('class')
      .populate('gradedBy', 'name');
    res.status(200).json(grades);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/grades/report-card/:studentId/:term
// @desc    Get report card details (all grades, division calculation, terms statistics)
// @access  Private
router.get('/report-card/:studentId/:term', protect, async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const student = await Student.findById(studentId)
      .populate('user', 'name email')
      .populate('class');

    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }

    const grades = await Grade.find({ student: studentId, term, academicYear })
      .populate('subject')
      .populate('gradedBy', 'name');

    // Aggregate division/aggregates for O-Level:
    // Sum of best 8 subjects' grade numbers (D1=1, D2=2, C3=3, C4=4, C5=5, C6=6, P7=7, P8=8, F9=9)
    // Division is determined by total aggregates and passes in English & Math
    let totalAggregates = 0;
    let subjectCount = 0;
    const gradeMap = { D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, P8: 8, F9: 9 };

    grades.forEach(g => {
      const value = gradeMap[g.gradeValue] || 9;
      totalAggregates += value;
      subjectCount++;
    });

    res.status(200).json({
      student,
      term,
      academicYear,
      grades,
      summary: {
        totalSubjects: subjectCount,
        totalAggregates,
        averageMarks: subjectCount > 0 ? Math.round(grades.reduce((sum, g) => sum + g.totalMarks, 0) / subjectCount) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
