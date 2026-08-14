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
  lin: {
    type: String,
    trim: true,
    uppercase: true,
    description: 'Learner Identification Number (MoES / UNEB)'
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
  boardingStatus: {
    type: String,
    enum: ['Day', 'Boarding'],
    default: 'Day'
  },
  house: {
    type: String,
    enum: ['Lumumba', 'Kabalega', 'Nkrumah', 'Nyerere', 'Unassigned'],
    default: 'Unassigned'
  },
  pleIndexNumber: {
    type: String,
    trim: true,
    description: 'Required for S1 admissions (e.g. PLE Index Number)'
  },
  pleAggregates: {
    type: Number,
    min: 4,
    max: 36,
    description: 'PLE Total Aggregates (4 to 36)'
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