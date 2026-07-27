const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  startTime: {
    type: String,
    required: true // e.g. "08:30"
  },
  endTime: {
    type: String,
    required: true // e.g. "09:30"
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: String,
    default: 'Main Classroom'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Timetable', timetableSchema);
