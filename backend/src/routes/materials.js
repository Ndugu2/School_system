const express = require('express');
const Material = require('../models/Material');
const { protect, authorize } = require('../middleware/auth');
const { teacherAssignments, canTeachSubjectInClass } = require('../middleware/recordAccess');
const { logAudit } = require('../middleware/auditLog');

const router = express.Router();
const ALL_MATERIAL_ROLES = ['super-admin', 'admin', 'academic-admin', 'director-of-studies'];
const isTeacher = user => ['teacher', 'class-teacher'].includes(user.role);

router.get('/', protect, authorize(...ALL_MATERIAL_ROLES, 'teacher', 'class-teacher'), async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    const query = {};
    if (classId) query.class = classId;
    if (subjectId) query.subject = subjectId;

    if (isTeacher(req.user)) {
      const { classIds, subjectIds } = await teacherAssignments(req.user._id);
      if ((classId && !classIds.includes(String(classId))) || (subjectId && !subjectIds.includes(String(subjectId)))) {
        return res.status(403).json({ error: { message: 'Not authorized to view materials for this class or subject' } });
      }
      query.class = classId || { $in: classIds };
      query.subject = subjectId || { $in: subjectIds };
    }

    const materials = await Material.find(query)
      .populate('class', 'name level')
      .populate('subject', 'name code')
      .populate('uploadedBy', 'name')
      .sort({ updatedAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/', protect, authorize(...ALL_MATERIAL_ROLES, 'teacher', 'class-teacher'), async (req, res) => {
  try {
    const { title, description, class: classId, subject: subjectId, fileUrl, fileType } = req.body;
    if (!title || !classId || !subjectId || !fileUrl) {
      return res.status(400).json({ error: { message: 'title, class, subject, and fileUrl are required' } });
    }
    if (isTeacher(req.user) && !(await canTeachSubjectInClass(req.user, classId, subjectId))) {
      return res.status(403).json({ error: { message: 'You may only add materials for your assigned classes and subjects' } });
    }
    const material = await Material.create({ title, description, class: classId, subject: subjectId, fileUrl, fileType, uploadedBy: req.user._id });
    await logAudit(req, { action: 'material.created', module: 'academic-materials', recordId: material._id, newValue: material.toObject() });
    res.status(201).json(material);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/:id', protect, authorize(...ALL_MATERIAL_ROLES, 'teacher', 'class-teacher'), async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ error: { message: 'Material not found' } });
    if (isTeacher(req.user) && !(await canTeachSubjectInClass(req.user, material.class, material.subject))) {
      return res.status(403).json({ error: { message: 'Not authorized to edit this material' } });
    }

    const updates = ['title', 'description', 'class', 'subject', 'fileUrl', 'fileType'];
    const nextClass = req.body.class || material.class;
    const nextSubject = req.body.subject || material.subject;
    if (isTeacher(req.user) && !(await canTeachSubjectInClass(req.user, nextClass, nextSubject))) {
      return res.status(403).json({ error: { message: 'You may only move materials to your assigned classes and subjects' } });
    }
    const oldValue = material.toObject();
    for (const field of updates) if (req.body[field] !== undefined) material[field] = req.body[field];
    await material.save();
    await logAudit(req, { action: 'material.updated', module: 'academic-materials', recordId: material._id, oldValue, newValue: material.toObject() });
    res.json(material);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/:id', protect, authorize(...ALL_MATERIAL_ROLES, 'teacher', 'class-teacher'), async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ error: { message: 'Material not found' } });
    if (isTeacher(req.user) && !(await canTeachSubjectInClass(req.user, material.class, material.subject))) {
      return res.status(403).json({ error: { message: 'Not authorized to delete this material' } });
    }
    await Material.findByIdAndDelete(material._id);
    await logAudit(req, { action: 'material.deleted', module: 'academic-materials', recordId: material._id, oldValue: material.toObject() });
    res.json({ message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
