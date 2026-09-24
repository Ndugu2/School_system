const mongoose = require('mongoose');

const permitSchema = new mongoose.Schema({
  permitNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  studentName: { type: String, required: true, trim: true },
  admissionNumber: { type: String, required: true, trim: true },
  classLevel: {
    type: String,
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    required: true
  },
  stream: {
    type: String,
    default: 'Green', // Default to Green / Stream G
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
  classTeacherName: { type: String, default: 'Class Teacher' },
  compulsorySubjects: [{ type: String, trim: true }],
  optionalSubjects: [{ type: String, trim: true }],
  issuedDate: {
    type: Date,
    default: Date.now
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active'
  }
}, { timestamps: true });

permitSchema.index({ student: 1, term: 1, academicYear: 1 }, { unique: true });

// Sequential Permit Generator: prefix "PER-" (e.g. PER-0001)
permitSchema.statics.generatePermitNumber = async function() {
  const prefix = "PER-";
  const lastPermit = await this.findOne({
    permitNumber: new RegExp(`^${prefix}`)
  }).sort({ permitNumber: -1 });

  let nextNumber = 1;
  if (lastPermit && lastPermit.permitNumber) {
    try {
      const lastNum = parseInt(lastPermit.permitNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    } catch (_) {
      nextNumber = 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = mongoose.model('Permit', permitSchema);
