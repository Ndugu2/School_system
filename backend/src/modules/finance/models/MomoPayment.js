const mongoose = require('mongoose');

const momoPaymentSchema = new mongoose.Schema({
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, required: true, unique: true },
  externalId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, required: true, default: 'UGX' },
  phoneNumber: { type: String, required: true },
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending' },
  providerTransactionId: { type: String, trim: true },
  failureReason: { type: String, trim: true },
  paymentReceipt: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentReceipt' },
  completedAt: { type: Date },
}, { timestamps: true });

momoPaymentSchema.index({ invoice: 1, createdAt: -1 });
momoPaymentSchema.index(
  { invoice: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('MomoPayment', momoPaymentSchema);
