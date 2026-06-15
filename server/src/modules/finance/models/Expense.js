const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['utilities', 'maintenance', 'supplies', 'transport', 'salaries', 'equipment', 'events', 'other'],
    required: true,
  },
  vendor: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },  // UGX
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, trim: true },
  receiptUrl: { type: String, trim: true },

  paymentMethod: { type: String, enum: ['cash', 'bank', 'momo', 'cheque'], default: 'cash' },
  referenceNumber: { type: String, trim: true },

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },

  academicYear: { type: Number, default: () => new Date().getFullYear() },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'] },
}, { timestamps: true });

expenseSchema.index({ category: 1, academicYear: 1 });
expenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
