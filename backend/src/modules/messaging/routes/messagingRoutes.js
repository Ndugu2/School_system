const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../../../models/User');
const Message = require('../../../models/Message');
const { protect, authorize } = require('../../../middleware/auth');

const STAFF_ROLES = [
  'super-admin', 'admin', 'supervisor', 'deputy-head', 'bursar',
  'inventory-manager', 'registrar', 'academic-admin', 'class-teacher', 'teacher'
];

// @route GET /api/messaging/contacts
// @desc  People a parent or staff member may safely contact
router.get('/contacts', protect, async (req, res) => {
  try {
    if (req.user.role !== 'parent' && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Messaging is available to parents and school staff only' } });
    }
    const query = req.user.role === 'parent'
      ? { role: { $in: STAFF_ROLES }, isActive: true }
      : { role: 'parent', isActive: true };
    const contacts = await User.find(query, 'name role email avatar').sort({ name: 1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route GET /api/messaging/conversations
// @desc  Get direct messages involving the signed-in user
router.get('/conversations', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }]
    })
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar')
      .sort({ createdAt: 1 })
      .limit(500);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/messaging/conversations
// @desc  Start or continue a direct parent-school conversation
router.post('/conversations', protect, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ error: { message: 'A recipient and message are required' } });
    }
    const recipient = await User.findOne({ _id: recipientId, isActive: true });
    if (!recipient) return res.status(404).json({ error: { message: 'Recipient not found' } });

    const validPair = (req.user.role === 'parent' && STAFF_ROLES.includes(recipient.role)) ||
      (STAFF_ROLES.includes(req.user.role) && recipient.role === 'parent');
    if (!validPair) {
      return res.status(403).json({ error: { message: 'Direct messages are only available between parents and school staff' } });
    }

    const message = await Message.create({ sender: req.user._id, recipient: recipient._id, content: content.trim() });
    await message.populate('sender', 'name role avatar');
    await message.populate('recipient', 'name role avatar');
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route PUT /api/messaging/conversations/:id/read
router.put('/conversations/:id/read', protect, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!message) return res.status(404).json({ error: { message: 'Message not found' } });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

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
