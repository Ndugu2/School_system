const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required (e.g. Mathematics, English, Physics)'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Subject code is required (e.g. MTH, ENG, PHY)'],
    trim: true,
    uppercase: true
  },

  // ── Classification ─────────────────────────────────────────────────────────────
  type: {
    type: String,
    enum: [
      'compulsory',   // All students must take (e.g. English, Mathematics)
      'elective',     // Student selects from a group
      'subsidiary',   // A-level subsidiary subject
      'general',      // General paper (A-level)
    ],
    default: 'compulsory'
  },
  isCompulsory: {
    // Quick flag: true = all students in applicable classes must take this
    type: Boolean,
    default: true
  },

  // ── Uganda A-level Combinations ───────────────────────────────────────────────
  // e.g. 'PCB' (Physics, Chemistry, Biology), 'HEG' (History, Economics, Geography)
  combination: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },

  // ── Class Allocation ──────────────────────────────────────────────────────────
  // A subject can be taught across multiple classes
  allocatedClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  // Legacy single class reference (keep for backward compat)
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },

  // ── Teacher Assignment ────────────────────────────────────────────────────────
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ── Applicable Levels ─────────────────────────────────────────────────────────
  applicableLevels: {
    // e.g. ['S1', 'S2'] for O-level only, ['S5', 'S6'] for A-level
    type: [String],
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    default: []
  },

  // ── Department ────────────────────────────────────────────────────────────────
  department: {
    // e.g. 'Sciences', 'Humanities', 'Languages', 'Technical'
    type: String,
    trim: true
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

// Compound index: prevent duplicate subject name per class
subjectSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
