const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const Student = require('../models/Student');
const Class = require('../models/Class');
const User = require('../models/User');
const ExamResult = require('../models/ExamResult');
const Registration = require('../models/Registration');
const Subject = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth');
const { canAccessStudent } = require('../middleware/recordAccess');
const ReportCardGenerator = require('../services/reportCardGenerator');

const REPORT_ROLES = ['super-admin', 'admin', 'supervisor', 'deputy-head', 'director-of-studies', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'];

const COMPETENCY_SCALE = [
  { label: 'Basic', min: 1.0, max: 1.49 },
  { label: 'Moderate', min: 1.5, max: 2.49 },
  { label: 'Outstanding', min: 2.5, max: 3.0 },
];

const competencyLabel = (score) => {
  const found = COMPETENCY_SCALE.find(c => score >= c.min && score <= c.max);
  return found ? found.label : (score > 3 ? 'Outstanding' : 'Basic');
};

// UACE 20-point grading scale
const uaceGrade = (percentage) => {
  if (percentage >= 80) return { letter: 'A', points: 6 };
  if (percentage >= 70) return { letter: 'B', points: 5 };
  if (percentage >= 60) return { letter: 'C', points: 4 };
  if (percentage >= 50) return { letter: 'D', points: 3 };
  if (percentage >= 40) return { letter: 'E', points: 2 };
  if (percentage >= 35) return { letter: 'O', points: 1 };
  return { letter: 'F', points: 0 };
};

const toNumber = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Build verification token for the QR code ──────────────────────────────
const buildVerificationToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'school-system-report-verify';
  return jwt.sign(payload, secret, { expiresIn: '365d' });
};

const buildVerifyUrl = (token) => {
  const base = process.env.FRONTEND_URL || 'http://localhost:5000/api';
  return `${base}/report-cards/verify/${token}`;
};

// ═══════════════════════════════════════════════════════════════════════════
//  ASSEMBLY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const resolveClassMeta = async (student, streamName) => {
  const cls = await Class.findById(student.currentClass)
    .populate('classTeacher', 'name')
    .populate('academicYear');
  if (!cls) return { className: student.currentClassLevel, streamName, classTeacher: null };

  const stream = (cls.streams || []).find(s => s.name === (streamName || student.currentStream));
  let classTeacherName = null;
  if (stream?.classTeacher) {
    const ct = await User.findById(stream.classTeacher).select('name');
    classTeacherName = ct?.name || null;
  } else if (cls.classTeacher) {
    classTeacherName = cls.classTeacher?.name || null;
  }
  return { className: cls.name, streamName: stream?.name || streamName, classTeacherName };
};

const getHeadTeacher = async () => {
  const ht = await User.findOne({ role: 'headteacher' }).select('name');
  return ht?.name || 'Headteacher';
};

const buildDefaultComments = (avg) => {
  if (avg >= 80) return { classTeacher: 'Excellent performance. Keep up the outstanding work!', headTeacher: 'An exemplary student. Highly recommended.' };
  if (avg >= 65) return { classTeacher: 'Very good performance. Continue striving for excellence.', headTeacher: 'A diligent and reliable learner.' };
  if (avg >= 50) return { classTeacher: 'Good effort shown. Needs to maintain consistent focus.', headTeacher: 'Satisfactory progress; more effort required in weaker areas.' };
  return { classTeacher: 'Performance needs significant improvement. Please seek support.', headTeacher: 'Urgent academic intervention recommended.' };
};

