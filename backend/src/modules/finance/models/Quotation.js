const mongoose = require('mongoose');

const quoteLineItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, default: 'Tuition' }, // 'Tuition', 'Tour', 'Boarding', 'Uniform', 'Exam', 'Other'
  amount: { type: Number, required: true, min: 0 },
  quantity: { type: Number, default: 1, min: 1 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const quoteDiscountSchema = new mongoose.Schema({
  type: { type: String, enum: ['scholarship', 'sibling', 'staff', 'bursary', 'early_payment', 'other'], required: true },
  description: { type: String, trim: true },
  amount: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 }
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  quoteNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  studentId: {
    type: String,
    trim: true
  },
  recipientName: {
    type: String,
    required: true,
    trim: true
  },
  recipientEmail: {
    type: String,
    trim: true
  },
  recipientPhone: {
    type: String,
    trim: true
  },
  classLevel: {
    type: String,
    required: true,
    trim: true
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  academicYear: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  date: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  lineItems: [quoteLineItemSchema],
  discounts: [quoteDiscountSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discountTotal: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'declined', 'converted', 'expired'],
    default: 'draft'
  },
  convertedInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  notes: {
    type: String,
    trim: true
  },
  termsAndConditions: {
    type: String,
    trim: true,
    default: 'This fee quote is valid until the specified expiry date. Fees must be paid through approved school bank channels.'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

quotationSchema.index({ status: 1, academicYear: 1 });

module.exports = mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);
