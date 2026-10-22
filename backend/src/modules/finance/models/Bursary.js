const mongoose = require('mongoose');

const bursarySchema = new mongoose.Schema({
  bursaryCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  studentId: {
    type: String,
    trim: true,
  },
  studentName: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true, // e.g. "50% Sports Excellence Bursary", "Staff Child Concession", "District Education Grant"
  },
  category: {
    type: String,
    enum: ['academic_excellence', 'sports_scholarship', 'staff_child', 'need_based_hardship', 'director_bursary', 'ngo_sponsor', 'district_grant', 'other'],
    default: 'academic_excellence',
  },
  amountType: {
    type: String,
    enum: ['percentage', 'fixed_amount'],
    required: true,
    default: 'percentage',
  },
  value: {
    type: Number,
    required: true,
    min: 0, // 50 for 50%, or 500000 for UGX 500,000
  },
  calculatedAmount: {
    type: Number,
    default: 0, // Actual UGX credited to student
  },
  academicYear: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear(),
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'applied', 'revoked'],
    default: 'active',
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  sponsorName: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
  },
  awardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

bursarySchema.index({ student: 1, academicYear: 1, term: 1 });
bursarySchema.index({ bursaryCode: 1 });

module.exports = mongoose.models.Bursary || mongoose.model('Bursary', bursarySchema);
