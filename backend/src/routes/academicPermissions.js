const express = require('express');
const AcademicPermission = require('../models/AcademicPermission');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const router = express.Router();
const PRIVILEGE_ROLES = ['super-admin', 'admin', 'director-of-studies'];

router.get('/', protect, authorize(...PRIVILEGE_ROLES, 'academic-admin', 'teacher', 'class-teacher'), async (req, res) => {
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
    // Only grant marks-entry access within the teacher's assigned academic scope
    const teacherProfile = await Teacher.findOne({ user: teacher }).select('subjects classes');
    if (!teacherProfile) {
      return res.status(400).json({ error: { message: 'Teacher profile not found for the selected teacher' } });
    }
    const assignedSubjects = (teacherProfile.subjects || []).map(String);
    const assignedClasses = (teacherProfile.classes || []).map(String);
    if (!assignedSubjects.includes(String(subject))) {
      return res.status(400).json({ error: { message: 'Teacher is not assigned to this subject' } });
    }
    if (!assignedClasses.includes(String(classId))) {
      return res.status(400).json({ error: { message: 'Teacher is not assigned to this class' } });
    }
    const [subjectDoc, classDoc] = await Promise.all([Subject.findById(subject).select('name code'), Class.findById(classId).select('name')]);
    if (!subjectDoc || !classDoc) {
      return res.status(400).json({ error: { message: 'Subject or class no longer exists' } });
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
      action: 'academic-permission.granted',
      module: 'academic-permissions',
      recordId: permission._id,
      description: `Marks-entry permission granted to teacher ${target.name || teacher} for ${subjectDoc.name} (${classDoc.name})`,
    });
    res.status(201).json(permission);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @desc  Open, extend, or re-open a marks-entry window without revoking the grant
// @route PATCH /api/academic-permissions/:id
router.patch('/:id', protect, authorize(...PRIVILEGE_ROLES), async (req, res) => {
  try {
    const permission = await AcademicPermission.findById(req.params.id);
    if (!permission) return res.status(404).json({ error: { message: 'Academic permission not found' } });
    if (permission.revokedAt) {
      return res.status(400).json({ error: { message: 'Revoked permissions cannot be modified; create a new grant instead' } });
    }
    const updates = {};
    if (req.body.endsAt) updates.endsAt = new Date(req.body.endsAt);
    if (req.body.startsAt) updates.startsAt = new Date(req.body.startsAt);
    if (Array.isArray(req.body.assessmentTypes)) updates.assessmentTypes = req.body.assessmentTypes;
    if (req.body.term) updates.term = req.body.term;
    if (req.body.academicYear) updates.academicYear = parseInt(req.body.academicYear, 10);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { message: 'No window changes provided' } });
    }
    const old = permission.toObject();
    Object.assign(permission, updates);
    await permission.save();
    await logAudit(req, {
      action: 'academic-permission.updated',
      module: 'academic-permissions',
      recordId: permission._id,
      oldValue: { endsAt: old.endsAt, startsAt: old.startsAt, term: old.term, academicYear: old.academicYear, assessmentTypes: old.assessmentTypes },
      newValue: { endsAt: permission.endsAt, startsAt: permission.startsAt, term: permission.term, academicYear: permission.academicYear, assessmentTypes: permission.assessmentTypes },
      description: 'Marks-entry window updated by Director of Studies',
    });
    res.json(permission);
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
      action: 'academic-permission.revoked',
      module: 'academic-permissions',
      recordId: permission._id,
      description: `Marks-entry permission revoked by ${req.user.name || req.user.role}`,
    });
    res.json(permission);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;