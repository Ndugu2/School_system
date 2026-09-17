const mongoose = require('mongoose');

/**
 * Requirement — a configurable checklist item set by school admin.
 * Examples: School Uniform, Mathematical Set, Medical Form, Passport Photo
 *
 * Admin creates these; they are then assigned to StudentRequirement per registration.
 */
const requirementSchema = new mongoose.Schema({

  name: {
    type: String,
    required: [true, 'Requirement name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['uniform', 'stationery', 'medical', 'documents', 'fees', 'other'],
    default: 'other'
  },

  // ── Applicability ─────────────────────────────────────────────────────────────
  // If null, applies to all classes/terms
  applicableClassLevels: {
    // e.g. ['S1', 'S2'] — leave empty for all levels
    type: [String],
    default: []
  },
  applicableTerms: {
    // e.g. ['Term 1'] — required only at start of year
    type: [String],
    enum: ['Term 1', 'Term 2', 'Term 3'],
    default: []
  },
  applicableBoardingStatus: {
    // 'all', 'boarding', 'day'
    type: String,
    enum: ['all', 'boarding', 'day'],
    default: 'all'
  },

  isRequired: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // ── Deadline ──────────────────────────────────────────────────────────────────
  dueDaysAfterRegistration: {
    // Number of days after registration date by which this must be submitted
    type: Number,
    default: 14
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

}, { timestamps: true });

requirementSchema.index({ isActive: 1 });

module.exports = mongoose.model('Requirement', requirementSchema);
