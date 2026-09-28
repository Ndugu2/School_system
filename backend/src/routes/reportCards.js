const express = require('express');
const router = express.Router();

const Student = require('../models/Student');
const Class = require('../models/Class');
const User = require('../models/User');
const ExamResult = require('../models/ExamResult');
const Registration = require('../models/Registration');
const ReportVerification = require('../models/ReportVerification');
const { protect, authorize } = require('../middleware/auth');
const { canAccessStudent } = require('../middleware/recordAccess');
const ReportCardGenerator = require('../services/reportCardGenerator');
const { uaceGrade, competencyLabel, computeUACEAggregate } = require('../services/grading');

const REPORT_ROLES = ['super-admin', 'admin', 'supervisor', 'deputy-head', 'director-of-studies', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'];
const REVOKE_ROLES = ['super-admin', 'admin', 'deputy-head', 'director-of-studies', 'academic-admin'];

const toNumber = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const REPORT_API_BASE = () => process.env.FRONTEND_URL || 'http://localhost:5000/api';

// QR payload: only a random verification ID, never student PII.
// /verify resolves the ID to the persisted ReportVerification record,
// so a report can be re-verified, revoked, or audited server-side.
const buildVerifyUrl = (verificationId) => `${REPORT_API_BASE()}/report-cards/verify/${verificationId}`;

// ── Prefer stored comments (teacher/headteacher) over generated defaults ────
const loadStoredComments = async (studentId, term, academicYear) => {
  const record = await ReportVerification.findOne({ student: studentId, term, academicYear })
    .sort({ createdAt: -1 })
    .select('comments');
  if (record?.comments?.classTeacher || record?.comments?.headTeacher) {
    return {
      classTeacher: record.comments.classTeacher || '',
      headTeacher: record.comments.headTeacher || '',
    };
  }
  return null;
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

// Fallback comments applied ONLY when no recorded teacher/headteacher comment
// exists for that student + term + academic year.
const buildDefaultComments = (avg) => {
  if (avg >= 80) return { classTeacher: 'Excellent performance. Keep up the outstanding work!', headTeacher: 'An exemplary student. Highly recommended.' };
  if (avg >= 65) return { classTeacher: 'Very good performance. Continue striving for excellence.', headTeacher: 'A diligent and reliable learner.' };
  if (avg >= 50) return { classTeacher: 'Good effort shown. Needs to maintain consistent focus.', headTeacher: 'Satisfactory progress; more effort required in weaker areas.' };
  return { classTeacher: 'Performance needs significant improvement. Please seek support.', headTeacher: 'Urgent academic intervention recommended.' };
};

// ── NCDC (S1–S4) data assembly ─────────────────────────────────────────────
//
// Assessment model (see web/docs/SYSTEM_DOCUMENTATION.md → Curriculum & Assessment Engine):
//   SBA (20%) = (Average AOI Score / 3) × 20
//   Summative (80%) = End-of-Term percentage scaled to /80
//   Final (100%) = SBA + Summative
//   Competency bands: 1.0–1.4 Basic, 1.5–2.4 Moderate, 2.5–3.0 Outstanding
//
// NOTE — percentage→AOI conversion & EOT fallback: when an AOI score (1–3)
// is not recorded but percentage exams are, we derive a provisional AOI score
// as (avgPct/100)×3. This is a project-defined heuristic for systems that only
// record percentages; the authoritative source is the NCDC SBA Implementation
// Guide. Flag it if your workflows always record AOI scores.
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

    // AOI score on 1-3 scale (see NOTE above about the heuristic when AOI is absent)
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

  const comments = (await loadStoredComments(student._id, term, academicYear)) || buildDefaultComments(finalAvg);

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
  }

  const aggregate = computeUACEAggregate(
    uaceSubjects.map(s => ({ type: s.type, points: s.points }))
  );

  const combinationLabelParts = uaceSubjects
    .filter(s => s.type === 'principal')
    .map(s => s.subject.name);
  const combinationLabel = combinationLabelParts.join(' + ');

  const avg = uaceSubjects.length > 0
    ? Math.round((uaceSubjects.reduce((s, r) => s + r.percentage, 0) / uaceSubjects.length) * 10) / 10
    : 0;

  const comments = (await loadStoredComments(student._id, term, academicYear)) || buildDefaultComments(avg);

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
    aggregate,
  };
};

