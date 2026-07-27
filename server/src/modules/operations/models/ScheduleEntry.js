const mongoose = require('mongoose');

const scheduleEntrySchema = new mongoose.Schema({
  // Core scheduling info
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  classLevel: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  subjectName: { type: String, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherName: { type: String },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomName: { type: String },

  // Time info
  dayOfWeek: { type: Number, required: true, min: 1, max: 5 }, // 1=Mon, 5=Fri
  period: { type: Number, required: true, min: 1, max: 10 },    // Period number in day
  startTime: { type: String, required: true },  // "08:00"
  endTime: { type: String, required: true },    // "09:00"

  entryType: { type: String, enum: ['class', 'exam', 'club', 'assembly', 'break'], default: 'class' },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'], required: true },
  academicYear: { type: Number, required: true, default: () => new Date().getFullYear() },

  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

// Compound indexes for conflict detection
scheduleEntrySchema.index({ teacher: 1, dayOfWeek: 1, period: 1, term: 1, academicYear: 1 });
scheduleEntrySchema.index({ room: 1, dayOfWeek: 1, period: 1, term: 1, academicYear: 1 });
scheduleEntrySchema.index({ class: 1, dayOfWeek: 1, period: 1, term: 1, academicYear: 1 });

module.exports = mongoose.model('ScheduleEntry', scheduleEntrySchema);
