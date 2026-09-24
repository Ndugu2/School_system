const express = require('express');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private (Admin/Super-Admin)
router.post('/', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { 
    name, 
    code, 
    level, 
    category, 
    type, 
    department, 
    isCompulsory, 
    applicableLevels, 
    classId, 
    teacherId 
  } = req.body;

  if (!name || !name.trim() || !code || !code.trim()) {
    return res.status(400).json({ error: { message: 'Subject name and subject code are required' } });
  }

  const cleanCode = code.trim().toUpperCase();

  try {
    const existing = await Subject.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ error: { message: `Subject with code "${cleanCode}" already exists (${existing.name})` } });
    }

    const determinedType = type || category || (level === 'A' ? 'principal' : (isCompulsory ? 'compulsory' : 'optional'));
    const isComp = determinedType === 'compulsory' || Boolean(isCompulsory);

    const subject = await Subject.create({
      name: name.trim(),
      code: cleanCode,
      level: level || (['S5', 'S6'].some(l => (applicableLevels || []).includes(l)) ? 'A' : 'O'),
      type: determinedType,
      category: determinedType,
      isCompulsory: isComp,
      department: department ? department.trim() : 'General',
      applicableLevels: applicableLevels || [],
      class: classId || null,
      teacher: teacherId || null
    });

    const populated = await Subject.findById(subject._id)
      .populate('class')
      .populate('teacher', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/subjects
// @desc    Get subjects (with optional level, category, and class filtering)
// @access  Private
router.get('/', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher'), async (req, res) => {
  const { classId, teacherId, level, category, type } = req.query;
  const filter = {};

  if (classId) filter.class = classId;
  if (teacherId) filter.teacher = teacherId;
  if (level && level !== 'all') filter.level = level;
  if (category && category !== 'all') filter.$or = [{ category }, { type: category }];
  else if (type && type !== 'all') filter.type = type;

  try {
    const subjects = await Subject.find(filter)
      .populate('class')
      .populate('teacher', 'name email')
      .sort({ level: 1, name: 1 });
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/subjects/:id
// @desc    Get subject details
// @access  Private
router.get('/:id', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('class')
      .populate('teacher', 'name email');
    if (!subject) {
      return res.status(404).json({ error: { message: 'Subject not found' } });
    }
    res.status(200).json(subject);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/subjects/:id
// @desc    Update subject (including teacher assignment, level, category)
// @access  Private (Admin/Super-Admin)
router.put('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { 
    name, 
    code, 
    level, 
    category, 
    type, 
    department, 
    isCompulsory, 
    applicableLevels, 
    classId, 
    teacherId, 
    isActive 
  } = req.body;

  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: { message: 'Subject not found' } });
    }

    if (code && code.trim().toUpperCase() !== subject.code) {
      const existing = await Subject.findOne({ code: code.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({ error: { message: `Subject code ${code.trim().toUpperCase()} is already in use by ${existing.name}` } });
      }
      subject.code = code.trim().toUpperCase();
    }

    if (name) subject.name = name.trim();
    if (level) subject.level = level;
    if (department !== undefined) subject.department = department;
    if (type || category) {
      subject.type = type || category;
      subject.category = type || category;
    }
    if (isCompulsory !== undefined) subject.isCompulsory = Boolean(isCompulsory);
    if (applicableLevels !== undefined) subject.applicableLevels = applicableLevels;
    if (classId !== undefined) subject.class = classId || null;
    if (teacherId !== undefined) subject.teacher = teacherId || null;
    if (isActive !== undefined) subject.isActive = Boolean(isActive);

    await subject.save();

    const updatedSubject = await Subject.findById(subject._id)
      .populate('class')
      .populate('teacher', 'name email');

    res.status(200).json(updatedSubject);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete subject
// @access  Private (Admin/Super-Admin)
router.delete('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: { message: 'Subject not found' } });
    }

    await subject.deleteOne();
    res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
