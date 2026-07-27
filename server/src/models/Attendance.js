const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => new Date().setHours(0,0,0,0)
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Excused'],
    required: true,
    default: 'Present'
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure a student has only one attendance record per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
