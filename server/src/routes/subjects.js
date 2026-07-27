const express = require('express');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private (Admin/Super-Admin)
router.post('/', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, code, classId, teacherId } = req.body;

  try {
    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Assigned class not found' } });
    }

    const subjectExists = await Subject.findOne({ name, class: classId });
    if (subjectExists) {
      return res.status(400).json({ error: { message: 'Subject already exists in this class' } });
    }

    const subject = await Subject.create({
      name,
      code,
      class: classId,
      teacher: teacherId || null
    });

    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/subjects
// @desc    Get subjects (with optional class filtering)
// @access  Private
router.get('/', protect, async (req, res) => {
  const { classId, teacherId } = req.query;
  const filter = {};

  if (classId) filter.class = classId;
  if (teacherId) filter.teacher = teacherId;

  try {
    const subjects = await Subject.find(filter)
      .populate('class')
      .populate('teacher', 'name email');
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/subjects/:id
// @desc    Get subject details
// @access  Private
router.get('/:id', protect, async (req, res) => {
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
// @desc    Update subject (including teacher assignment)
// @access  Private (Admin/Super-Admin)
router.put('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, code, classId, teacherId } = req.body;

  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: { message: 'Subject not found' } });
    }

    if (classId) {
      const cls = await Class.findById(classId);
      if (!cls) {
        return res.status(404).json({ error: { message: 'Class not found' } });
      }
      subject.class = classId;
    }

    subject.name = name || subject.name;
    subject.code = code || subject.code;
    subject.teacher = teacherId !== undefined ? teacherId : subject.teacher;

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