// ── NCDC (S1–S4) data assembly ─────────────────────────────────────────────
const buildNCDCData = async (student, term, academicYear, results) => {
  const { className, streamName, classTeacherName } = await resolveClassMeta(student);
  const headTeacherName = await getHeadTeacher();

  // Group results by subject
  const bySubject = new Map();
  for (const r of results) {
    const key = r.subject?._id?.toString() || 'unknown';
    if (!bySubject.has(key)) bySubject.set(key, { subject: r.subject, results: [] });
    bySubject.get(key).results.push(r);
  }

  const subjects = [];
  let aoiSum = 0, finalSum = 0, count = 0;

  for (const { subject, results: rs } of bySubject) {
    const eot = rs.find(r => ['EOT', 'mock'].includes(r.examType));
    const aoiResults = rs.filter(r => ['coursework', 'assignment', 'AOI'].includes(r.examType));

    // AOI score on 1-3 scale
    let aoiScore = null;
    if (aoiResults.length > 0) {
      const avgPct = (aoiResults.reduce((s, r) => s + (r.percentage || 0), 0) / aoiResults.length);
      aoiScore = Math.min(3, Math.max(1, Math.round((avgPct / 100) * 3 * 10) / 10));
    } else if (eot) {
      // Fallback: derive from EOT performance
      aoiScore = Math.min(3, Math.max(1, Math.round(((eot.percentage || 0) / 100) * 3 * 10) / 10));
    }

    // 20% Formative from AOI
    const formativeMark = aoiScore != null ? (aoiScore / 3) * 20 : 0;
    // 80% Summative from EOT (normalize to /80)
    const summativeMark = eot && eot.percentage != null ? Math.round(((eot.percentage || 0) / 100) * 80) : 0;
    const finalScore = Math.min(100, Math.round((formativeMark + summativeMark) * 10) / 10);

    if (aoiScore != null || eot) {
      aoiSum += aoiScore || 0;
      finalSum += finalScore;
      count++;
    }

    subjects.push({
      subject: { name: subject?.name || '—', code: subject?.code || '' },
      aoiScore,
      formativeMark: Math.round(formativeMark * 10) / 10,
      summativeMark,
      finalScore,
      competency: aoiScore != null ? competencyLabel(aoiScore) : '—',
    });
  }

  const aoiAvg = count > 0 ? Math.round((aoiSum / count) * 10) / 10 : 0;
  const finalAvg = count > 0 ? Math.round((finalSum / count) * 10) / 10 : 0;

  const genericSkills = [
    { name: 'Critical Thinking', score: aoiAvg, descriptor: competencyLabel(aoiAvg) },
    { name: 'Communication', score: aoiAvg, descriptor: competencyLabel(aoiAvg) },
    { name: 'Innovation', score: aoiAvg, descriptor: competencyLabel(aoiAvg) },
    { name: 'Teamwork', score: aoiAvg, descriptor: competencyLabel(aoiAvg) },
  ].map(s => ({ ...s, score: Math.min(3, s.score || 1) }));

  const comments = buildDefaultComments(finalAvg);

  return {
    reportType: 'ncdc',
    student: {
      name: student.user?.name,
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      classLevel: className || student.currentClassLevel,
      streamName,
      gender: student.gender,
      parentName: student.parentName,
    },
    term,
    academicYear,
    classTeacher: { name: classTeacherName },
    headTeacher: { name: headTeacherName },
    comments,
    subjects,
    genericSkills,
    averages: { aoiAvg, finalAvg, competencyLabel: competencyLabel(aoiAvg) },
  };
};

