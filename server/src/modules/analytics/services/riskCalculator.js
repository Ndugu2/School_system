const Student = require('../../../models/Student');
const Attendance = require('../../../models/Attendance');
const { QuizAttempt, Submission } = require('../../lms/models');
const RiskProfile = require('../models/RiskProfile');
const { sendCriticalRiskEmail } = require('../services/emailService');

/**
 * Calculates risk scores for all students and updates RiskProfile documents.
 * Sends email alerts for students flagged as critical.
 * Returns summary of updates and number of critical risks.
 */
async function calculateAllRisk() {
  const students = await Student.find({});
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const results = { updated: 0, critical: 0 };

  for (const student of students) {
    // Attendance Drop
    const recentAttendance = await Attendance.find({ student: student._id, date: { $gte: thirtyDaysAgo } });
    const presentCount = recentAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = recentAttendance.length > 0 ? (presentCount / recentAttendance.length) * 100 : 100;
    const attendanceDrop = 100 - attendanceRate;

    // Low Quiz Scores
    const recentQuizzes = await QuizAttempt.find({ student: student._id }).sort({ completedAt: -1 }).limit(5);
    const lowScores = recentQuizzes.filter(q => q.percentage < 50).length;

    // Missing Assignments
    const missingSubmissions = await Submission.find({ student: student._id, isLate: true, gradedScore: { $exists: false } }).countDocuments();

    // Weighted risk score
    let riskScore = 0;
    riskScore += Math.min(attendanceDrop * 1.5, 50); // up to 50 points
    riskScore += Math.min(lowScores * 10, 30); // up to 30 points
    riskScore += Math.min(missingSubmissions * 5, 20); // up to 20 points

    let category = 'low';
    if (riskScore >= 75) category = 'critical';
    else if (riskScore >= 50) category = 'high';
    else if (riskScore >= 25) category = 'medium';

    await RiskProfile.findOneAndUpdate(
      { student: student._id },
      {
        riskScore,
        riskCategory: category,
        factors: {
          attendanceDrop,
          missingAssignments: missingSubmissions,
          lowQuizScores: lowScores
        },
        lastCalculatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    results.updated++;
    if (category === 'critical') {
      results.critical++;
      // send email alert
      await sendCriticalRiskEmail(student, {
        riskScore,
        factors: { attendanceDrop, missingAssignments: missingSubmissions, lowQuizScores: lowScores }
      });
    }
  }
  return results;
}

/**
 * Retrieves the risk profile for a single student by ID.
 */
async function getRiskProfile(studentId) {
  return await RiskProfile.findOne({ student: studentId })
    .populate({ path: 'student', populate: { path: 'user', select: 'name' } });
}

module.exports = { calculateAllRisk, getRiskProfile };
