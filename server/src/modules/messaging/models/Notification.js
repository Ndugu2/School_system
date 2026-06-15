const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['in-app', 'sms', 'email'], default: 'in-app' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

  // Sender
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String, trim: true },

  // Recipient
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientStringId: { type: String, trim: true }, // studentId or staffId for cross-module
  recipientRole: { type: String, enum: ['parent', 'student', 'teacher', 'admin', 'super-admin'] },

  // Content
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['finance', 'attendance', 'grade', 'event', 'announcement', 'inventory', 'system'],
    default: 'announcement',
  },

  // Related document reference (optional)
  relatedModel: { type: String, trim: true }, // e.g. "Invoice", "Event"
  relatedId: { type: mongoose.Schema.Types.ObjectId },

  readAt: { type: Date, default: null },
  isRead: { type: Boolean, default: false },

  // For broadcast messages
  isBroadcast: { type: Boolean, default: false },
  broadcastAudience: { type: String, enum: ['all', 'parents', 'students', 'teachers', 'admins', null], default: null },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