// ── UACE (S5–S6) data assembly ─────────────────────────────────────────────
const buildUACEData = async (student, term, academicYear, results) => {
  const { className, streamName, classTeacherName } = await resolveClassMeta(student);
  const headTeacherName = await getHeadTeacher();

  const reg = await Registration.findOne({ student: student._id, term }).sort({ createdAt: -1 });
  const combinationCode = reg?.subjectCombination || null;

  // Resolve combination label from the 3 principal subjects
  const bySubject = new Map();
  for (const r of results) {
    const key = r.subject?._id?.toString() || 'unknown';
    if (!bySubject.has(key)) bySubject.set(key, { subject: r.subject, results: [] });
    bySubject.get(key).results.push(r);
  }

  const uaceSubjects = [];
  const principalPoints = [];
  let gpPass = 0, subsidiaryPass = 0;

  for (const { subject, results: rs } of bySubject) {
    const primary = rs.find(r => ['EOT', 'mock', 'BOT', 'MOT'].includes(r.examType)) || rs[0];
    if (!primary) continue;
    const percentage = primary.percentage ?? 0;
    const { letter, points } = uaceGrade(percentage);
    const type = subject?.type || 'principal';

    uaceSubjects.push({
      subject: { name: subject?.name || '—', code: subject?.code || '' },
      type,
      marks: percentage,
      maxMarks: 100,
      percentage,
      letterGrade: letter,
      points,
    });

    if (type === 'subsidiary') subsidiaryPass = points > 0 ? 1 : 0;
    else if (type === 'general') gpPass = points > 0 ? 1 : 0;
    else principalPoints.push(points);
  }

  // Best 3 principal subjects + General Paper (1) + Subsidiary (1)
  const best3 = principalPoints.sort((a, b) => b - a).slice(0, 3);
  const total = Math.min(20, best3.reduce((s, p) => s + p, 0) + gpPass + subsidiaryPass);

  const combinationLabelParts = uaceSubjects
    .filter(s => s.type === 'principal')
    .map(s => s.subject.name);
  const combinationLabel = combinationLabelParts.join(' + ');

  const avg = uaceSubjects.length > 0
    ? Math.round((uaceSubjects.reduce((s, r) => s + r.percentage, 0) / uaceSubjects.length) * 10) / 10
    : 0;

  const comments = buildDefaultComments(avg);

  return {
    reportType: 'uace',
    student: {
      name: student.user?.name,
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      classLevel: className || student.currentClassLevel,
      streamName,
      gender: student.gender,
      parentName: student.parentName,
    },
    term,
    academicYear,
    classTeacher: { name: classTeacherName },
    headTeacher: { name: headTeacherName },
    comments,
    combination: { name: combinationCode || '—', label: combinationLabel },
    uaceSubjects,
    aggregate: {
      total,
      outOf: 20,
      breakdown: `Best 3 Principal (${best3.join(' + ')}) + General Paper (${gpPass}) + Subsidiary (${subsidiaryPass})`,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/report-cards/:studentId/:term/pdf
//  Generate dual-format PDF report card (auto NCDC or UACE by class level)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:studentId/:term/pdf', protect, authorize(...REPORT_ROLES), async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = parseInt(req.query.academicYear) || new Date().getFullYear();
  const includeDraft = req.query.includeDraft === 'true';

  try {
    const student = await Student.findById(studentId).populate('user', 'name email');
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });
    if (student.user?.name === null || student.user?.name === undefined) {
      student.user = student.user || { name: 'Unknown' };
    }
    if (!(await canAccessStudent(req.user, studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
    }

    const approvalFilter = includeDraft && !['student', 'parent'].includes(req.user.role)
      ? { $in: ['draft', 'hod-approved', 'admin-approved', 'published'] }
      : 'published';

    const results = await ExamResult.find({
      student: studentId,
      term,
      academicYear,
      approvalStatus: approvalFilter,
    })
      .populate('subject', 'name code type combination')
      .sort({ 'subject.name': 1 });

    const level = (student.currentClassLevel || '').toUpperCase();
    const isUACE = ['S5', 'S6'].includes(level);

    const reportData = isUACE
      ? await buildUACEData(student, term, academicYear, results)
      : await buildNCDCData(student, term, academicYear, results);

    // Verification QR
    const token = buildVerificationToken({
      studentId: student._id.toString(),
      studentName: student.user?.name,
      classLevel: level,
      term,
      academicYear,
      type: reportData.reportType,
    });
    reportData.verification = {
      token: buildVerifyUrl(token),
      note: 'Present to school office to verify authenticity.',
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-card-${student.studentId}-${term.replace(/ /g, '-')}-${academicYear}.pdf"`);

    await ReportCardGenerator.generate(reportData, res);
  } catch (error) {
    console.error('[report-card] PDF generation error:', error);
    if (!res.headersSent) res.status(500).json({ error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/report-cards/:studentId/:term/json
//  Preview the assembled report data (useful for the web console preview)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:studentId/:term/json', protect, authorize(...REPORT_ROLES), async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = parseInt(req.query.academicYear) || new Date().getFullYear();
  const includeDraft = req.query.includeDraft === 'true';

  try {
    const student = await Student.findById(studentId).populate('user', 'name email');
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });
    if (!(await canAccessStudent(req.user, studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this report card' } });
    }

    const approvalFilter = includeDraft && !['student', 'parent'].includes(req.user.role)
      ? { $in: ['draft', 'hod-approved', 'admin-approved', 'published'] }
      : 'published';

    const results = await ExamResult.find({
      student: studentId, term, academicYear, approvalStatus: approvalFilter,
    })
      .populate('subject', 'name code type combination')
      .sort({ 'subject.name': 1 });

    const level = (student.currentClassLevel || '').toUpperCase();
    const isUACE = ['S5', 'S6'].includes(level);

    const reportData = isUACE
      ? await buildUACEData(student, term, academicYear, results)
      : await buildNCDCData(student, term, academicYear, results);

    const token = buildVerificationToken({
      studentId: student._id.toString(),
      studentName: student.user?.name,
      classLevel: level,
      term,
      academicYear,
      type: reportData.reportType,
    });
    reportData.verification = { token: buildVerifyUrl(token) };

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/report-cards/verify/:token
//  Verify authenticity of a report card via its QR code
// ═══════════════════════════════════════════════════════════════════════════
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const secret = process.env.JWT_SECRET || 'school-system-report-verify';
    const payload = jwt.verify(token, secret);
    return res.json({ valid: true, report: payload });
  } catch (err) {
    return res.status(400).json({ valid: false, message: 'Invalid or expired verification code' });
  }
});

module.exports = router;