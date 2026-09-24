const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const HealthRecord = require('../modules/health/models/HealthRecord');
const EmergencyContact = require('../models/EmergencyContact');
const StudentPhoto = require('../models/StudentPhoto');
const AcademicPerformance = require('../models/AcademicPerformance');
const Teacher = require('../models/Teacher');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');
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
router.post('/', protect, authorize('admin', 'super-admin', 'registrar'), async (req, res) => {
  const { 
    name, email, password, dob, gender, classId,
    parentName, parentPhone, parentEmail, parentRelationship, parentOccupation,
    secondaryContactName, secondaryContactPhone,
    address, district, subCounty, village,
    nationality, religion, nationalId, bloodType,
    admissionTerm, admissionYear, previousSchool,
    allergies, medicalConditions, specialNeeds
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
      currentClass: classId,
      dob,
      gender,
      parentName,
      parentPhone,
      parentEmail,
      parentRelationship: parentRelationship || 'Guardian',
      parentOccupation,
      secondaryContactName,
      secondaryContactPhone,
      address,
      district,
      subCounty,
      village,
      nationality: nationality || 'Ugandan',
      religion,
      nationalId,
      bloodType: bloodType || '',
      admissionTerm: admissionTerm || 'Term 1',
      admissionYear: admissionYear || new Date().getFullYear().toString(),
      previousSchool,
      allergies,
      medicalConditions,
      specialNeeds
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('user', '-password')
      .populate('currentClass');

    res.status(201).json(populatedStudent);
  } catch (error) {
    console.error('Student enrollment error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/students
// @desc    Get all students (with optional filtering by class)
// @access  Private
router.get('/', protect, authorize('super-admin', 'admin', 'registrar', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  const { classId } = req.query;
  const filter = {};
  let assignedClassIds = null;

  if (req.user.role === 'parent') {
    // Older records may be linked by the verified parent email rather than parentUser.
    // Both are safe identifiers of the signed-in parent, unlike exposing the full roster.
    filter.$or = [{ parentUser: req.user._id }, { parentEmail: req.user.email }];
  }
  if (req.user.role === 'student') {
    filter.user = req.user._id;
  }
  if (['teacher', 'class-teacher'].includes(req.user.role)) {
    const teacher = await Teacher.findOne({ user: req.user._id }).select('classes');
    assignedClassIds = (teacher?.classes || []).map(String);
    filter.currentClass = { $in: teacher?.classes || [] };
  }
  
  if (classId) {
    if (assignedClassIds && !assignedClassIds.includes(String(classId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view students in this class' } });
    }
    filter.currentClass = classId;
  }

  try {
    const students = await Student.find(filter)
      .populate('user', '-password')
      .populate('currentClass');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/students/alumni/directory
// @desc    Get alumni and graduated students directory
// @access  Private
router.get('/alumni/directory', protect, async (req, res) => {
  try {
    const alumni = await Student.find({ studentStatus: { $in: ['graduated', 'alumni'] } })
      .populate('user', 'name email')
      .populate('currentClass', 'name level')
      .sort({ 'graduationDetails.graduationYear': -1 });

    res.json(alumni);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/students/:id
// @desc    Get detailed student profile
// @access  Private
router.get('/:id', protect, authorize('super-admin', 'admin', 'registrar', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher', 'student', 'parent'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', '-password')
      .populate('currentClass');
    if (!student) {
      return res.status(404).json({ error: { message: 'Student profile not found' } });
    }
    if (req.user.role === 'parent' && String(student.parentUser) !== String(req.user._id) && student.parentEmail !== req.user.email) {
      return res.status(403).json({ error: { message: 'Not authorized to view this student' } });
    }
    if (req.user.role === 'student' && String(student.user?._id || student.user) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Not authorized to view this student' } });
    }
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const teacher = await Teacher.findOne({ user: req.user._id }).select('classes');
      if (!teacher?.classes.some(id => String(id) === String(student.currentClass?._id || student.currentClass))) {
        return res.status(403).json({ error: { message: 'Not authorized to view this student' } });
      }
    }
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student details
// @access  Private (Admin/Super-Admin)
router.put('/:id', protect, authorize('admin', 'super-admin', 'registrar'), async (req, res) => {
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
      .populate('currentClass');

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

// ===== ADVANCED FILTERING =====

// @route   GET /api/students/filter/advanced
// @desc    Get students with advanced filters (gender, enrollment date, performance)
// @access  Private
router.get('/filter/advanced', protect, async (req, res) => {
  const { gender, enrollmentStartDate, enrollmentEndDate, performanceLevel, classId } = req.query;
  const filter = {};

  if (gender) filter.gender = gender;
  if (classId) filter.class = classId;
  if (enrollmentStartDate || enrollmentEndDate) {
    filter.enrollmentDate = {};
    if (enrollmentStartDate) filter.enrollmentDate.$gte = new Date(enrollmentStartDate);
    if (enrollmentEndDate) filter.enrollmentDate.$lte = new Date(enrollmentEndDate);
  }

  try {
    let students = await Student.find(filter)
      .populate('user', '-password')
      .populate('class');

    // Filter by performance if specified
    if (performanceLevel) {
      const performanceData = await AcademicPerformance.find({ 
        performance: performanceLevel 
      });
      const performanceStudentIds = performanceData.map(p => String(p.student));
      students = students.filter(s => performanceStudentIds.includes(String(s._id)));
    }

    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== BULK OPERATIONS =====

// @route   DELETE /api/students/bulk/delete
// @desc    Delete multiple students at once
// @access  Private (Admin/Super-Admin)
router.post('/bulk/delete', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { studentIds } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: { message: 'No students selected for deletion' } });
  }

  try {
    const students = await Student.find({ _id: { $in: studentIds } });
    const userIds = students.map(s => s.user);

    await User.deleteMany({ _id: { $in: userIds } });
    await Student.deleteMany({ _id: { $in: studentIds } });

    res.status(200).json({ 
      message: `Successfully deleted ${studentIds.length} students`,
      deletedCount: studentIds.length 
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/students/bulk/class
// @desc    Update class for multiple students
// @access  Private (Admin/Super-Admin)
router.put('/bulk/class', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { studentIds, classId } = req.body;

  if (!Array.isArray(studentIds) || !classId) {
    return res.status(400).json({ error: { message: 'Student IDs and class ID are required' } });
  }

  try {
    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({ error: { message: 'Class not found' } });
    }

    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { class: classId } }
    );

    res.status(200).json({ 
      message: `Updated class for ${studentIds.length} students`,
      updatedCount: studentIds.length 
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== EXPORT =====

// @route   GET /api/students/export/csv
// @desc    Export students list as CSV
// @access  Private
router.get('/export/csv', protect, async (req, res) => {
  const { classId } = req.query;

  try {
    const filter = classId ? { class: classId } : {};
    const students = await Student.find(filter)
      .populate('user', 'name email')
      .populate('class', 'name');

    let csv = 'Student ID,Full Name,Email,Class,Gender,Date of Birth,Parent Name,Parent Phone,Enrollment Date\n';
    
    students.forEach(student => {
      const dob = student.dob ? new Date(student.dob).toLocaleDateString() : '';
      const enrollDate = student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : '';
      csv += `"${student.studentId}","${student.user?.name || ''}","${student.user?.email || ''}","${student.class?.name || ''}","${student.gender}","${dob}","${student.parentName}","${student.parentPhone}","${enrollDate}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="students_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== BATCH IMPORT =====

// @route   POST /api/students/import/csv
// @desc    Import students from CSV data
// @access  Private (Admin/Super-Admin)
router.post('/import/csv', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { csvData } = req.body; // Array of student objects: {name, email, classId, dob, gender, parentName, parentPhone}

  if (!Array.isArray(csvData) || csvData.length === 0) {
    return res.status(400).json({ error: { message: 'No student data provided' } });
  }

  try {
    const results = { success: 0, failed: 0, errors: [] };

    for (const studentData of csvData) {
      try {
        const { name, email, classId, dob, gender, parentName, parentPhone, parentEmail, address } = studentData;

        if (!name || !classId || !gender || !parentName || !parentPhone) {
          results.failed++;
          results.errors.push({ name, reason: 'Missing required fields' });
          continue;
        }

        const cls = await Class.findById(classId);
        if (!cls) {
          results.failed++;
          results.errors.push({ name, reason: 'Class not found' });
          continue;
        }

        const emailToUse = email || `${name.toLowerCase().replace(/\s+/g, '')}@school.com`;
        const userExists = await User.findOne({ email: emailToUse });
        if (userExists) {
          results.failed++;
          results.errors.push({ name, reason: `Email already exists: ${emailToUse}` });
          continue;
        }

        const user = await User.create({
          name,
          email: emailToUse,
          password: 'student123',
          role: 'student'
        });

        const studentId = await generateStudentId();
        await Student.create({
          user: user._id,
          studentId,
          class: classId,
          dob: dob ? new Date(dob) : new Date(),
          gender,
          parentName,
          parentPhone,
          parentEmail: parentEmail || '',
          address: address || ''
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ name: studentData.name, reason: err.message });
      }
    }

    res.status(200).json({ 
      message: `Import complete: ${results.success} successful, ${results.failed} failed`,
      ...results 
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== HEALTH RECORDS =====

// @route   GET /api/students/:studentId/health
// @desc    Get student's health records
// @access  Private
router.get('/:studentId/health', protect, async (req, res) => {
  try {
    const healthRecord = await HealthRecord.findOne({ student: req.params.studentId });
    if (!healthRecord) {
      return res.status(404).json({ error: { message: 'No health records found' } });
    }
    res.status(200).json(healthRecord);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/students/:studentId/health
// @desc    Create or update student health records
// @access  Private (Admin/Super-Admin)
router.post('/:studentId/health', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const existingRecord = await HealthRecord.findOne({ student: req.params.studentId });

    if (existingRecord) {
      Object.assign(existingRecord, req.body, { updatedBy: req.user.id });
      await existingRecord.save();
      return res.status(200).json(existingRecord);
    }

    const healthRecord = await HealthRecord.create({
      student: req.params.studentId,
      ...req.body,
      updatedBy: req.user.id
    });

    res.status(201).json(healthRecord);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== EMERGENCY CONTACTS =====

// @route   GET /api/students/:studentId/emergency-contacts
// @desc    Get student's emergency contacts
// @access  Private
router.get('/:studentId/emergency-contacts', protect, async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ student: req.params.studentId });
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/students/:studentId/emergency-contacts
// @desc    Add emergency contact for student
// @access  Private (Admin/Super-Admin)
router.post('/:studentId/emergency-contacts', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const contact = await EmergencyContact.create({
      student: req.params.studentId,
      ...req.body
    });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/students/:studentId/emergency-contacts/:contactId
// @desc    Update emergency contact
// @access  Private (Admin/Super-Admin)
router.put('/:studentId/emergency-contacts/:contactId', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const contact = await EmergencyContact.findByIdAndUpdate(
      req.params.contactId,
      req.body,
      { new: true }
    );
    if (!contact) {
      return res.status(404).json({ error: { message: 'Emergency contact not found' } });
    }
    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   DELETE /api/students/:studentId/emergency-contacts/:contactId
// @desc    Delete emergency contact
// @access  Private (Admin/Super-Admin)
router.delete('/:studentId/emergency-contacts/:contactId', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    await EmergencyContact.findByIdAndDelete(req.params.contactId);
    res.status(200).json({ message: 'Emergency contact deleted' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== STUDENT PHOTOS =====

// @route   GET /api/students/:studentId/photos
// @desc    Get student's photos
// @access  Private
router.get('/:studentId/photos', protect, async (req, res) => {
  try {
    const photos = await StudentPhoto.find({ student: req.params.studentId });
    res.status(200).json(photos);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/students/:studentId/photos
// @desc    Upload student photo
// @access  Private (Admin/Super-Admin)
router.post('/:studentId/photos', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const { photoUrl, fileName, fileSize } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ error: { message: 'Photo URL is required' } });
    }

    // Set new photo as primary if it's the first one
    const existingPhotos = await StudentPhoto.find({ student: req.params.studentId });
    const isPrimary = existingPhotos.length === 0;

    // If setting as primary, remove primary flag from others
    if (isPrimary) {
      await StudentPhoto.updateMany(
        { student: req.params.studentId },
        { $set: { isPrimary: false } }
      );
    }

    const photo = await StudentPhoto.create({
      student: req.params.studentId,
      photoUrl,
      fileName: fileName || 'student_photo',
      fileSize: fileSize || 0,
      uploadedBy: req.user.id,
      isPrimary
    });

    res.status(201).json(photo);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   DELETE /api/students/:studentId/photos/:photoId
// @desc    Delete student photo
// @access  Private (Admin/Super-Admin)
router.delete('/:studentId/photos/:photoId', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const photo = await StudentPhoto.findByIdAndDelete(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ error: { message: 'Photo not found' } });
    }

    // If deleted photo was primary, set first remaining as primary
    if (photo.isPrimary) {
      const firstPhoto = await StudentPhoto.findOne({ student: req.params.studentId });
      if (firstPhoto) {
        firstPhoto.isPrimary = true;
        await firstPhoto.save();
      }
    }

    res.status(200).json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== ACADEMIC PERFORMANCE =====

// @route   GET /api/students/:studentId/performance
// @desc    Get student's academic performance
// @access  Private
router.get('/:studentId/performance', protect, async (req, res) => {
  try {
    const performance = await AcademicPerformance.findOne({ student: req.params.studentId })
      .populate('class')
      .populate('subjects.subject');
    
    if (!performance) {
      return res.status(404).json({ error: { message: 'No performance records found' } });
    }
    res.status(200).json(performance);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/students/:studentId/performance
// @desc    Create or update academic performance record
// @access  Private (Admin/Super-Admin)
router.post('/:studentId/performance', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const existingRecord = await AcademicPerformance.findOne({ student: req.params.studentId });

    if (existingRecord) {
      Object.assign(existingRecord, req.body);
      await existingRecord.save();
      return res.status(200).json(existingRecord);
    }

    const performance = await AcademicPerformance.create({
      student: req.params.studentId,
      ...req.body
    });

    res.status(201).json(performance);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ===== NOTIFICATIONS =====

// @route   POST /api/students/bulk/notify
// @desc    Send notifications (SMS/Email) to multiple students/parents
// @access  Private (Admin/Super-Admin)
router.post('/bulk/notify', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { studentIds, message, type } = req.body; // type: 'sms' or 'email'

  if (!Array.isArray(studentIds) || !message || !type) {
    return res.status(400).json({ error: { message: 'Student IDs, message, and type are required' } });
  }

  try {
    const students = await Student.find({ _id: { $in: studentIds } })
      .populate('user', 'email');

    let sentCount = 0;
    const results = [];

    for (const student of students) {
      try {
        if (type === 'sms') {
          // Send SMS to parent phone - using nodemailer-like interface
          // For now, log to console
          console.log(`SMS to ${student.parentPhone}: ${message}`);
          sentCount++;
          results.push({ studentId: student._id, status: 'sent', method: 'sms', recipient: student.parentPhone });
        } else if (type === 'email') {
          // Send email to parent
          console.log(`Email to ${student.parentEmail}: ${message}`);
          sentCount++;
          results.push({ studentId: student._id, status: 'sent', method: 'email', recipient: student.parentEmail });
        }
      } catch (err) {
        results.push({ studentId: student._id, status: 'failed', reason: err.message });
      }
    }

    res.status(200).json({
      message: `Sent ${sentCount} notifications`,
      totalStudents: studentIds.length,
      sentCount,
      results
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT LIFECYCLE CLEARANCE WORKFLOWS (Transfer, Withdrawal, Graduation)
// ═══════════════════════════════════════════════════════════════════════════════

// @route   POST /api/students/:id/transfer
// @desc    Process student transfer clearance (Never hard delete, preserves history)
// @access  Private (Admin/Super-Admin/Registrar)
router.post('/:id/transfer', protect, authorize('admin', 'super-admin', 'registrar'), async (req, res) => {
  const { destinationSchool, reason, notes, transferDate } = req.body;

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });

    student.studentStatus = 'transferred';
    student.transferDetails = {
      destinationSchool: destinationSchool || 'Not specified',
      transferDate: transferDate ? new Date(transferDate) : new Date(),
      reason: reason || 'Transfer to another institution',
      clearedBy: req.user._id,
      notes: notes || ''
    };

    await student.save();

    await logAudit(req, {
      action: 'student.transferred',
      module: 'students',
      recordId: student._id,
      recordRef: student.studentId,
      description: `Student ${student.studentId} transferred to ${student.transferDetails.destinationSchool}`,
    });

    res.json({ message: 'Student transfer clearance completed and archived', student });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/students/:id/withdraw
// @desc    Process student withdrawal clearance
// @access  Private (Admin/Super-Admin/Registrar)
router.post('/:id/withdraw', protect, authorize('admin', 'super-admin', 'registrar'), async (req, res) => {
  const { reason, notes, withdrawalDate } = req.body;

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });

    student.studentStatus = 'withdrawn';
    student.withdrawalDetails = {
      withdrawalDate: withdrawalDate ? new Date(withdrawalDate) : new Date(),
      reason: reason || 'Withdrawn by parent/guardian',
      clearedBy: req.user._id,
      notes: notes || ''
    };

    await student.save();

    res.json({ message: 'Student withdrawal clearance recorded', student });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/students/:id/graduate
// @desc    Process S6 Graduation and transition to permanent Alumni directory
// @access  Private (Admin/Super-Admin/Academic Admin)
router.post('/:id/graduate', protect, authorize('admin', 'super-admin', 'academic-admin'), async (req, res) => {
  const { graduationYear, uaceIndexNumber, award } = req.body;

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });
    if (student.currentClassLevel !== 'S6') {
      return res.status(400).json({ error: { message: 'Only S6 students can be graduated' } });
    }

    student.studentStatus = 'graduated';
    student.graduationDetails = {
      graduationYear: graduationYear || new Date().getFullYear(),
      uaceIndexNumber: uaceIndexNumber || '',
      completionDate: new Date(),
      award: award || 'Uganda Advanced Certificate of Education (UACE)',
      alumniVerified: true
    };

    await student.save();

    await logAudit(req, {
      action: 'student.status-changed',
      module: 'students',
      recordId: student._id,
      recordRef: student.studentId,
      newValue: { status: 'graduated', graduationYear: student.graduationDetails.graduationYear },
      description: `Student ${student.studentId} graduated and was added to the alumni directory`,
    });

    res.json({ message: 'Student successfully graduated and enrolled in Alumni database', student });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
