const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required (e.g. Mathematics, English, Luganda, Physics)'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Subject code is required (e.g. MTC, ENG, LUG, PHY)'],
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Subject must be assigned to a class']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be unassigned initially
  }
}, {
  timestamps: true
});

// Compound unique index for subject name in a class to prevent duplicates
subjectSchema.index({ name: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
