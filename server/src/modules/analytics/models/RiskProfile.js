const mongoose = require('mongoose');

const riskProfileSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100, // 0 = lowest risk, 100 = highest risk
  },
  riskCategory: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },
  factors: {
    attendanceDrop: { type: Number, default: 0 }, // % drop
    missingAssignments: { type: Number, default: 0 },
    lowQuizScores: { type: Number, default: 0 },
  },
  lastCalculatedAt: {
    type: Date,
    default: Date.now,
  },
  flaggedForIntervention: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  }
}, { timestamps: true });

// Ensure one profile per student
riskProfileSchema.index({ student: 1 }, { unique: true });

module.exports = mongoose.model('RiskProfile', riskProfileSchema);
