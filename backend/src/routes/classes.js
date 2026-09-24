const express = require('express');
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const AcademicYear = require('../models/AcademicYear');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/classes
// @desc    Create a new class
// @access  Private (Admin/Super-Admin)
router.post('/', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, level, classTeacher, academicYear } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: { message: 'Class name is required (e.g. Senior 1)' } });
  }

  try {
    let yearDoc = null;
    if (academicYear) {
      if (mongoose.Types.ObjectId.isValid(academicYear)) {
        yearDoc = await AcademicYear.findById(academicYear);
      }
      if (!yearDoc && !isNaN(Number(academicYear))) {
        yearDoc = await AcademicYear.findOne({ year: Number(academicYear) });
      }
    }
    if (!yearDoc) {
      yearDoc = await AcademicYear.findOne({ isActive: true }) || await AcademicYear.findOne().sort({ year: -1 });
    }
    if (!yearDoc) {
      yearDoc = await AcademicYear.create({
        year: 2026,
        label: '2026 Academic Year',
        isActive: true,
        terms: [
          { name: 'Term I', isActive: true, isCurrent: true },
          { name: 'Term II', isActive: false, isCurrent: false },
          { name: 'Term III', isActive: false, isCurrent: false }
        ]
      });
    }

    const classExists = await Class.findOne({ name: name.trim(), academicYear: yearDoc._id });
    if (classExists) {
      return res.status(400).json({ error: { message: `Class "${name}" already exists for ${yearDoc.label || yearDoc.year}` } });
    }

    const newClass = await Class.create({
      name: name.trim(),
      level: level || (name.includes('1') ? 'S1' : name.includes('2') ? 'S2' : name.includes('3') ? 'S3' : name.includes('4') ? 'S4' : name.includes('5') ? 'S5' : 'S6'),
      classTeacher: classTeacher || null,
      academicYear: yearDoc._id,
      academicYearValue: yearDoc.year,
      streams: []
    });

    const populated = await Class.findById(newClass._id)
      .populate('classTeacher', 'name email')
      .populate('academicYear', 'year label isActive');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/classes
// @desc    Get all classes
// @access  Private
router.get('/', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher'), async (req, res) => {
  try {
    const query = {};
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const teacher = await Teacher.findOne({ user: req.user._id }).select('classes');
      query._id = { $in: teacher?.classes || [] };
    }
    const classes = await Class.find(query)
      .populate('classTeacher', 'name email')
      .populate('streams.classTeacher', 'name email')
      .populate('academicYear', 'year label isActive')
      .sort({ level: 1, name: 1 });
    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/classes/:id
// @desc    Get class details
// @access  Private
router.get('/:id', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher'), async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate('classTeacher', 'name email')
      .populate('streams.classTeacher', 'name email')
      .populate('academicYear', 'year label isActive');
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
    const populated = await Class.findById(updatedClass._id)
      .populate('classTeacher', 'name email')
      .populate('streams.classTeacher', 'name email')
      .populate('academicYear', 'year label isActive');
    res.status(200).json(populated);
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

// ── STREAM MANAGEMENT ENDPOINTS ──────────────────────────────────────────────

// @route   POST /api/classes/:id/streams
// @desc    Attach a new stream to a class
// @access  Private (Admin/Super-Admin)
router.post('/:id/streams', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, classTeacher, capacity } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: { message: 'Stream name is required (e.g. North, South, Stream A)' } });
  }

  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Class not found' } });
    }

    // Check if stream with same name already exists in this class
    const streamName = name.trim();
    const exists = cls.streams.some(s => s.name.toLowerCase() === streamName.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: { message: `Stream "${streamName}" already exists in ${cls.name}` } });
    }

    cls.streams.push({
      name: streamName,
      classTeacher: classTeacher || null,
      capacity: Number(capacity) || 45
    });

    await cls.save();

    const updated = await Class.findById(cls._id)
      .populate('classTeacher', 'name email')
      .populate('streams.classTeacher', 'name email')
      .populate('academicYear', 'year label isActive');

    res.status(201).json({
      success: true,
      message: `Stream "${streamName}" attached to ${cls.name}`,
      class: updated
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/classes/:id/streams/:streamId
// @desc    Update a stream
// @access  Private (Admin/Super-Admin)
router.put('/:id/streams/:streamId', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, classTeacher, capacity } = req.body;
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Class not found' } });
    }

    const stream = cls.streams.id(req.params.streamId);
    if (!stream) {
      return res.status(404).json({ error: { message: 'Stream not found' } });
    }

    if (name) stream.name = name.trim();
    if (classTeacher !== undefined) stream.classTeacher = classTeacher || null;
    if (capacity !== undefined) stream.capacity = Number(capacity) || stream.capacity;

    await cls.save();

    const updated = await Class.findById(cls._id)
      .populate('classTeacher', 'name email')
      .populate('streams.classTeacher', 'name email')
      .populate('academicYear', 'year label isActive');

    res.status(200).json({
      success: true,
      message: 'Stream updated successfully',
      class: updated
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   DELETE /api/classes/:id/streams/:streamId
// @desc    Delete / remove a stream from a class
// @access  Private (Admin/Super-Admin)
router.delete('/:id/streams/:streamId', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Class not found' } });
    }

    cls.streams.pull(req.params.streamId);
    await cls.save();

    const updated = await Class.findById(cls._id)
      .populate('classTeacher', 'name email')
      .populate('streams.classTeacher', 'name email')
      .populate('academicYear', 'year label isActive');

    res.status(200).json({
      success: true,
      message: 'Stream removed successfully',
      class: updated
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
