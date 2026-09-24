const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['utilities', 'maintenance', 'supplies', 'transport', 'salaries', 'equipment', 'events', 'tours', 'welfare', 'other'],
    required: true,
  },
  vendor: { type: String, trim: true },
  billNumber: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },  // UGX
  paidAmount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  date: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date },
  description: { type: String, trim: true },
  receiptUrl: { type: String, trim: true },

  expenseAccountCode: { type: String, default: '5040' },
  expenseAccountName: { type: String, default: 'Utilities & General Expenses' },

  paymentMethod: { type: String, enum: ['cash', 'bank', 'momo', 'cheque', 'Bank Transfer', 'MTN Mobile Money', 'Airtel Money', 'Cash'], default: 'cash' },
  referenceNumber: { type: String, trim: true },
  paidFromAccountCode: { type: String },
  paidFromAccountName: { type: String },

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid', 'partial'], default: 'pending' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },

  journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  paymentJournalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

  academicYear: { type: Number, default: () => new Date().getFullYear() },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'] },
}, { timestamps: true });

expenseSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isModified('paidAmount')) {
    this.balance = Math.max(0, (this.amount || 0) - (this.paidAmount || 0));
    if (this.paidAmount >= this.amount && this.amount > 0) {
      this.status = 'paid';
    } else if (this.paidAmount > 0) {
      this.status = 'partial';
    }
  }
  next();
});

expenseSchema.index({ category: 1, academicYear: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ billNumber: 1 });

module.exports = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
