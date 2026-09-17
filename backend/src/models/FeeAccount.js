const mongoose = require('mongoose');

/**
 * FeeAccount — running ledger for a student's fees per term.
 *
 * This is the central finance record per student per term.
 * All fee movements (invoices, payments, discounts, refunds) are recorded here
 * as ledger entries to maintain a full, immutable history.
 */
const ledgerEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'invoice',       // Fee charged
      'payment',       // Money received
      'discount',      // Discount applied
      'reversal',      // Payment reversed (money returned to balance)
      'adjustment',    // Manual balance correction (super-admin only)
      'refund',        // Money returned to parent
    ],
    required: true
  },
  amount: { type: Number, required: true }, // positive = credit, negative = debit
  description: { type: String, trim: true },
  reference: { type: String, trim: true },  // receipt number, invoice number, etc.
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentReceipt' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
}, { _id: true, timestamps: false });

const feeAccountSchema = new mongoose.Schema({

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentId: { type: String, trim: true }, // denormalized

  academicYear: { type: Number, required: true },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },

  // ── Running Totals (updated on each ledger entry) ─────────────────────────────
  totalFees: {
    type: Number,
    default: 0,   // Total charged this term (sum of invoices)
    min: 0
  },
  totalPaid: {
    type: Number,
    default: 0,   // Total confirmed payments
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,   // Total discounts/scholarships
    min: 0
  },
  totalRefunded: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0,   // Outstanding: totalFees - totalPaid - totalDiscount + totalRefunded
  },

  // ── Ledger Entries ────────────────────────────────────────────────────────────
  ledger: {
    type: [ledgerEntrySchema],
    default: []
  },

}, { timestamps: true });

// ── Unique per student per term per year ──────────────────────────────────────
feeAccountSchema.index({ student: 1, academicYear: 1, term: 1 }, { unique: true });

// ── Helper: Recalculate balance from ledger ───────────────────────────────────
feeAccountSchema.methods.recalculate = function () {
  let totalFees = 0, totalPaid = 0, totalDiscount = 0, totalRefunded = 0;

  for (const entry of this.ledger) {
    switch (entry.type) {
      case 'invoice': totalFees += entry.amount; break;
      case 'payment': totalPaid += entry.amount; break;
      case 'discount': totalDiscount += entry.amount; break;
      case 'refund': totalRefunded += entry.amount; break;
      case 'reversal': totalPaid -= entry.amount; break;
    }
  }

  this.totalFees = totalFees;
  this.totalPaid = totalPaid;
  this.totalDiscount = totalDiscount;
  this.totalRefunded = totalRefunded;
  this.balance = Math.max(0, totalFees - totalPaid - totalDiscount - totalRefunded);
};

module.exports = mongoose.model('FeeAccount', feeAccountSchema);
