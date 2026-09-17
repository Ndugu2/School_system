const mongoose = require('mongoose');

const paymentPlanSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
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
  totalAmount: {
    type: Number,
    required: true,
    min: 1
  },
  installments: [
    {
      installmentNumber: { type: Number, required: true },
      dueDate: { type: Date, required: true },
      amount: { type: Number, required: true },
      amountPaid: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'overdue'],
        default: 'pending'
      },
      reminderSent: { type: Boolean, default: false },
      reminderSentDate: Date,
      paymentDate: Date
    }
  ],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for quick lookups
paymentPlanSchema.index({ student: 1, term: 1, academicYear: 1 });
paymentPlanSchema.index({ 'installments.dueDate': 1, status: 1 });

module.exports = mongoose.model('PaymentPlan', paymentPlanSchema);
