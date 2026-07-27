const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['MCQ', 'ShortAnswer'],
    required: true,
    default: 'MCQ'
  },
  options: [String], // Array of options if MCQ
  correctAnswer: {
    type: String, // option index or text
    required: true
  },
  marks: {
    type: Number,
    default: 1
  }
});

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    default: 60
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);
