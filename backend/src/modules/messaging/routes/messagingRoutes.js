const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../../../models/User');
const Student = require('../../../models/Student');
const Message = require('../../../models/Message');
const { protect, authorize } = require('../../../middleware/auth');
const { sendSMS } = require('../services/smsService');
const { sendMail } = require('../../../utils/email');

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
  const channels = req.body.channels || ['in-app'];
  const supportedChannels = ['in-app', 'sms', 'email'];
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: { message: 'A notification title and message are required' } });
  }
  if (!Array.isArray(channels) || channels.length === 0 || channels.some(channel => !supportedChannels.includes(channel))) {
    return res.status(400).json({ error: { message: 'channels must contain one or more of: in-app, sms, email' } });
  }

  try {
    let targetUserIds = [];

    if (broadcastAudience && broadcastAudience !== 'none') {
      const roleMap = {
        parents: 'parent',
        students: 'student',
        teachers: 'teacher',
        admins: 'admin',
      };
      const role = roleMap[broadcastAudience];
      if (!role) return res.status(400).json({ error: { message: 'Unsupported broadcast audience' } });
      const users = await User.find({ role, isActive: true }, '_id');
      targetUserIds = users.map(u => u._id);
    } else if (recipientIds && recipientIds.length > 0) {
      targetUserIds = recipientIds;
    } else {
      return res.status(400).json({ error: { message: 'Provide either recipientIds or broadcastAudience' } });
    }

    const recipients = await User.find({ _id: { $in: targetUserIds }, isActive: true }, '_id name email role');
    if (recipients.length === 0) return res.status(404).json({ error: { message: 'No active recipients found' } });

    const delivery = [];
    if (channels.includes('in-app')) {
      const notifications = await Notification.insertMany(recipients.map(user => ({
        type: 'in-app',
        priority: priority || 'normal',
        senderId: req.user._id,
        senderName: req.user.name,
        recipientId: user._id,
        title: title.trim(),
        message: message.trim(),
        category: category || 'announcement',
        isBroadcast: !!broadcastAudience,
        broadcastAudience: broadcastAudience || null,
        relatedModel: relatedModel || null,
        relatedId: relatedId || null,
      })));
      delivery.push({ channel: 'in-app', accepted: notifications.length, failed: 0 });
    }

    const parentContacts = channels.includes('sms')
      ? await Student.find({
          $or: [
            { parentUser: { $in: recipients.map(user => user._id) } },
            { parentEmail: { $in: recipients.map(user => user.email).filter(Boolean) } },
            { 'guardians.user': { $in: recipients.map(user => user._id) } },
            { 'guardians.email': { $in: recipients.map(user => user.email).filter(Boolean) } },
          ],
        }).select('parentUser parentEmail parentPhone guardians')
      : [];

    for (const channel of channels.filter(item => item !== 'in-app')) {
      let accepted = 0;
      const failures = [];
      for (const recipient of recipients) {
        const linkedStudents = channel === 'sms'
          ? parentContacts.filter(student =>
              String(student.parentUser) === String(recipient._id) ||
              (student.parentEmail && student.parentEmail.toLowerCase() === recipient.email?.toLowerCase()) ||
              (student.guardians || []).some(guardian =>
                String(guardian.user) === String(recipient._id) ||
                (guardian.email && guardian.email.toLowerCase() === recipient.email?.toLowerCase())))
          : [];
        const guardianPhone = linkedStudents.flatMap(student => student.guardians || [])
          .find(guardian =>
            guardian.phone &&
            (String(guardian.user) === String(recipient._id) ||
              guardian.email?.toLowerCase() === recipient.email?.toLowerCase())
          )?.phone;
        const destination = channel === 'email'
          ? recipient.email
          : guardianPhone || linkedStudents.find(student => student.parentPhone)?.parentPhone;
        if (!destination) {
          failures.push({ recipientId: recipient._id, error: `No ${channel} destination on file` });
          continue;
        }
        try {
          const result = channel === 'sms'
            ? await sendSMS(destination, `${title.trim()}: ${message.trim()}`)
            : await sendMail(destination, title.trim(), `<p>${message.trim().replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char])}</p>`);
          if (!result?.success && channel === 'sms') {
            failures.push({ recipientId: recipient._id, error: result?.status || 'SMS delivery was not accepted' });
          } else {
            accepted++;
          }
        } catch (err) {
          failures.push({ recipientId: recipient._id, error: err.message });
        }
      }
      delivery.push({ channel, accepted, failed: failures.length, failures });
    }

    const failed = delivery.some(result => result.failed > 0);
    res.status(failed ? 207 : 201).json({
      message: failed ? 'Notification was only partially delivered' : 'Notification delivery completed',
      count: recipients.length,
      delivery,
    });
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
