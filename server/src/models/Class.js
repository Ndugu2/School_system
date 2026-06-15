const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required (e.g. Primary 1, Senior 1 A)'],
    trim: true
  },
  level: {
    type: String,
    enum: ['Nursery', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    required: [true, 'Class level (Nursery - S6) is required']
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  academicYear: {
    type: Number,
    required: [true, 'Academic year is required (e.g. 2026)'],
    default: () => new Date().getFullYear()
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Class', classSchema);
