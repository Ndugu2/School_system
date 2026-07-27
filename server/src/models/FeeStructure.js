const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  classLevel: {
    type: String,
    enum: ['Nursery', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
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
  tuitionFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0 // in UGX
  },
  developmentFee: {
    type: Number,
    min: 0,
    default: 0
  },
  functionalFee: {
    type: Number,
    min: 0,
    default: 0
  },
  otherFees: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

feeStructureSchema.index({ classLevel: 1, term: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
