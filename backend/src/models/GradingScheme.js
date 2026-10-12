const mongoose = require('mongoose');

const gradeBandSchema = new mongoose.Schema({
  grade: { type: String, required: true, trim: true },
  minPercentage: { type: Number, required: true, min: 0, max: 100 },
  points: { type: Number, required: true, min: 0 },
}, { _id: false });

const gradingSchemeSchema = new mongoose.Schema({
  classLevel: {
    type: String,
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    required: true,
  },
  academicYear: { type: Number, required: true, min: 2000 },
  assessmentWeights: {
    BOT: { type: Number, required: true, min: 0, max: 100 },
    MOT: { type: Number, required: true, min: 0, max: 100 },
    EOT: { type: Number, required: true, min: 0, max: 100 },
  },
  gradeBands: {
    type: [gradeBandSchema],
    required: true,
    validate: {
      validator: bands => bands.length > 0 && bands.some(band => band.minPercentage === 0),
      message: 'Grade bands must include a 0% lower-bound band',
    },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

gradingSchemeSchema.index({ classLevel: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('GradingScheme', gradingSchemeSchema);
