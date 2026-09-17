const mongoose = require('mongoose');

/**
 * Registration — links a Student to a specific Academic Year → Term → Class → Stream.
 *
 * KEY DESIGN PRINCIPLE:
 * Enrollment (Admissions) is a one-time event.
 * Registration is a per-term/per-year event. A student gets a new Registration
 * record every term they are active. This enables:
 *   - Full academic history
 *   - Class promotions without touching the Student record
 *   - Per-term reporting and filtering
 */
const registrationSchema = new mongoose.Schema({

  // ── Core Links ──────────────────────────────────────────────────────────────
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: [true, 'Academic year is required']
  },
  term: {
    // Name of the term, e.g. 'Term 1' — refers to AcademicYear.terms[].name
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: [true, 'Term is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  streamId: {
    // ObjectId of the specific stream within Class.streams[]
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  streamName: {
    // Denormalized for quick display (e.g. 'East', 'West', 'A')
    type: String,
    trim: true,
    default: null
  },

  // ── Student Details at Time of Registration ─────────────────────────────────
  classLevel: {
    // Snapshot of class level at registration time (e.g. 'S3')
    type: String,
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    required: true
  },
  boardingStatus: {
    type: String,
    enum: ['day', 'boarding'],
    default: 'day'
  },
  previousClass: {
    // Class level in the previous term/year (for promotion tracking)
    type: String,
    trim: true
  },
  subjectCombination: {
    // For A-level (S5/S6): e.g. 'PCB', 'HEG', 'MCE'
    type: String,
    trim: true
  },
  subjects: [{
    // Subjects registered for this term
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],

  // ── Registration Status & Multi-Stage Clearance Workflow ───────────────────
  status: {
    type: String,
    enum: [
      'enrolled',     // Placed in class/term, awaiting registration clearance
      'registered',   // Fully cleared & active for this term
      'deferred',     // Delayed start
      'cancelled',    // Withdrawn for this term
      'promoted',     // Moved up at end of term/year
      'repeated'      // Repeating same level
    ],
    default: 'enrolled'
  },
  registrationStage: {
    type: String,
    enum: ['enrolled', 'fee_assessed', 'materials_checked', 'parent_confirmed', 'approved'],
    default: 'enrolled'
  },
  feeClearanceStatus: {
    type: String,
    enum: ['pending', 'partial', 'cleared'],
    default: 'pending'
  },
  materialsCheckStatus: {
    type: String,
    enum: ['pending', 'partial', 'verified'],
    default: 'pending'
  },
  parentConfirmed: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  registrationNumber: {
    // Auto-generated: REG-2026-T1-0001
    type: String,
    unique: true,
    trim: true
  },

  // ── Requirements Snapshot ───────────────────────────────────────────────────
  outstandingRequirements: [{
    requirementName: String,
    dueBy: Date
  }],
  allRequirementsSubmitted: {
    type: Boolean,
    default: false
  },

  // ── Metadata ────────────────────────────────────────────────────────────────
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }

}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
// A student can only be registered once per academic year + term
registrationSchema.index(
  { student: 1, academicYear: 1, term: 1 },
  { unique: true, name: 'unique_student_registration_per_term' }
);
registrationSchema.index({ academicYear: 1, term: 1, class: 1 });
registrationSchema.index({ status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
