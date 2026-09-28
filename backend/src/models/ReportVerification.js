const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * ReportVerification — persisted record backing the QR code on report cards.
 *
 * The QR embeds only a random verification ID (NOT student data). `/verify/:token`
 * resolves the ID to this record, so a report can be reliably re-verified,
 * revoked, or audited server-side even long after it was issued.
 */
const reportVerificationSchema = new mongoose.Schema({
  verificationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active'
  },
  // The exact report this token authenticates.
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  studentName: { type: String, trim: true, default: '' },
  classLevel: { type: String, trim: true, default: '' },
  term: { type: String, trim: true, default: '' },
  academicYear: { type: Number },
  reportType: {
    type: String,
    enum: ['ncdc', 'uace'],
    required: true
  },
  // Immutable snapshot: only what is shown on the printed card.
  snapshot: {
    studentName: String,
    classLevel: String,
    term: String,
    academicYear: Number,
    reportType: String,
    finalMark: { type: Number, default: null },
    aggregate: { type: Number, default: null },
    issuedAt: { type: Date, default: Date.now }
  },
  // Optional stored teacher/headteacher comments (preferred over generated ones).
  comments: {
    type: new mongoose.Schema(
      {
        classTeacher: { type: String, trim: true, default: '' },
        headTeacher: { type: String, trim: true, default: '' }
      },
      { _id: false }
    ),
    default: null
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  revokedAt: { type: Date, default: null },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reason: { type: String, trim: true, default: '' }
}, { timestamps: true });

reportVerificationSchema.statics.generateVerificationId = function () {
  return crypto.randomBytes(16).toString('hex');
};

reportVerificationSchema.index({ student: 1, term: 1, academicYear: 1 });

module.exports = mongoose.model('ReportVerification', reportVerificationSchema);