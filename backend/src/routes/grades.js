const express = require('express');
const Grade = require('../models/Grade');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const { teacherAssignments, canAccessStudent } = require('../middleware/recordAccess');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
const PDFDocument = require('pdfkit');

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
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const { classIds, subjectIds } = await teacherAssignments(req.user._id);
      if (!classIds.includes(String(classId)) || !subjectIds.includes(String(subjectId))) {
        return res.status(403).json({ error: { message: 'You may only grade your assigned classes and subjects' } });
      }
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
router.get('/', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  const { studentId, classId, term, academicYear } = req.query;
  const filter = {};

  if (studentId) filter.student = studentId;
  if (classId) filter.class = classId;
  if (term) filter.term = term;
  if (academicYear) filter.academicYear = academicYear;

  try {
    if (['student', 'parent'].includes(req.user.role)) {
      const student = await Student.findOne(req.user.role === 'student' ? { user: req.user._id } : { $or: [{ parentUser: req.user._id }, { parentEmail: req.user.email }] }).select('_id');
      if (!student) return res.json([]);
      filter.student = student._id;
    }
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const { classIds } = await teacherAssignments(req.user._id);
      filter.class = { $in: classIds };
    }
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
router.get('/report-card/:studentId/:term', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const student = await Student.findById(studentId)
      .populate('user', 'name email')
      .populate('class');

    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }
    if (String(student.currentClass) !== String(classId)) {
      return res.status(400).json({ error: { message: 'Student is not assigned to the selected class' } });
    }
    if (!(await canAccessStudent(req.user, studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
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

// @route   GET /api/grades/report-card/:studentId/:term/pdf
// @desc    Generate a printable PDF report card (Uganda format)
// @access  Private
router.get('/report-card/:studentId/:term/pdf', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const student = await Student.findById(studentId)
      .populate('user', 'name email')
      .populate('class', 'name level');

    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });
    if (!(await canAccessStudent(req.user, studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
    }

    const grades = await Grade.find({ student: studentId, term, academicYear })
      .populate('subject', 'name code')
      .sort({ 'subject.name': 1 });

    const gradeMap = { D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, P8: 8, F9: 9 };
    const totalAggregates = grades.reduce((s, g) => s + (gradeMap[g.gradeValue] || 9), 0);
    const avgMarks = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g.totalMarks, 0) / grades.length) : 0;

    // Uganda division calculation (O-Level)
    let division = 'N/A';
    if (grades.length >= 8) {
      if (totalAggregates <= 24) division = 'Division I';
      else if (totalAggregates <= 32) division = 'Division II';
      else if (totalAggregates <= 45) division = 'Division III';
      else if (totalAggregates <= 52) division = 'Division IV';
      else division = 'Ungraded (U)';
    }

    // Build PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-card-${student.studentId}-${term.replace(/ /g, '-')}-${academicYear}.pdf"`);
    doc.pipe(res);

    const PRIMARY = '#4f46e5';
    const pageW = doc.page.width - 100; // margins

    // ── HEADER ──────────────────────────────────────────────────────────────
    doc.rect(50, 50, pageW, 80).fill(PRIMARY);
    doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold')
      .text('NDUGU ACADEMY', 60, 65, { align: 'center', width: pageW });
    doc.fontSize(11).font('Helvetica')
      .text('Uganda School Management System — Student Report Card', 60, 90, { align: 'center', width: pageW });
    doc.fillColor('#000');

    // ── STUDENT INFO ─────────────────────────────────────────────────────────
    doc.moveDown(1.5);
    const infoY = doc.y;
    doc.rect(50, infoY, pageW, 70).stroke('#cccccc');
    doc.fontSize(11).font('Helvetica-Bold').text('STUDENT INFORMATION', 60, infoY + 8);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${student.user?.name || '—'}`, 60, infoY + 24);
    doc.text(`Student ID: ${student.studentId}`, 60, infoY + 38);
    doc.text(`Class: ${student.class?.level || student.class?.name || '—'}`, 280, infoY + 24);
    doc.text(`Term: ${term}  |  Year: ${academicYear}`, 280, infoY + 38);
    doc.text(`Gender: ${student.gender}`, 60, infoY + 52);
    doc.text(`Parent: ${student.parentName}`, 280, infoY + 52);

    // ── GRADES TABLE ─────────────────────────────────────────────────────────
    doc.moveDown(2);
    const tableY = doc.y;
    const cols = [60, 260, 320, 370, 420, 470];
    const headers = ['Subject', 'BOT', 'MOT', 'EOT', 'Total', 'Grade'];
    const colWidths = [200, 60, 50, 50, 50, 60];

    // Header row
    doc.rect(50, tableY, pageW, 20).fill(PRIMARY);
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, cols[i], tableY + 6, { width: colWidths[i] }));
    doc.fillColor('#000');

    let rowY = tableY + 20;
    grades.forEach((g, idx) => {
      const bg = idx % 2 === 0 ? '#f8f8ff' : '#ffffff';
      doc.rect(50, rowY, pageW, 18).fill(bg).stroke('#e5e7eb');
      doc.fontSize(9).font('Helvetica').fillColor('#000');
      doc.text(g.subject?.name || '—', cols[0], rowY + 5, { width: colWidths[0] });
      doc.text(String(g.botMarks || 0), cols[1], rowY + 5, { width: colWidths[1], align: 'center' });
      doc.text(String(g.motMarks || 0), cols[2], rowY + 5, { width: colWidths[2], align: 'center' });
      doc.text(String(g.eotMarks || 0), cols[3], rowY + 5, { width: colWidths[3], align: 'center' });
      doc.text(String(g.totalMarks || 0), cols[4], rowY + 5, { width: colWidths[4], align: 'center' });

      // Grade with color
      const gColor = g.gradeValue?.startsWith('D') ? '#16a34a' : g.gradeValue?.startsWith('C') ? '#2563eb' : g.gradeValue?.startsWith('P') ? '#d97706' : '#dc2626';
      doc.fillColor(gColor).font('Helvetica-Bold').text(g.gradeValue || '—', cols[5], rowY + 5, { width: colWidths[5], align: 'center' });
      doc.fillColor('#000');
      rowY += 18;
    });

    if (grades.length === 0) {
      doc.rect(50, rowY, pageW, 24).fill('#fef9c3');
      doc.fillColor('#92400e').fontSize(10).font('Helvetica-Oblique')
        .text('No grades recorded for this term.', 60, rowY + 7, { align: 'center', width: pageW });
      rowY += 24;
    }

    // ── SUMMARY ──────────────────────────────────────────────────────────────
    doc.fillColor('#000');
    const summY = rowY + 16;
    doc.rect(50, summY, pageW, 60).fill('#f0f0ff').stroke(PRIMARY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(PRIMARY).text('TERM SUMMARY', 60, summY + 8);
    doc.fillColor('#000').font('Helvetica').fontSize(10);
    doc.text(`Total Subjects: ${grades.length}`, 60, summY + 24);
    doc.text(`Average Marks: ${avgMarks}%`, 200, summY + 24);
    doc.text(`Total Aggregates: ${totalAggregates}`, 340, summY + 24);
    doc.fontSize(12).font('Helvetica-Bold')
      .fillColor(division.includes('I') && !division.includes('II') && !division.includes('III') && !division.includes('IV') ? '#16a34a' : '#1d4ed8')
      .text(`Division: ${division}`, 60, summY + 42);

    // ── KEY ───────────────────────────────────────────────────────────────────
    doc.fillColor('#000').fontSize(8).font('Helvetica').moveDown(3);
    const keyY = summY + 75;
    doc.text('GRADING KEY (Uganda Curriculum):', 50, keyY, { underline: true });
    doc.text('D1(90-100)  D2(80-89)  C3(70-79)  C4(65-69)  C5(60-64)  C6(50-59)  P7(45-49)  P8(40-44)  F9(<40)', 50, keyY + 12);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const footY = doc.page.height - 60;
    doc.rect(50, footY, pageW, 30).fill('#f3f4f6');
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
      .text(`Generated: ${new Date().toLocaleDateString('en-UG', { dateStyle: 'full' })}  |  Ndugu Academy — Powered by Uganda School Management System`, 60, footY + 10, { align: 'center', width: pageW });

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: error.message } });
    }
  }
});

module.exports = router;
