const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
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
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const teacher = await Teacher.findOne({ user: req.user._id }).select('classes');
      if (!teacher?.classes.some(id => String(id) === String(classId))) {
        return res.status(403).json({ error: { message: 'You may only record attendance for your assigned classes' } });
      }
    }
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
router.get('/', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher'), async (req, res) => {
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
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const teacher = await Teacher.findOne({ user: req.user._id }).select('classes');
      const classIds = teacher?.classes || [];
      if (classId && !classIds.some(id => String(id) === String(classId))) {
        return res.status(403).json({ error: { message: 'Not authorized to view attendance for this class' } });
      }
      filter.class = classId || { $in: classIds };
    }
    if (req.user.role === 'parent') {
      if (!studentId) return res.status(400).json({ error: { message: 'studentId is required for parent attendance' } });
      const student = await Student.findOne({ _id: studentId, $or: [{ parentUser: req.user._id }, { parentEmail: req.user.email }] });
      if (!student) return res.status(403).json({ error: { message: 'Not authorized to view this attendance record' } });
    }
    if (req.user.role === 'student') {
      if (!studentId) return res.status(400).json({ error: { message: 'studentId is required for student attendance' } });
      const student = await Student.findOne({ _id: studentId, user: req.user._id });
      if (!student) return res.status(403).json({ error: { message: 'Not authorized to view this attendance record' } });
    }
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

// @route   GET /api/attendance/analytics
// @desc    Calculate Daily, Weekly, Monthly, and Term Attendance rates + Frequently Absent Students
// @access  Private
router.get('/analytics', protect, authorize('admin', 'super-admin', 'supervisor', 'deputy-head', 'academic-admin', 'class-teacher', 'teacher'), async (req, res) => {
  try {
    const { classId, term, date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(targetDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const baseFilter = {};
    if (classId) baseFilter.class = classId;
    if (term) baseFilter.term = term;
    if (['teacher', 'class-teacher'].includes(req.user.role)) {
      const teacher = await Teacher.findOne({ user: req.user._id }).select('classes');
      const classIds = teacher?.classes || [];
      if (classId && !classIds.some(id => String(id) === String(classId))) {
        return res.status(403).json({ error: { message: 'Not authorized to view attendance analytics for this class' } });
      }
      baseFilter.class = classId || { $in: classIds };
    }

    const [dailyRecords, weeklyRecords, monthlyRecords, termRecords] = await Promise.all([
      Attendance.find({ ...baseFilter, date: targetDate }),
      Attendance.find({ ...baseFilter, date: { $gte: sevenDaysAgo, $lte: targetDate } }),
      Attendance.find({ ...baseFilter, date: { $gte: thirtyDaysAgo, $lte: targetDate } }),
      Attendance.find(baseFilter).populate({
        path: 'student',
        select: 'studentId admissionNumber parentPhone currentClassLevel currentStream',
        populate: { path: 'user', select: 'name' }
      })
    ]);

    const calcRate = (records) => {
      if (!records || records.length === 0) return { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 100 };
      const present = records.filter(r => r.status === 'Present').length;
      const late = records.filter(r => r.status === 'Late').length;
      const absent = records.filter(r => r.status === 'Absent').length;
      const excused = records.filter(r => r.status === 'Excused').length;
      const rate = Math.round(((present + late + excused) / records.length) * 100);
      return { total: records.length, present, absent, late, excused, rate };
    };

    // Frequently absent students in this term (absent >= 3 times)
    const absenceMap = {};
    termRecords.forEach(r => {
      if (r.status === 'Absent' && r.student) {
        const sid = r.student._id?.toString();
        if (!sid) return;
        if (!absenceMap[sid]) {
          absenceMap[sid] = {
            student: r.student,
            absentCount: 0,
            dates: []
          };
        }
        absenceMap[sid].absentCount++;
        absenceMap[sid].dates.push(r.date ? new Date(r.date).toISOString().split('T')[0] : '');
      }
    });

    const frequentlyAbsent = Object.values(absenceMap)
      .filter(item => item.absentCount >= 3)
      .sort((a, b) => b.absentCount - a.absentCount);

    res.json({
      date: targetDate.toISOString().split('T')[0],
      daily: calcRate(dailyRecords),
      weekly: calcRate(weeklyRecords),
      monthly: calcRate(monthlyRecords),
      term: calcRate(termRecords),
      frequentlyAbsent
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
