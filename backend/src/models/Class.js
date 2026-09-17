const mongoose = require('mongoose');

// ─── Stream (embedded within Class) ──────────────────────────────────────────
const streamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Stream name is required (e.g. East, West, A, B)'],
    trim: true
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  capacity: {
    type: Number,
    default: 40
  }
}, { _id: true, timestamps: false });

// ─── Class ────────────────────────────────────────────────────────────────────
const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required (e.g. Senior 1, S1)'],
    trim: true
  },
  level: {
    type: String,
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    required: [true, 'Class level (S1–S6) is required']
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: [true, 'Academic year reference is required']
  },
  // Legacy: keep for backward compat; new code uses AcademicYear ref
  academicYearValue: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  streams: {
    type: [streamSchema],
    default: []
  },
  // Class-level teacher (not stream-specific)
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

classSchema.index({ level: 1, academicYear: 1 });

module.exports = mongoose.model('Class', classSchema);
