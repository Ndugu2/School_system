const mongoose = require('mongoose');

const permissionSlipSchema = new mongoose.Schema({
  studentId: { type: String, required: true, trim: true },
  studentName: { type: String, trim: true },
  parentName: { type: String, trim: true },
  signedAt: { type: Date },
  status: { type: String, enum: ['pending', 'signed', 'declined'], default: 'pending' },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['trip', 'sports', 'pta', 'exam', 'graduation', 'fundraiser', 'workshop', 'holiday', 'other'],
    required: true,
  },
  description: { type: String, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, trim: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },

  targetAudience: {
    type: String,
    enum: ['all', 'students', 'teachers', 'parents', 'specific-class'],
    default: 'all',
  },
  targetClassLevels: [{ type: String }], // e.g. ["S4", "S6"] for specific classes

  requiresPermissionSlip: { type: Boolean, default: false },
  permissionSlips: [permissionSlipSchema],
  permissionDeadline: { type: Date },

  cost: { type: Number, default: 0 }, // UGX per student
  maxParticipants: { type: Number },

  status: { type: String, enum: ['draft', 'published', 'cancelled', 'completed'], default: 'draft' },

  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerName: { type: String, trim: true },

  academicYear: { type: Number, default: () => new Date().getFullYear() },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'] },
}, { timestamps: true });

eventSchema.index({ startDate: 1 });
eventSchema.index({ type: 1, academicYear: 1 });

module.exports = mongoose.model('Event', eventSchema);
