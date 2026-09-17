const express = require('express');
const router = express.Router();
const BehaviourIncident = require('../models/BehaviourIncident');
const { protect, authorize } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/behaviour/incidents
router.get('/incidents', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, type, severity, term, academicYear, classId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (studentId) query.student = studentId;
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (classId) query.class = classId;

    const incidents = await BehaviourIncident.find(query)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('class', 'name level')
      .populate('reportedBy', 'name')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BehaviourIncident.countDocuments(query);
    res.json({ incidents, total });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/behaviour/incidents
router.post('/incidents', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const incident = await BehaviourIncident.create({
      ...req.body,
      reportedBy: req.user._id,
      reporterName: req.user.name,
      academicYear: req.body.academicYear || new Date().getFullYear(),
    });
    res.status(201).json(incident);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/behaviour/incidents/:id
router.put('/incidents/:id', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const incident = await BehaviourIncident.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!incident) return res.status(404).json({ error: { message: 'Incident not found' } });
    res.json(incident);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// DELETE /api/behaviour/incidents/:id
router.delete('/incidents/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    await BehaviourIncident.findByIdAndDelete(req.params.id);
    res.json({ message: 'Incident deleted' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/stats', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const year = parseInt(req.query.academicYear) || new Date().getFullYear();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, recent, byType, bySeverity, followUpPending, byDescriptor] = await Promise.all([
      BehaviourIncident.countDocuments({ academicYear: year }),
      BehaviourIncident.countDocuments({ date: { $gte: thirtyDaysAgo } }),
      BehaviourIncident.aggregate([
        { $match: { academicYear: year } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      BehaviourIncident.aggregate([
        { $match: { academicYear: year, type: 'negative' } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      BehaviourIncident.countDocuments({ followUpRequired: true, followUpNotes: { $exists: false }, academicYear: year }),
      BehaviourIncident.aggregate([
        { $match: { academicYear: year } },
        { $group: { _id: '$descriptor', count: { $sum: 1 }, type: { $first: '$type' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ total, recent, byType, bySeverity, followUpPending, byDescriptor });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/behaviour/student/:studentId — behaviour history for one student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const year = parseInt(req.query.academicYear) || new Date().getFullYear();
    const incidents = await BehaviourIncident.find({ student: req.params.studentId, academicYear: year })
      .populate('reportedBy', 'name')
      .sort({ date: -1 });
    const positive = incidents.filter(i => i.type === 'positive').length;
    const negative = incidents.filter(i => i.type === 'negative').length;
    res.json({ incidents, summary: { positive, negative, total: incidents.length } });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
