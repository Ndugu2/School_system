const mongoose = require('mongoose');

const academicPermissionSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  academicYear: {
    type: Number,
    required: true,
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true,
  },
  assessmentTypes: {
    type: [String],
    default: ['BOT', 'MOT', 'EOT', 'coursework', 'assignment', 'mock'],
  },
  startsAt: {
    type: Date,
    default: Date.now,
  },
  endsAt: {
    type: Date,
    required: true,
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

academicPermissionSchema.index({ teacher: 1, subject: 1, class: 1, academicYear: 1, term: 1, revokedAt: 1 });

module.exports = mongoose.model('AcademicPermission', academicPermissionSchema);
