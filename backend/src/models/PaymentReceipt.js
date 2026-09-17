const mongoose = require('mongoose');

/**
 * PaymentReceipt — immutable record of a payment made against an invoice.
 *
 * WORKFLOW:
 *   1. Bursar records payment → status: 'pending'
 *   2. Supervisor verifies    → status: 'verified'  (receipt issued)
 *   3. If error found         → status: 'reversed'  (requires reason + super-admin)
 *
 * NOTE: No direct edits are allowed after creation.
 * All corrections MUST go through the reversal workflow.
 */
const paymentReceiptSchema = new mongoose.Schema({

  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // ── Links ────────────────────────────────────────────────────────────────────
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentId: {
    // Denormalized for display
    type: String,
    trim: true
  },
  academicYear: { type: Number, required: true },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'], required: true },

  // ── Payment Details ───────────────────────────────────────────────────────────
  amount: {
    type: Number,
    required: true,
    min: [1, 'Payment amount must be at least 1']
  },
  paymentMethod: {
    type: String,
    enum: ['MTN Mobile Money', 'Airtel Money', 'Bank Deposit', 'Cash', 'Cheque'],
    required: true
  },
  transactionReference: {
    type: String,
    trim: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    trim: true
  },

  // ── Workflow Status ───────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'verified', 'reversed'],
    default: 'pending'
  },

  // ── Recorded by (step 1) ─────────────────────────────────────────────────────
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordedByName: { type: String, trim: true },

  // ── Verified by (step 2) ──────────────────────────────────────────────────────
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedByName: { type: String, trim: true },
  verifiedAt: { type: Date },

  // ── Reversal (step 3, requires reason) ───────────────────────────────────────
  reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reversedByName: { type: String, trim: true },
  reversedAt: { type: Date },
  reversalReason: { type: String, trim: true },
  // When reversed, the linked invoice balance is restored
  invoiceBalanceRestored: { type: Boolean, default: false },

}, {
  timestamps: true,
});

// ── Indexes ───────────────────────────────────────────────────────────────────
paymentReceiptSchema.index({ student: 1, academicYear: 1, term: 1 });
paymentReceiptSchema.index({ invoice: 1 });
paymentReceiptSchema.index({ status: 1 });
paymentReceiptSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);
