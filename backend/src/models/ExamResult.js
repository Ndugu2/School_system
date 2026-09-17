const mongoose = require('mongoose');

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
    enum: ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9', ''],
    default: ''
  },
  gradePoints: {
    // 1 (D1) → 9 (F9) — lower is better in Uganda UCE/UACE grading
    type: Number,
    min: 1,
    max: 9
  },
  remarks: {
    type: String,
    trim: true
  },

  // ── Approval Workflow ─────────────────────────────────────────────────────────
  approvalStatus: {
    type: String,
    enum: ['draft', 'hod-approved', 'admin-approved', 'published'],
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
examResultSchema.pre('save', function (next) {
  if (this.marksObtained !== undefined && this.maxMarks) {
    this.percentage = Math.round((this.marksObtained / this.maxMarks) * 100);

    // Uganda UCE/UACE grading (percentage-based)
    const p = this.percentage;
    if (p >= 80)      { this.grade = 'D1'; this.gradePoints = 1; }
    else if (p >= 70) { this.grade = 'D2'; this.gradePoints = 2; }
    else if (p >= 65) { this.grade = 'C3'; this.gradePoints = 3; }
    else if (p >= 60) { this.grade = 'C4'; this.gradePoints = 4; }
    else if (p >= 55) { this.grade = 'C5'; this.gradePoints = 5; }
    else if (p >= 50) { this.grade = 'C6'; this.gradePoints = 6; }
    else if (p >= 45) { this.grade = 'P7'; this.gradePoints = 7; }
    else if (p >= 40) { this.grade = 'P8'; this.gradePoints = 8; }
    else              { this.grade = 'F9'; this.gradePoints = 9; }
  }
  next();
});

// ── One result per student per subject per exam type per term ──────────────────
examResultSchema.index(
  { student: 1, subject: 1, examType: 1, term: 1, academicYear: 1 },
  { unique: true, name: 'unique_result_per_student_subject_examtype' }
);
examResultSchema.index({ class: 1, term: 1, academicYear: 1, approvalStatus: 1 });
examResultSchema.index({ student: 1, academicYear: 1, approvalStatus: 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
