const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const Student = require('../models/Student');
const ExamResult = require('../models/ExamResult');
const { protect, authorize } = require('../middleware/auth');
const { canAccessStudent } = require('../middleware/recordAccess');
const { gradeForPercentage, getGradingScheme, weightedAssessmentComponents } = require('../utils/grading');

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
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
};

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

router.get('/verify/:token', async (req, res) => {
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

router.get('/:studentId/:term/pdf', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
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
    const bySubject = new Map();
    results.forEach((result) => {
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
      headers.forEach((header, index) => {
        doc.text(header, x + 4, y + 7, { width: widths[index] - 8, align: index ? 'center' : 'left' });
        x += widths[index];
      });
      y += 22;
    };

    const drawRow = (values, widths, index) => {
      let x = 42;
      doc.rect(42, y, pageW, 20).fill(index % 2 ? '#f8fafc' : '#ffffff').stroke('#dbe3ec');
      doc.fillColor('#1e293b').font('Helvetica').fontSize(8);
      values.forEach((value, valueIndex) => {
        doc.text(String(value ?? '—'), x + 4, y + 6, { width: widths[valueIndex] - 8, align: valueIndex ? 'center' : 'left' });
        x += widths[valueIndex];
      });
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
        const band = gradeForPercentage(finalScore, gradingScheme.gradeBands);
        drawRow([first.subject?.name || first.subject?.code, courseworkScore, components.EOT, finalScore, `${band.grade}${first.remarks ? ` - ${first.remarks}` : ''}`], widths, index);
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
    console.error('Report card PDF error:', error);
    if (!res.headersSent) res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
