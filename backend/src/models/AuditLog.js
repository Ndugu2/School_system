const mongoose = require('mongoose');

/**
 * AuditLog — immutable record of every sensitive action in the system.
 *
 * IMPORTANT: Never allow DELETE or UPDATE on this collection.
 * Logs should only ever be written (INSERT), never modified.
 */
const auditLogSchema = new mongoose.Schema({

  // ── Who ──────────────────────────────────────────────────────────────────────
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    // Denormalized for display even if user is deleted
    type: String,
    trim: true
  },
  userRole: {
    type: String,
    trim: true
  },

  // ── What ─────────────────────────────────────────────────────────────────────
  action: {
    type: String,
    required: true,
    enum: [
      // Payments & Finance
      'payment.created',
      'payment.verified',
      'payment.reversed',
      'invoice.created',
      'invoice.waived',
      'fee-structure.updated',
      // Students
      'student.created',
      'student.updated',
      'student.status-changed',
      'student.promoted',
      'student.transferred',
      // Registration
      'registration.created',
      'registration.cancelled',
      // Results
      'result.entered',
      'result.hod-approved',
      'result.admin-approved',
      'result.published',
      'result.unpublished',
      // Admissions
      'application.accepted',
      'application.rejected',
      // Users
      'user.created',
      'user.deactivated',
      'user.role-changed',
      'user.password-reset',
      // System
      'academic-year.created',
      'academic-year.activated',
      'term.activated',
      // Discipline
      'discipline.incident-recorded',
      'discipline.action-taken',
      // General
      'record.updated',
      'record.deleted'
    ]
  },

  // ── Where (Module & Record) ───────────────────────────────────────────────────
  module: {
    type: String,
    required: true,
    enum: [
      'students', 'registrations', 'admissions', 'finance',
      'payments', 'results', 'attendance', 'discipline',
      'users', 'settings', 'academic-years', 'subjects'
    ]
  },
  recordId: {
    // ObjectId of the affected document
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  recordRef: {
    // Human-readable ref (e.g. student ID "UG-2026-0001" or receipt "REC-2026-00123")
    type: String,
    trim: true
  },

  // ── Change Data ───────────────────────────────────────────────────────────────
  oldValue: {
    // Snapshot of data before change (stored as JSON string to avoid schema issues)
    type: String
  },
  newValue: {
    // Snapshot of data after change
    type: String
  },
  reason: {
    // Required for reversals, corrections, role changes
    type: String,
    trim: true
  },
  description: {
    // Human-readable summary
    type: String,
    trim: true
  },

  // ── Context ───────────────────────────────────────────────────────────────────
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  }

}, {
  // No updatedAt — audit logs are insert-only
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// ── Indexes for fast querying ─────────────────────────────────────────────────
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, recordId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
