const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  type: { type: String, enum: ['scholarship', 'sibling', 'staff', 'bursary', 'other'], required: true },
  description: { type: String, trim: true },
  amount: { type: Number, default: 0 },         // Fixed UGX discount
  percentage: { type: Number, default: 0 },     // % discount (applied first if set)
}, { _id: false });

const lineItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, trim: true },

  // Link to student via the studentId string (cross-module safe key)
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentId: { type: String, required: true, trim: true }, // e.g. "STU-2024-001"

  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'], required: true },
  academicYear: { type: Number, required: true, default: () => new Date().getFullYear() },
  classLevel: { type: String, required: true },

  lineItems: [lineItemSchema],
  discounts: [discountSchema],

  subtotal: { type: Number, required: true, min: 0 },       // sum of lineItems
  discountTotal: { type: Number, default: 0 },               // total deducted
  totalAmount: { type: Number, required: true, min: 0 },     // subtotal - discountTotal
  paidAmount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },                     // totalAmount - paidAmount

  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'overdue', 'waived'],
    default: 'unpaid',
  },
  dueDate: { type: Date, required: true },
  notes: { type: String, trim: true },

  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-update balance and status before save
invoiceSchema.pre('save', function (next) {
  this.balance = this.totalAmount - this.paidAmount;
  if (this.paidAmount >= this.totalAmount) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (new Date() > this.dueDate && this.status !== 'waived') {
    this.status = 'overdue';
  } else if (this.status !== 'waived') {
    this.status = 'unpaid';
  }
  next();
});

invoiceSchema.index({ student: 1, term: 1, academicYear: 1 });
invoiceSchema.index({ status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
