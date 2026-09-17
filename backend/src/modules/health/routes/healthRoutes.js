const express = require('express');
const router = express.Router();
const HealthProfile = require('../models/HealthProfile');
const HealthRecord = require('../models/HealthRecord');
const Student = require('../../../models/Student');
const { protect, authorize } = require('../../../middleware/auth');
const { canAccessStudent } = require('../../../middleware/recordAccess');

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH PROFILES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/health/profiles — list all (admin/teacher)
router.get('/profiles', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const profiles = await HealthProfile.find()
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ createdAt: -1 });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/health/profiles/:studentId
router.get('/profiles/:studentId', protect, async (req, res) => {
  try {
    if (!(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this health profile' } });
    }
    let profile = await HealthProfile.findOne({ student: req.params.studentId })
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } });
    // Auto-create empty profile if none exists
    if (!profile) {
      profile = await HealthProfile.create({ student: req.params.studentId });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// PUT /api/health/profiles/:studentId — upsert
router.put('/profiles/:studentId', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const profile = await HealthProfile.findOneAndUpdate(
      { student: req.params.studentId },
      req.body,
      { upsert: true, new: true, runValidators: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH RECORDS (Visit Log)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/health/records?studentId=&visitType=&from=&to=
router.get('/records', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, visitType, from, to, page = 1, limit = 50 } = req.query;
    const query = {};
    if (studentId) query.student = studentId;
    if (visitType) query.visitType = visitType;
    if (from || to) {
      query.visitDate = {};
      if (from) query.visitDate.$gte = new Date(from);
      if (to) query.visitDate.$lte = new Date(to);
    }

    const records = await HealthRecord.find(query)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('attendedBy', 'name')
      .sort({ visitDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await HealthRecord.countDocuments(query);
    res.json({ records, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/health/records — log a new visit
router.post('/records', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const record = await HealthRecord.create({
      ...req.body,
      attendedBy: req.user._id,
      attendingNurse: req.user.name,
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/health/records/:id
router.put('/records/:id', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const record = await HealthRecord.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: { message: 'Record not found' } });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// DELETE /api/health/records/:id
router.delete('/records/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    await HealthRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Health record deleted' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH STATS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/health/stats
router.get('/stats', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalVisits, recentVisits, byType, sentHome, activeProfiles] = await Promise.all([
      HealthRecord.countDocuments(),
      HealthRecord.countDocuments({ visitDate: { $gte: thirtyDaysAgo } }),
      HealthRecord.aggregate([
        { $group: { _id: '$visitType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      HealthRecord.countDocuments({ outcome: 'sent-home', visitDate: { $gte: thirtyDaysAgo } }),
      HealthProfile.countDocuments(),
    ]);

    res.json({ totalVisits, recentVisits, byType, sentHome, activeProfiles });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
