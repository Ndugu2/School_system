const mongoose = require('mongoose');
const { getGradingScheme, gradeForPercentage } = require('../utils/grading');

/**
 * ExamResult — a teacher-entered mark for one student in one subject for one exam type.
 *
 * APPROVAL WORKFLOW:
 *   Teacher enters → status: 'draft'
 *   HoD approves   → status: 'hod-approved'
 *   Academic Admin  → status: 'published'   (visible to students/parents)
 *
 * Results can only be edited while in 'draft' status.
 * After HoD approval, corrections require reverting to draft (audit logged).
 */
const examResultSchema = new mongoose.Schema({

  // ── Core Links ────────────────────────────────────────────────────────────────
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  registration: {
    // Link to the Registration record for this term
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    default: null
  },

  // ── Academic Period ───────────────────────────────────────────────────────────
  academicYear: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  classLevel: {
    // Snapshot: 'S1', 'S2', etc.
    type: String,
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    required: true
  },
  streamName: {
    // e.g. 'East', 'West'
    type: String,
    trim: true
  },

  // ── Exam Type ─────────────────────────────────────────────────────────────────
  examType: {
    type: String,
    enum: [
      'BOT',        // Beginning of Term test
      'MOT',        // Mid-Term test
      'EOT',        // End of Term exam
      'coursework', // Ongoing/project work
      'assignment', // Homework
      'mock',       // Mock exam (S4/S6 final year)
    ],
    required: true,
    default: 'EOT'
  },

  // ── Marks ─────────────────────────────────────────────────────────────────────
  marksObtained: {
    type: Number,
    required: true,
    min: 0
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100,
    min: 1
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },

  // ── Uganda Grading Scale ──────────────────────────────────────────────────────
  grade: {
    type: String,
    default: ''
  },
  gradePoints: {
    // Grade points follow the school's configured scheme.
    type: Number,
    min: 0,
    max: 100
  },
  remarks: {
    type: String,
    trim: true
  },

  // ── Approval Workflow ─────────────────────────────────────────────────────────
  approvalStatus: {
    type: String,
    enum: ['draft', 'submitted', 'hod-approved', 'admin-approved', 'published'],
    default: 'draft'
  },

  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enteredByName: { type: String, trim: true },

  hodApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hodApprovedAt: { type: Date },
  hodNotes: { type: String, trim: true },

  adminApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminApprovedAt: { type: Date },

  publishedAt: { type: Date },
  unpublishedAt: { type: Date },

}, { timestamps: true });

// ── Auto-calculate percentage and Uganda grade before save ─────────────────────
examResultSchema.pre('save', async function () {
  if (this.marksObtained !== undefined && this.maxMarks) {
    this.percentage = Math.round((this.marksObtained / this.maxMarks) * 100);
    const scheme = await getGradingScheme(this.classLevel, this.academicYear);
    const band = gradeForPercentage(this.percentage, scheme.gradeBands);
    this.grade = band.grade;
    this.gradePoints = band.points;
  }
});

// ── One result per student per subject per exam type per term ──────────────────
examResultSchema.index(
  { student: 1, subject: 1, examType: 1, term: 1, academicYear: 1 },
  { unique: true, name: 'unique_result_per_student_subject_examtype' }
);
examResultSchema.index({ class: 1, term: 1, academicYear: 1, approvalStatus: 1 });
examResultSchema.index({ student: 1, academicYear: 1, approvalStatus: 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
