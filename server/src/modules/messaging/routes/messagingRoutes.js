const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../../../models/User');
const { protect, authorize } = require('../../../middleware/auth');

// @route GET /api/messaging/my
// @desc  Get notifications for logged-in user
router.get('/my', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    const unreadCount = await Notification.countDocuments({ recipientId: req.user._id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route PUT /api/messaging/:id/read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: { message: 'Notification not found' } });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route PUT /api/messaging/read-all
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/messaging/send
// @desc  Send targeted or broadcast notification (admin/teacher)
router.post('/send', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  const { recipientIds, broadcastAudience, title, message, category, priority, relatedModel, relatedId } = req.body;

  try {
    let targetUserIds = [];

    if (broadcastAudience && broadcastAudience !== 'none') {
      // Find all users of the given role
      const roleMap = {
        parents: 'parent',
        students: 'student',
        teachers: 'teacher',
        admins: 'admin',
      };
      const role = roleMap[broadcastAudience];
      const users = role ? await User.find({ role, isActive: true }, '_id') : await User.find({ isActive: true }, '_id');
      targetUserIds = users.map(u => u._id);
    } else if (recipientIds && recipientIds.length > 0) {
      targetUserIds = recipientIds;
    } else {
      return res.status(400).json({ error: { message: 'Provide either recipientIds or broadcastAudience' } });
    }

    const notifications = await Notification.insertMany(
      targetUserIds.map(uid => ({
        type: 'in-app',
        priority: priority || 'normal',
        senderId: req.user._id,
        senderName: req.user.name,
        recipientId: uid,
        title,
        message,
        category: category || 'announcement',
        isBroadcast: !!broadcastAudience,
        broadcastAudience: broadcastAudience || null,
        relatedModel: relatedModel || null,
        relatedId: relatedId || null,
      }))
    );

    res.status(201).json({ message: `Sent to ${notifications.length} recipient(s)`, count: notifications.length });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route DELETE /api/messaging/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user._id });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
