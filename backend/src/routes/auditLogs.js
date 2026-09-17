const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// @desc  Get audit logs with filters
// @route GET /api/audit-logs
// Only super-admin and admin can query audit logs
router.get('/', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const {
      user,
      action,
      module,
      recordId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};
    if (user) query.user = user;
    if (action) query.action = action;
    if (module) query.module = module;
    if (recordId) query.recordId = recordId;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get audit logs for a specific record
// @route GET /api/audit-logs/record/:recordId
router.get('/record/:recordId', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find({ recordId: req.params.recordId })
      .populate('user', 'name email role')
      .sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get audit logs for the current user
// @route GET /api/audit-logs/me
router.get('/me', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
