const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  // Links to staff by string ID (cross-module safe)
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId: { type: String, required: true, trim: true },
  staffName: { type: String, required: true, trim: true },
  staffRole: { type: String, enum: ['teacher', 'admin', 'support'], required: true },

  month: { type: Number, required: true, min: 1, max: 12 },  // 1=Jan, 12=Dec
  year: { type: Number, required: true },

  baseSalary: { type: Number, required: true, min: 0 },  // UGX
  allowances: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  }],
  deductions: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  }],

  grossPay: { type: Number, default: 0 },  // baseSalary + sum(allowances)
  totalDeductions: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },   // grossPay - totalDeductions

  paymentMethod: { type: String, enum: ['bank', 'momo', 'cash'], default: 'bank' },
  bankAccount: { type: String, trim: true },
  transactionRef: { type: String, trim: true },

  status: { type: String, enum: ['pending', 'approved', 'processed', 'cancelled'], default: 'pending' },
  processedAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
}, { timestamps: true });

// Auto-calculate gross, deductions, net before save
payrollSchema.pre('save', function (next) {
  const allowTotal = (this.allowances || []).reduce((s, a) => s + a.amount, 0);
  const deductTotal = (this.deductions || []).reduce((s, d) => s + d.amount, 0);
  this.grossPay = this.baseSalary + allowTotal;
  this.totalDeductions = deductTotal;
  this.netPay = this.grossPay - this.totalDeductions;
  next();
});

payrollSchema.index({ staff: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ status: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
