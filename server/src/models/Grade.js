const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
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
  botMarks: {
    type: Number,
    min: 0,
    max: 100,
    default: 0 // Beginning of Term (optional)
  },
  motMarks: {
    type: Number,
    min: 0,
    max: 100,
    default: 0 // Mid Term (optional)
  },
  eotMarks: {
    type: Number,
    min: 0,
    max: 100,
    default: 0 // End of Term
  },
  totalMarks: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  gradeValue: {
    type: String,
    enum: ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'],
    required: true
  },
  remarks: {
    type: String,
    trim: true
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// A student can only have one grade record per subject per term in an academic year
gradeSchema.index({ student: 1, subject: 1, term: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);
