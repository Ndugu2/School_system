const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

  // ── User Account Link ────────────────────────────────────────────────────────
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ── Identifiers ───────────────────────────────────────────────────────────────
  studentId: {
    // Registration number (e.g. UG-2026-0001) — issued when student is created
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  admissionNumber: {
    // Formal admission number (e.g. ADM-2026-0001) — issued at admission
    type: String,
    unique: true,
    sparse: true,  // allow null for students enrolled before this field was added
    trim: true
  },

  // ── Student Status ────────────────────────────────────────────────────────────
  studentStatus: {
    type: String,
    enum: [
      'applicant',    // Application submitted, not yet admitted
      'admitted',     // Accepted, admission number issued
      'enrolled',     // Enrolled in class/term, awaiting term registration clearance
      'active',       // Currently enrolled and registered (cleared)
      'transferred',  // Moved to another school (clearance archived)
      'graduated',    // Completed S6/final programme
      'alumni',       // Former student in permanent alumni database
      'suspended',    // Temporarily suspended
      'withdrawn'     // Left without completing (dropped out)
    ],
    default: 'admitted'
  },

  // ── Licoka Operational Clearances ──────────────────────────────────────────
  financialClearance: {
    type: Boolean,
    default: false
  },
  boardingApproval: {
    type: Boolean,
    default: false
  },
  boardingApprovalDetails: {
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true }
  },

  // ── Current Class (denormalized snapshot for quick lookups) ──────────────────
  // NOTE: The authoritative class assignment lives in Registration.
  // This field is updated automatically on registration/promotion.
  currentClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  currentClassLevel: {
    // e.g. 'S3'
    type: String,
    default: null
  },
  currentStream: {
    // e.g. 'East'
    type: String,
    default: null
  },

  // ── Biodata ───────────────────────────────────────────────────────────────────
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: [true, 'Gender is required']
  },
  nationality: {
    type: String,
    trim: true,
    default: 'Ugandan'
  },
  religion: {
    type: String,
    trim: true
  },
  nationalId: {
    type: String,
    trim: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', ''],
    default: ''
  },

  // ── Address ───────────────────────────────────────────────────────────────────
  address: { type: String, trim: true },
  district: { type: String, trim: true },
  subCounty: { type: String, trim: true },
  village: { type: String, trim: true },

  // ── Parent / Guardian (Primary) ───────────────────────────────────────────────
  parentName: {
    type: String,
    required: [true, 'Parent/Guardian name is required'],
    trim: true
  },
  parentPhone: {
    type: String,
    required: [true, 'Parent/Guardian phone number is required (e.g. +2567...)']
  },
  parentEmail: { type: String, trim: true, lowercase: true },
  parentRelationship: { type: String, default: 'Guardian' },
  parentOccupation: { type: String, trim: true },
  parentUser: {
    // Link to parent's User account (if they have portal access)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ── Secondary Contact ─────────────────────────────────────────────────────────
  secondaryContactName: { type: String, trim: true },
  secondaryContactPhone: { type: String, trim: true },

  // ── Admission History ─────────────────────────────────────────────────────────
  enrollmentDate: { type: Date, default: Date.now },
  admissionTerm: { type: String, default: 'Term 1' },
  admissionYear: { type: String, default: () => String(new Date().getFullYear()) },
  previousSchool: { type: String, trim: true },

  // ── Medical ───────────────────────────────────────────────────────────────────
  allergies: { type: String, trim: true },
  medicalConditions: { type: String, trim: true },
  specialNeeds: { type: String, trim: true },

  // ── Transfer & Withdrawal Clearance ───────────────────────────────────────────
  transferDetails: {
    destinationSchool: { type: String, trim: true },
    transferDate: { type: Date },
    reason: { type: String, trim: true },
    clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true }
  },
  withdrawalDetails: {
    withdrawalDate: { type: Date },
    reason: { type: String, trim: true },
    clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true }
  },

  // ── S6 Graduation & Alumni Record ─────────────────────────────────────────────
  graduationDetails: {
    graduationYear: { type: Number },
    uaceIndexNumber: { type: String, trim: true },
    completionDate: { type: Date },
    award: { type: String, trim: true },
    alumniVerified: { type: Boolean, default: false }
  },

  // ── Photo ─────────────────────────────────────────────────────────────────────
  photoUrl: { type: String, trim: true },

}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
studentSchema.index({ studentStatus: 1 });
studentSchema.index({ currentClassLevel: 1 });
studentSchema.index({ parentPhone: 1 });

module.exports = mongoose.model('Student', studentSchema);