// ── Persist a verification record; returns { id, url, snapshot } ────────────
const createVerification = async ({ student, term, academicYear, reportData, issuedBy, commentOverride }) => {
  const finalMark = reportData.reportType === 'ncdc'
    ? reportData.averages?.finalAvg ?? null
    : null;
  const aggregatePoints = reportData.reportType === 'uace'
    ? reportData.aggregate?.total ?? null
    : null;

  const record = await ReportVerification.create({
    verificationId: ReportVerification.generateVerificationId(),
    student: student._id,
    studentName: reportData.student?.name,
    classLevel: reportData.student?.classLevel,
    term,
    academicYear,
    reportType: reportData.reportType,
    snapshot: {
      studentName: reportData.student?.name,
      classLevel: reportData.student?.classLevel,
      term,
      academicYear,
      reportType: reportData.reportType,
      finalMark,
      aggregate: aggregatePoints,
    },
    comments: commentOverride && (commentOverride.classTeacher || commentOverride.headTeacher)
      ? commentOverride
      : undefined,
    issuedBy,
  });

  return {
    id: record.verificationId,
    url: buildVerifyUrl(record.verificationId),
    record,
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

    // Staff may supply recorded comments via query params (preferred over defaults).
    let commentOverride = null;
    if (!['student', 'parent'].includes(req.user.role)) {
      const cc = (req.query.classTeacherComment || '').trim();
      const ht = (req.query.headTeacherComment || '').trim();
      if (cc || ht) commentOverride = { classTeacher: cc, headTeacher: ht };
    }
    if (commentOverride) reportData.comments = commentOverride;

    // Persist verification record; QR embeds ONLY the random ID (no PII).
    const verification = await createVerification({
      student,
      term,
      academicYear,
      reportData,
      issuedBy: req.user?._id,
      commentOverride,
    });
    reportData.verification = {
      token: verification.url,
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

    // Revalidate against the persisted verification record if one exists.
    const existing = await ReportVerification.findOne({ student: studentId, term, academicYear })
      .sort({ createdAt: -1 });
    reportData.verification = existing
      ? { token: buildVerifyUrl(existing.verificationId), status: existing.status }
      : null;

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/report-cards/verify/:token
//  Verify authenticity of a report card via its QR code.
//  Resolves the random ID to the persisted record (revoke-aware).
// ═══════════════════════════════════════════════════════════════════════════
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const record = await ReportVerification.findOne({ verificationId: token });
    if (!record) {
      return res.status(404).json({ valid: false, message: 'Verification ID not found' });
    }
    if (record.status !== 'active') {
      return res.status(400).json({ valid: false, message: 'This report has been revoked', revokedAt: record.revokedAt });
    }

    const { snapshot } = record;
    return res.json({
      valid: true,
      report: {
        studentName: snapshot.studentName,
        classLevel: snapshot.classLevel,
        term: snapshot.term,
        academicYear: snapshot.academicYear,
        reportType: snapshot.reportType,
        finalMark: snapshot.finalMark,
        aggregate: snapshot.aggregate,
      },
      issuedAt: record.createdAt,
    });
  } catch (err) {
    return res.status(400).json({ valid: false, message: 'Invalid verification data' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  PATCH /api/report-cards/verify/:token
//  Revoke a report (e.g. results amended or issued in error).
// ═══════════════════════════════════════════════════════════════════════════
router.patch('/verify/:token', protect, authorize(...REVOKE_ROLES), async (req, res) => {
  const { token } = req.params;
  try {
    const record = await ReportVerification.findOne({ verificationId: token });
    if (!record) return res.status(404).json({ error: { message: 'Verification ID not found' } });
    if (record.status !== 'active') return res.status(400).json({ error: { message: 'Report is already revoked' } });

    record.status = 'revoked';
    record.revokedAt = new Date();
    record.revokedBy = req.user?._id || null;
    record.reason = (req.body?.reason || '').trim();
    await record.save();

    res.json({ success: true, verificationId: record.verificationId, status: 'revoked' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;