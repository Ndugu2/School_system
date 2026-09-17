const mongoose = require('mongoose');

/**
 * StudentRequirement — tracks whether a specific student has submitted
 * a specific requirement for a specific registration (term).
 *
 * Generated automatically when a student is registered,
 * based on all active Requirement records that match their class/term/boarding status.
 */
const studentRequirementSchema = new mongoose.Schema({

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  registration: {
    // The Registration record this belongs to
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: true
  },
  requirement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
    required: true
  },

  // ── Denormalized for display ──────────────────────────────────────────────────
  requirementName: { type: String, trim: true },
  requirementCategory: { type: String, trim: true },
  isRequired: { type: Boolean, default: true },

  // ── Submission Tracking ───────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected', 'waived'],
    default: 'pending'
  },
  submittedDate: { type: Date },
  verifiedDate: { type: Date },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedDate: { type: Date },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: { type: String, trim: true },
  waivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  waiverReason: { type: String, trim: true },
  dueDate: { type: Date },
  notes: { type: String, trim: true },

}, { timestamps: true });

// A student can only have one StudentRequirement per requirement per registration
studentRequirementSchema.index(
  { student: 1, registration: 1, requirement: 1 },
  { unique: true, name: 'unique_student_requirement_per_registration' }
);
studentRequirementSchema.index({ registration: 1, status: 1 });
studentRequirementSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model('StudentRequirement', studentRequirementSchema);
