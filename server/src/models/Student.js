const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class assignment is required']
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: [true, 'Gender is required']
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  parentName: {
    type: String,
    required: [true, 'Parent/Guardian name is required']
  },
  parentPhone: {
    type: String,
    required: [true, 'Parent/Guardian phone number is required (e.g. +2567...)']
  },
  parentEmail: {
    type: String,
    trim: true
  },
  parentUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  address: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);
