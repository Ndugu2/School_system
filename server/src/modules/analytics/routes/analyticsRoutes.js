const express = require('express');
const router = express.Router();
const RiskProfile = require('../models/RiskProfile');
const Student = require('../../../models/Student');
const Attendance = require('../../../models/Attendance');
const { QuizAttempt, Submission } = require('../../lms/models');
const { protect, authorize } = require('../../../middleware/auth');

// @desc  Calculate risk scores for all students (Admin triggered or Cron)
// @route POST /api/analytics/calculate-risk
router.post('/calculate-risk', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const students = await Student.find({});
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const results = { updated: 0, critical: 0 };

    for (const student of students) {
      // 1. Attendance Drop (last 30 days vs previous 30 days - simulated)
      const recentAttendance = await Attendance.find({ student: student._id, date: { $gte: thirtyDaysAgo } });
      const presentCount = recentAttendance.filter(a => a.status === 'present').length;
      const attendanceRate = recentAttendance.length > 0 ? (presentCount / recentAttendance.length) * 100 : 100;
      const attendanceDrop = 100 - attendanceRate; // Simplified drop calculation

      // 2. Low Quiz Scores
      const recentQuizzes = await QuizAttempt.find({ student: student._id }).sort({ completedAt: -1 }).limit(5);
      const lowScores = recentQuizzes.filter(q => q.percentage < 50).length;

      // 3. Missing Assignments
      const missingSubmissions = await Submission.find({ student: student._id, isLate: true, gradedScore: { $exists: false } }).countDocuments();

      // Calculate weighted risk score (max 100)
      // Weight: 50% attendance, 30% low quizzes, 20% missing assignments
      let riskScore = 0;
      riskScore += Math.min(attendanceDrop * 1.5, 50); // e.g. 20% drop = 30 points
      riskScore += Math.min(lowScores * 10, 30); // e.g. 3 low scores = 30 points
      riskScore += Math.min(missingSubmissions * 5, 20); // e.g. 4 missing = 20 points

      let category = 'low';
      if (riskScore >= 75) category = 'critical';
      else if (riskScore >= 50) category = 'high';
      else if (riskScore >= 25) category = 'medium';

      await RiskProfile.findOneAndUpdate(
        { student: student._id },
        {
          riskScore,
          riskCategory: category,
          factors: { attendanceDrop, missingAssignments: missingSubmissions, lowQuizScores: lowScores },
          lastCalculatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      results.updated++;
      if (category === 'critical') results.critical++;
    }

    res.json({ message: 'Risk calculation complete', ...results });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get At-Risk Watchlist
// @route GET /api/analytics/watchlist
router.get('/watchlist', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const watchlist = await RiskProfile.find({ riskScore: { $gte: 25 } })
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ riskScore: -1 });
    
    res.json(watchlist);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
