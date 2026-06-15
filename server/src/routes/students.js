const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Helper to generate unique student registration number
// Format: UG-YYYY-[Four digit sequence] e.g. UG-2026-0001
const generateStudentId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `UG-${currentYear}-`;
  
  // Find latest student ID matching this prefix
  const latestStudent = await Student.findOne({
    studentId: new RegExp('^' + prefix)
  }).sort({ studentId: -1 });

  let sequence = 1;
  if (latestStudent) {
    const lastId = latestStudent.studentId;
    const parts = lastId.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// @route   POST /api/students
// @desc    Enroll a new student (Creates User account + Student profile)
// @access  Private (Admin/Super-Admin)
router.post('/', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { 
    name, email, password, dob, gender, classId,
    parentName, parentPhone, parentEmail, address 
  } = req.body;

  try {
    // Check if class exists
    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Assigned class not found' } });
    }

    // Check if email already registered
    const emailToUse = email || `${name.toLowerCase().replace(/\s+/g, '')}@school.com`;
    const userExists = await User.findOne({ email: emailToUse });
    if (userExists) {
      return res.status(400).json({ error: { message: `User with email ${emailToUse} already exists` } });
    }

    // Create User account for student
    const user = await User.create({
      name,
      email: emailToUse,
      password: password || 'student123', // Default password
      role: 'student'
    });

    // Generate unique student ID
    const studentId = await generateStudentId();

    // Create Student profile
    const student = await Student.create({
      user: user._id,
      studentId,
      class: classId,
      dob,
      gender,
      parentName,
      parentPhone,
      parentEmail,
      address
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('user', '-password')
      .populate('class');

    res.status(201).json(populatedStudent);
  } catch (error) {
    console.error('Student enrollment error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/students
// @desc    Get all students (with optional filtering by class)
// @access  Private
router.get('/', protect, async (req, res) => {
  const { classId } = req.query;
  const filter = {};
  
  if (classId) {
    filter.class = classId;
  }

  try {
    const students = await Student.find(filter)
      .populate('user', '-password')
      .populate('class');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/students/:id
// @desc    Get detailed student profile
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', '-password')
      .populate('class');
    if (!student) {
      return res.status(404).json({ error: { message: 'Student profile not found' } });
    }
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student details
// @access  Private (Admin/Super-Admin)
router.put('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { 
    name, dob, gender, classId,
    parentName, parentPhone, parentEmail, address 
  } = req.body;

  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: { message: 'Student profile not found' } });
    }

    // Update User entity name
    if (name) {
      await User.findByIdAndUpdate(student.user, { name });
    }

    // Verify class if changed
    if (classId && classId !== String(student.class)) {
      const cls = await Class.findById(classId);
      if (!cls) {
        return res.status(404).json({ error: { message: 'New class not found' } });
      }
      student.class = classId;
    }

    student.dob = dob || student.dob;
    student.gender = gender || student.gender;
    student.parentName = parentName || student.parentName;
    student.parentPhone = parentPhone || student.parentPhone;
    student.parentEmail = parentEmail || student.parentEmail;
    student.address = address || student.address;

    await student.save();

    const updatedStudent = await Student.findById(student._id)
      .populate('user', '-password')
      .populate('class');

    res.status(200).json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete student profile & corresponding user account
// @access  Private (Admin/Super-Admin)
router.delete('/:id', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: { message: 'Student profile not found' } });
    }

    // Remove User account
    await User.findByIdAndDelete(student.user);
    // Remove Student profile
    await student.deleteOne();

    res.status(200).json({ message: 'Student profile and account deleted' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
