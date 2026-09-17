const mongoose = require('mongoose');

// ─── Embedded Term ────────────────────────────────────────────────────────────
const termSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: false },
  isCurrent: { type: Boolean, default: false }
}, { _id: true });

// ─── Academic Year ────────────────────────────────────────────────────────────
const academicYearSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: [true, 'Academic year (e.g. 2026) is required'],
    unique: true
  },
  label: {
    type: String,
    trim: true,
    // e.g. "2026/2027" for schools that span calendar years; or just "2026"
  },
  isActive: {
    type: Boolean,
    default: false
  },
  terms: {
    type: [termSchema],
    validate: {
      validator: function(t) { return t.length <= 3; },
      message: 'An academic year can have at most 3 terms'
    }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true }
}, { timestamps: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Get the currently active term across all academic years
academicYearSchema.statics.getActiveTerm = async function () {
  const year = await this.findOne({ isActive: true });
  if (!year) return null;
  const term = year.terms.find(t => t.isCurrent);
  return term ? { academicYear: year, term } : null;
};

module.exports = mongoose.model('AcademicYear', academicYearSchema);
