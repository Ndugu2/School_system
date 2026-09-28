const express = require('express');
const AcademicPermission = require('../models/AcademicPermission');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const router = express.Router();
const PRIVILEGE_ROLES = ['super-admin', 'admin', 'director-of-studies'];

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
      action: 'record.updated',
      module: 'subjects',
      recordId: permission._id,
      description: `Academic entry permission granted to teacher ${teacher}`,
    });
    res.status(201).json(permission);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
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
      action: 'record.updated',
      module: 'subjects',
      recordId: permission._id,
      description: `Academic entry permission revoked for teacher ${permission.teacher}`,
    });
    res.json(permission);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
