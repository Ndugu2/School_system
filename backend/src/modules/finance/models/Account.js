const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'],
    required: true
  },
  subType: {
    type: String,
    trim: true,
    default: 'General'
  },
  description: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    default: 'UGX',
    trim: true
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false // System accounts like Accounts Receivable (1200), Cash (1010) shouldn't be deleted
  }
}, { timestamps: true });

accountSchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.models.Account || mongoose.model('Account', accountSchema);
