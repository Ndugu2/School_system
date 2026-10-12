const express = require('express');
const Grade = require('../models/Grade');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const ExamResult = require('../models/ExamResult');
const { teacherAssignments, academicScope, hasAcademicEntryPermission, canAccessStudent, parentStudentFilter } = require('../middleware/recordAccess');
const { logAudit } = require('../middleware/auditLog');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { gradeForPercentage, calculateWeightedScore, getGradingScheme, weightedAssessmentComponents } = require('../utils/grading');

// Helper to determine Uganda grade value based on marks
const calculateUgGrade = (marks, bands) => gradeForPercentage(marks, bands).grade;

const reportCardToken = (studentId, term, academicYear) => {
  const payload = Buffer.from(JSON.stringify({ studentId, term, academicYear })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const readReportCardToken = (token) => {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
};

// @route   POST /api/grades
// @desc    Enter or update a student's grade
// @access  Private (Admin/Super-Admin/Teacher)
router.post('/', protect, authorize('admin', 'super-admin', 'teacher', 'class-teacher'), async (req, res) => {
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
      if (String(student.currentClass) !== String(classId)) {
        return res.status(403).json({ error: { message: 'Student is not enrolled in the selected class' } });
      }
      for (const examType of ['BOT', 'MOT', 'EOT']) {
        const hasPermission = await hasAcademicEntryPermission(req.user, {
          subjectId,
          classId,
          term,
          academicYear: academicYear || new Date().getFullYear(),
          examType,
        });
        if (!hasPermission) return res.status(403).json({ error: { message: 'Marks entry is not currently authorized by the Director of Studies' } });
      }
    }

    const year = academicYear || new Date().getFullYear();
    const gradingScheme = await getGradingScheme(student.currentClassLevel, year);

    const bot = parseFloat(botMarks) || 0;
    const mot = parseFloat(motMarks) || 0;
    const eot = parseFloat(eotMarks) || 0;
    const totalMarks = calculateWeightedScore(
      { BOT: bot, MOT: mot, EOT: eot },
      gradingScheme.assessmentWeights
    );
    const gradeValue = calculateUgGrade(totalMarks, gradingScheme.gradeBands);

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

    const previous = await Grade.findOne(filter).lean();
    const grade = await Grade.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true
    }).populate('student').populate('subject').populate('gradedBy', 'name');

    await logAudit(req, {
      action: previous ? 'grade.updated' : 'grade.entered',
      module: 'grades',
      recordId: grade._id,
      oldValue: previous,
      newValue: { botMarks: bot, motMarks: mot, eotMarks: eot, totalMarks, gradeValue, remarks: remarks || '', class: classId, subject: subjectId, student: studentId },
    });

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
  const { studentId, classId, subjectId, term, academicYear } = req.query;
  const filter = {};

  if (studentId) filter.student = studentId;
  if (classId) filter.class = classId;
  if (term) filter.term = term;
  if (academicYear) filter.academicYear = academicYear;

  try {
    if (['student', 'parent'].includes(req.user.role)) {
      const student = await Student.findOne(req.user.role === 'student' ? { user: req.user._id } : parentStudentFilter(req.user)).select('_id');
      if (!student) return res.json([]);
      filter.student = student._id;
    }
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const { classIds, subjectIds } = await teacherAssignments(req.user._id);
      if ((classId && !classIds.includes(String(classId))) || (subjectId && !subjectIds.includes(String(subjectId)))) {
        return res.status(403).json({ error: { message: 'Not authorized to view grades for this class or subject' } });
      }
      filter.class = classId || { $in: classIds };
      filter.subject = subjectId || { $in: subjectIds };
    }
    if (req.user.role === 'hod') {
      const scope = await academicScope(req.user);
      if (scope.subjectIds.length === 0) return res.status(403).json({ error: { message: 'No academic subjects are assigned to this HOD' } });
      filter.subject = { $in: scope.subjectIds };
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
    if (!(await canAccessStudent(req.user, studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
    }

    const grades = await Grade.find({ student: studentId, term, academicYear })
      .populate('subject')
      .populate('gradedBy', 'name');

    const gradingScheme = await getGradingScheme(student.currentClassLevel, Number(academicYear));
    let totalAggregates = 0;
    let subjectCount = 0;
    const gradeMap = Object.fromEntries(gradingScheme.gradeBands.map(band => [band.grade, band.points]));

    grades.forEach(g => {
      const value = gradeMap[g.gradeValue] ?? Math.max(...gradingScheme.gradeBands.map(band => band.points));
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

// @route   GET /api/grades/report-card/verify/:token
// @desc    Verify a published report card from its QR code
// @access  Public
router.get('/report-card/verify/:token', async (req, res) => {
  const details = readReportCardToken(req.params.token);
  if (!details) return res.status(400).json({ verified: false, error: { message: 'Invalid verification code' } });

  try {
    const student = await Student.findById(details.studentId).populate('user', 'name').select('studentId admissionNumber currentClassLevel currentStream user');
    if (!student) return res.status(404).json({ verified: false, error: { message: 'Student not found' } });
    const resultCount = await ExamResult.countDocuments({
      student: details.studentId,
      term: details.term,
      academicYear: details.academicYear,
      approvalStatus: 'published',
    });
    res.json({
      verified: resultCount > 0,
      student: student.user?.name,
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      classLevel: student.currentClassLevel,
      stream: student.currentStream,
      term: details.term,
      academicYear: details.academicYear,
      resultCount,
    });
  } catch (error) {
    res.status(500).json({ verified: false, error: { message: error.message } });
  }
});

// @route   GET /api/grades/report-card/:studentId/:term/pdf
// @desc    Generate an NCDC (S1-S4) or UACE (S5-S6) PDF report card
// @access  Private
router.get('/report-card/:studentId/:term/pdf', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = Number(req.query.academicYear || new Date().getFullYear());

  try {
    const student = await Student.findById(studentId).populate('user', 'name email').populate('class', 'name level');
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });
    if (!(await canAccessStudent(req.user, studentId))) return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });

    const results = await ExamResult.find({ student: studentId, term, academicYear, approvalStatus: 'published' })
      .populate('subject', 'name code')
      .sort({ 'subject.name': 1, examType: 1 });
    const isUace = ['S5', 'S6'].includes(student.currentClassLevel);
    const gradingScheme = await getGradingScheme(student.currentClassLevel, academicYear);
    const token = reportCardToken(studentId, term, academicYear);
    const verificationUrl = `${process.env.PUBLIC_API_URL || 'http://localhost:5000/api'}/grades/report-card/verify/${token}`;
    const qrData = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 100 });
    const doc = new PDFDocument({ margin: 42, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${isUace ? 'uace' : 'ncdc'}-report-card-${student.studentId}-${academicYear}.pdf"`);
    doc.pipe(res);

    const pageW = doc.page.width - 84;
    const primary = '#123b68';
    const accent = '#d99a17';
    const name = student.user?.name || 'Student';
    const classLevel = student.currentClassLevel || student.class?.level || '—';
    const publishedResults = results.filter(result => result.approvalStatus === 'published');
    const bySubject = new Map();
    publishedResults.forEach(result => {
      const key = String(result.subject?._id || result.subject?.name || result._id);
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key).push(result);
    });

    doc.fillColor(primary).font('Helvetica-Bold').fontSize(21).text('NDUGU ACADEMY', 42, 42, { align: 'center', width: pageW });
    doc.fillColor('#334155').font('Helvetica').fontSize(9).text('SCHOOL REPORT CARD | UGANDA CURRICULUM', 42, 69, { align: 'center', width: pageW });
    doc.moveTo(42, 84).lineTo(42 + pageW, 84).strokeColor(accent).lineWidth(3).stroke();
    doc.image(qrData, 42 + pageW - 85, 95, { width: 72, height: 72 });
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text(isUace ? 'UACE STATEMENT OF RESULTS' : 'NCDC REPORT CARD', 42, 101);
    doc.font('Helvetica').fontSize(9).text(`Name: ${name}`, 42, 122).text(`Student ID: ${student.studentId || '—'}`, 42, 137).text(`Class: ${classLevel} ${student.currentStream || ''}`, 42, 152).text(`Term: ${term} | Academic Year: ${academicYear}`, 42, 167);
    doc.fontSize(7).fillColor('#64748b').text('Scan QR to verify this published report card', 42 + pageW - 180, 171, { width: 170, align: 'center' });

    let y = 205;
    const drawHeader = (headers, widths) => {
      let x = 42;
      doc.rect(42, y, pageW, 22).fill(primary);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      headers.forEach((header, index) => { doc.text(header, x + 4, y + 7, { width: widths[index] - 8, align: index ? 'center' : 'left' }); x += widths[index]; });
      y += 22;
    };
    const drawRow = (values, widths, index) => {
      let x = 42;
      doc.rect(42, y, pageW, 20).fill(index % 2 ? '#f8fafc' : '#ffffff').stroke('#dbe3ec');
      doc.fillColor('#1e293b').font('Helvetica').fontSize(8);
      values.forEach((value, valueIndex) => { doc.text(String(value ?? '—'), x + 4, y + 6, { width: widths[valueIndex] - 8, align: valueIndex ? 'center' : 'left' }); x += widths[valueIndex]; });
      y += 20;
    };

    if (!isUace) {
      const widths = [190, 72, 72, 72, pageW - 406];
      drawHeader(['Subject', `Coursework ${gradingScheme.assessmentWeights.BOT + gradingScheme.assessmentWeights.MOT}%`, `Exam ${gradingScheme.assessmentWeights.EOT}%`, 'Final / 100', 'Grade & Remarks'], widths);
      [...bySubject.values()].forEach((subjectResults, index) => {
        const first = subjectResults[0];
        const components = weightedAssessmentComponents(subjectResults, gradingScheme.assessmentWeights);
        const courseworkScore = components.BOT + components.MOT;
        const finalScore = Math.round(courseworkScore + components.EOT);
        drawRow([first.subject?.name || first.subject?.code, courseworkScore, components.EOT, finalScore, `${calculateUgGrade(finalScore, gradingScheme.gradeBands)}${first.remarks ? ` - ${first.remarks}` : ''}`], widths, index);
      });
    } else {
      const widths = [190, 92, 92, pageW - 374];
      drawHeader(['Subject', 'Principal Mark', 'Grade', 'Points'], widths);
      [...bySubject.values()].forEach((subjectResults, index) => {
        const result = subjectResults.find(item => item.examType === 'EOT') || subjectResults[0];
        const percentage = result.percentage ?? Math.round((result.marksObtained / result.maxMarks) * 100);
        const band = gradeForPercentage(percentage, gradingScheme.gradeBands);
        drawRow([result.subject?.name || result.subject?.code, percentage, band.grade, band.points], widths, index);
      });
    }

    if (!results.length) {
      doc.fillColor('#92400e').font('Helvetica-Oblique').fontSize(9).text('No published results are available for this term.', 42, y + 10, { width: pageW, align: 'center' });
      y += 35;
    }
    const totalPoints = isUace ? [...bySubject.values()].reduce((sum, list) => {
      const result = list.find(item => item.examType === 'EOT') || list[0];
      const percentage = result?.percentage ?? 0;
      return sum + gradeForPercentage(percentage, gradingScheme.gradeBands).points;
    }, 0) : null;
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(10).text(isUace ? `TOTAL AGGREGATE POINTS: ${Math.min(totalPoints, 20)} / 20` : 'NCDC ASSESSMENT SUMMARY', 42, y + 18);
    doc.fillColor('#334155').font('Helvetica').fontSize(8).text(isUace ? 'Principal marks are shown per subject using the configured grading scheme.' : `Configured assessment weights: BOT ${gradingScheme.assessmentWeights.BOT}%, MOT ${gradingScheme.assessmentWeights.MOT}%, EOT ${gradingScheme.assessmentWeights.EOT}%.`, 42, y + 34);
    doc.text('Class Teacher Comment: _________________________________________________', 42, y + 63);
    doc.text('Headteacher Comment: ___________________________________________________', 42, y + 82);
    doc.fillColor('#64748b').fontSize(7).text(`Generated ${new Date().toLocaleDateString('en-UG')} | Published results only | Ndugu Academy`, 42, doc.page.height - 42, { align: 'center', width: pageW });
    doc.end();
  } catch (error) {
    console.error('Dual report-card PDF error:', error);
    if (!res.headersSent) res.status(500).json({ error: { message: error.message } });
  }
});

// Legacy Grade-based PDF endpoint retained below for older integrations.
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

    const gradingScheme = await getGradingScheme(student.currentClassLevel, Number(academicYear));
    const gradeMap = Object.fromEntries(gradingScheme.gradeBands.map(band => [band.grade, band.points]));
    const worstPoints = Math.max(...gradingScheme.gradeBands.map(band => band.points));
    const totalAggregates = grades.reduce((s, g) => s + (gradeMap[g.gradeValue] ?? worstPoints), 0);
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
