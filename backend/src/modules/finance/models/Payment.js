const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentId: {
    type: String,
    trim: true
  },
  studentName: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'MTN Mobile Money', 'Airtel Money', 'Cheque', 'POS / Card', 'Other'],
    default: 'Bank Transfer'
  },
  depositAccount: {
    // Reference to Account code, e.g. "1010", "1020", "1040"
    type: String,
    required: true,
    default: '1020'
  },
  depositAccountName: {
    type: String,
    default: 'Stanbic Bank Main Operating'
  },
  transactionReference: {
    type: String,
    trim: true
  },
  payerName: {
    type: String,
    trim: true
  },
  payerPhone: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

paymentSchema.index({ invoice: 1, paymentDate: -1 });
paymentSchema.index({ student: 1 });

module.exports = mongoose.models.LedgerPayment || mongoose.model('LedgerPayment', paymentSchema);
