const express = require('express');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/classes
// @desc    Create a new class
// @access  Private (Admin/Super-Admin)
router.post('/', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, level, classTeacher, academicYear } = req.body;
  try {
    const classExists = await Class.findOne({ name, academicYear });
    if (classExists) {
      return res.status(400).json({ error: { message: 'Class already exists for this academic year' } });
    }

    const newClass = await Class.create({
      name,
      level,
      classTeacher: classTeacher || null,
      academicYear: academicYear || new Date().getFullYear()
    });

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/classes
// @desc    Get all classes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const classes = await Class.find({}).populate('classTeacher', 'name email');
    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/classes/:id
// @desc    Get class details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id).populate('classTeacher', 'name email');
    if (!cls) {
      return res.status(404).json({ error: { message: 'Class not found' } });
    }
    res.status(200).json(cls);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/classes/:id
// @desc    Update class details
// @access  Private (Admin/Super-Admin)
router.put('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, level, classTeacher, academicYear } = req.body;
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Class not found' } });
    }

    cls.name = name || cls.name;
    cls.level = level || cls.level;
    cls.classTeacher = classTeacher !== undefined ? classTeacher : cls.classTeacher;
    cls.academicYear = academicYear || cls.academicYear;

    const updatedClass = await cls.save();
    res.status(200).json(updatedClass);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   DELETE /api/classes/:id
// @desc    Delete class
// @access  Private (Admin/Super-Admin)
router.delete('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Class not found' } });
    }

    await cls.deleteOne();
    res.status(200).json({ message: 'Class removed' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
