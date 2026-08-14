const express = require('express');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/teachers
// @desc    Add a teacher profile (Creates User account + Teacher profile)
// @access  Private (Admin/Super-Admin)
router.post('/', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, email, password, qualification, phoneNumber } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: { message: 'User with this email already exists' } });
    }

    // Create User account
    const user = await User.create({
      name,
      email,
      password: password || 'teacher123', // Default password
      role: 'teacher'
    });

    // Create Teacher profile
    const teacher = await Teacher.create({
      user: user._id,
      qualification,
      phoneNumber
    });

    const populatedTeacher = await Teacher.findById(teacher._id)
      .populate('user', '-password');

    res.status(201).json(populatedTeacher);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/teachers
// @desc    Get all teachers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const teachers = await Teacher.find({})
      .populate('user', '-password')
      .populate('subjects')
      .populate('classes');
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/teachers/:id
// @desc    Get teacher profile details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('user', '-password')
      .populate('subjects')
      .populate('classes');
    if (!teacher) {
      return res.status(404).json({ error: { message: 'Teacher profile not found' } });
    }
    res.status(200).json(teacher);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/teachers/:id
// @desc    Update teacher profile
// @access  Private (Admin/Super-Admin)
router.put('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { name, qualification, phoneNumber, subjects, classes } = req.body;

  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: { message: 'Teacher profile not found' } });
    }

    if (name) {
      await User.findByIdAndUpdate(teacher.user, { name });
    }

    teacher.qualification = qualification || teacher.qualification;
    teacher.phoneNumber = phoneNumber || teacher.phoneNumber;
    
    if (subjects) teacher.subjects = subjects;
    if (classes) teacher.classes = classes;

    await teacher.save();

    const updatedTeacher = await Teacher.findById(teacher._id)
      .populate('user', '-password')
      .populate('subjects')
      .populate('classes');

    res.status(200).json(updatedTeacher);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   DELETE /api/teachers/:id
// @desc    Delete teacher profile and user account
// @access  Private (Admin/Super-Admin)
router.delete('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: { message: 'Teacher profile not found' } });
    }

    // Remove User account
    await User.findByIdAndDelete(teacher.user);
    // Remove Teacher profile
    await teacher.deleteOne();

    res.status(200).json({ message: 'Teacher profile and account deleted' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
