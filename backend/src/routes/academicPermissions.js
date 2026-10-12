const express = require('express');
const AcademicPermission = require('../models/AcademicPermission');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const router = express.Router();
const PRIVILEGE_ROLES = ['super-admin', 'admin', 'director-of-studies'];

const validateScope = async (teacherUserId, subjectId, classId) => {
  const profile = await Teacher.findOne({ user: teacherUserId }).select('subjects classes');
  if (!profile || !profile.subjects.some(id => String(id) === String(subjectId)) || !profile.classes.some(id => String(id) === String(classId))) {
    return 'Permission must be within the teacher\'s assigned subjects and classes';
  }
  return null;
};

router.get('/', protect, authorize(...PRIVILEGE_ROLES, 'teacher', 'class-teacher'), async (req, res) => {
  try {
    const query = ['teacher', 'class-teacher'].includes(req.user.role)
      ? { teacher: req.user._id }
      : { ...(req.query.teacher ? { teacher: req.query.teacher } : {}) };
    const permissions = await AcademicPermission.find(query)
      .populate('teacher', 'name email role')
      .populate('subject', 'name code department')
      .populate('class', 'name level')
      .populate('grantedBy', 'name')
      .sort({ endsAt: -1 });
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/', protect, authorize(...PRIVILEGE_ROLES), async (req, res) => {
  try {
    const { teacher, subject, class: classId, academicYear, term, assessmentTypes, startsAt, endsAt } = req.body;
    if (!teacher || !subject || !classId || !academicYear || !term || !endsAt) {
      return res.status(400).json({ error: { message: 'Teacher, subject, class, year, term, and end time are required' } });
    }
    const target = await User.findById(teacher).select('role');
    if (!target || !['teacher', 'class-teacher'].includes(target.role)) {
      return res.status(400).json({ error: { message: 'Academic permissions can only be granted to teachers' } });
    }
    const scopeError = await validateScope(teacher, subject, classId);
    if (scopeError) return res.status(403).json({ error: { message: scopeError } });
    const [subjectExists, classExists] = await Promise.all([Subject.exists({ _id: subject }), Class.exists({ _id: classId })]);
    if (!subjectExists || !classExists) return res.status(400).json({ error: { message: 'Subject or class no longer exists' } });
    const permission = await AcademicPermission.create({
      teacher,
      subject,
      class: classId,
      academicYear: parseInt(academicYear, 10),
      term,
      assessmentTypes,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: new Date(endsAt),
      grantedBy: req.user._id,
    });
    await logAudit(req, {
      action: 'academic-permission.granted', module: 'academic-permissions', recordId: permission._id,
      description: `Academic entry permission granted to teacher ${teacher}`, newValue: permission.toObject(),
    });
    res.status(201).json(permission);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.patch('/:id', protect, authorize(...PRIVILEGE_ROLES), async (req, res) => {
  try {
    const permission = await AcademicPermission.findById(req.params.id);
    if (!permission) return res.status(404).json({ error: { message: 'Academic permission not found' } });
    if (permission.revokedAt) return res.status(400).json({ error: { message: 'Revoked permissions cannot be modified; create a new grant instead' } });
    const oldValue = permission.toObject();
    const { startsAt, endsAt, assessmentTypes, open, close } = req.body;
    if (startsAt !== undefined) permission.startsAt = new Date(startsAt);
    if (endsAt !== undefined) permission.endsAt = new Date(endsAt);
    if (assessmentTypes !== undefined) permission.assessmentTypes = assessmentTypes;
    if (open === true && endsAt === undefined) return res.status(400).json({ error: { message: 'Provide endsAt when opening a marks-entry window' } });
    if (open === true) permission.startsAt = startsAt ? new Date(startsAt) : new Date();
    if (close === true) { permission.startsAt = new Date(Math.min(permission.startsAt.getTime(), Date.now())); permission.endsAt = new Date(); }
    if (!Number.isFinite(permission.startsAt.getTime()) || !Number.isFinite(permission.endsAt.getTime()) || permission.endsAt < permission.startsAt) {
      return res.status(400).json({ error: { message: 'A valid window end at or after the start is required' } });
    }
    await permission.save();
    await logAudit(req, { action: 'academic-permission.window-updated', module: 'academic-permissions', recordId: permission._id,
      description: `Marks-entry window updated for teacher ${permission.teacher}`, oldValue, newValue: permission.toObject() });
    res.json(permission);
  } catch (err) { res.status(400).json({ error: { message: err.message } }); }
});

router.patch('/:id/revoke', protect, authorize(...PRIVILEGE_ROLES), async (req, res) => {
  try {
    const permission = await AcademicPermission.findByIdAndUpdate(
      req.params.id,
      { revokedAt: new Date(), revokedBy: req.user._id },
      { new: true }
    );
    if (!permission) return res.status(404).json({ error: { message: 'Academic permission not found' } });
    await logAudit(req, {
      action: 'academic-permission.revoked', module: 'academic-permissions', recordId: permission._id,
      description: `Academic entry permission revoked for teacher ${permission.teacher}`, newValue: permission.toObject(),
    });
    res.json(permission);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
