const mongoose = require('mongoose');

const academicPerformanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  academicYear: Number,
  term: String,
  cumulativeGPA: {
    type: Number,
    min: 0,
    max: 4
  },
  currentTermGPA: {
    type: Number,
    min: 0,
    max: 4
  },
  attendancePercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  classesAttended: Number,
  classesAbsent: Number,
  totalClasses: Number,
  performance: {
    type: String,
    enum: ['Excellent', 'Good', 'Satisfactory', 'Need Improvement'],
    default: 'Satisfactory'
  },
  subjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    marks: Number,
    grade: String,
    position: Number
  }],
  strengths: [String],
  areasForImprovement: [String],
  riskProfile: {
    isAtRisk: Boolean,
    reason: String,
    interventionDate: Date
  },
  teacherComments: String,
  parentalCommunication: {
    lastContacted: Date,
    method: String,
    notes: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AcademicPerformance', academicPerformanceSchema);
