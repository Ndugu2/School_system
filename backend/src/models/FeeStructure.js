const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
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

  // ── Core Fee Components ────────────────────────────────────────────────────────
  tuitionFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0 // UGX
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

  // ── Boarding Fees (only for boarding students) ────────────────────────────────
  boardingFee: {
    type: Number,
    min: 0,
    default: 0
  },
  bedding: {
    // Mattress, bedsheets, pillow — charged once at S1 admission usually
    type: Number,
    min: 0,
    default: 0
  },
  messing: {
    // Meals/dining
    type: Number,
    min: 0,
    default: 0
  },

  // ── Other Standard Fees ───────────────────────────────────────────────────────
  transportFee: {
    // For day students using school transport
    type: Number,
    min: 0,
    default: 0
  },
  registrationFee: {
    // Charged once per term (start of term admin fee)
    type: Number,
    min: 0,
    default: 0
  },
  examFee: {
    // End-of-term exam registration
    type: Number,
    min: 0,
    default: 0
  },

  // ── Revenue Account Mapping ───────────────────────────────────────────────────
  // Each fee component is posted to a specific Income account in the Chart of
  // Accounts. These defaults match the standard 4000-series fee revenue codes.
  accountMapping: {
    tuition: { type: String, trim: true, default: '4010' },
    development: { type: String, trim: true, default: '4080' },
    functional: { type: String, trim: true, default: '4100' },
    boarding: { type: String, trim: true, default: '4020' },
    transport: { type: String, trim: true, default: '4070' },
    exam: { type: String, trim: true, default: '4060' },
    registration: { type: String, trim: true, default: '4040' }
  },

  // ── Configurable Other Fees ───────────────────────────────────────────────────
  otherFees: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    applicableTo: { type: String, enum: ['all', 'day', 'boarding'], default: 'all' },
    accountCode: { type: String, trim: true, default: '4090' }
  }],

  // ── Computed Totals ───────────────────────────────────────────────────────────
  totalDayStudent: {
    // tuition + development + functional + registrationFee + examFee + transport
    type: Number,
    required: true,
    min: 0
  },
  totalBoardingStudent: {
    // totalDayStudent + boardingFee + messing + bedding
    type: Number,
    min: 0,
    default: 0
  },
  // Legacy total (day rate)
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

feeStructureSchema.index({ classLevel: 1, term: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
