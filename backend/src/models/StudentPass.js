const mongoose = require('mongoose');

const studentPassSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
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
  passNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  percentageCleared: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  isValid: {
    type: Boolean,
    default: true
  },
  // Allows access to examination halls & dining hall
  examPermitted: {
    type: Boolean,
    default: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remarks: {
    type: String,
    trim: true,
    default: 'Cleared for academic operations and examination entry'
  }
}, { timestamps: true });

studentPassSchema.index({ student: 1, term: 1, academicYear: 1 }, { unique: true });

// Sequential Pass Number Generator: prefix "PASS-" (e.g. PASS-0000001)
studentPassSchema.statics.generatePassNumber = async function() {
  const prefix = "PASS-";
  const lastPass = await this.findOne({
    passNumber: new RegExp(`^${prefix}`)
  }).sort({ passNumber: -1 });

  let nextNumber = 1;
  if (lastPass && lastPass.passNumber) {
    try {
      const lastNum = parseInt(lastPass.passNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    } catch (_) {
      nextNumber = 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(7, '0')}`;
};

module.exports = mongoose.model('StudentPass', studentPassSchema);
