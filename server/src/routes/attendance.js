const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/attendance
// @desc    Record or update attendance in bulk for a class
// @access  Private (Admin/Super-Admin/Teacher)
router.post('/', protect, authorize('admin', 'super-admin', 'teacher'), async (req, res) => {
  const { classId, date, term, records } = req.body; // records: [{ student: id, status: 'Present'|'Absent'|... }]

  if (!classId || !date || !term || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: { message: 'Missing required fields or invalid records format' } });
  }

  try {
    const formattedDate = new Date(date);
    formattedDate.setHours(0,0,0,0);

    // 2. Find student parent details to trigger SMS notifications
    const AttendanceModel = require('../models/Attendance');
    const { sendSMS } = require('../modules/messaging/services/smsService');

    const bulkOperations = records.map(record => ({
      updateOne: {
        filter: { student: record.student, date: formattedDate },
        update: {
          class: classId,
          status: record.status,
          term,
          remarks: record.remarks || ''
        },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(bulkOperations);

    // Trigger asynchronous SMS alerts for absent students
    const absentRecords = records.filter(r => r.status === 'Absent');
    if (absentRecords.length > 0) {
      const studentIds = absentRecords.map(r => r.student);
      Student.find({ _id: { $in: studentIds } }).populate('user').then(students => {
        students.forEach(student => {
          if (student.parentPhone) {
            const smsMessage = `Ndugu Academy Notification: Dear Parent/Guardian, please note that ${student.user?.name || 'your child'} was marked ABSENT today (${date}). Kindly follow up.`;
            sendSMS(student.parentPhone, smsMessage).catch(console.error);
          }
        });
      }).catch(console.error);
    }

    res.status(200).json({ message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Attendance submit error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/attendance
// @desc    Get attendance reports/records (filter by class, student, date)
// @access  Private
router.get('/', protect, async (req, res) => {
  const { classId, studentId, date, term } = req.query;
  const filter = {};

  if (classId) filter.class = classId;
  if (studentId) filter.student = studentId;
  if (term) filter.term = term;
  if (date) {
    const formattedDate = new Date(date);
    formattedDate.setHours(0,0,0,0);
    filter.date = formattedDate;
  }

  try {
    const records = await Attendance.find(filter)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('class');
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
