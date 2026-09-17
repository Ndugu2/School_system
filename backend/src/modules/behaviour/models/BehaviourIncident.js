const mongoose = require('mongoose');

const behaviourIncidentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  date: { type: Date, required: true, default: Date.now },
  type: { type: String, enum: ['positive', 'negative'], required: true },
  // Descriptor e.g. "Bullying", "Excellent Effort", "Fighting", "Helping Others"
  descriptor: { type: String, required: true, trim: true },
  severity: {
    type: String,
    enum: ['commendation', 'minor', 'moderate', 'serious', 'critical'],
    default: 'minor',
  },
  details: { type: String, trim: true },
  location: { type: String, trim: true }, // e.g. "Classroom", "Playground", "Canteen"
  witnesses: [{ type: String, trim: true }],
  // ── 7-Step Discipline Workflow State ─────────────────────────────────────────
  caseStatus: {
    type: String,
    enum: ['reported', 'under_review', 'investigation', 'action_taken', 'parent_notified', 'follow_up', 'closed'],
    default: 'reported',
  },
  actionTaken: { type: String, trim: true },
  investigationNotes: { type: String, trim: true },
  followUpRequired: { type: Boolean, default: false },
  followUpDate: { type: Date },
  followUpNotes: { type: String, trim: true },
  parentNotified: { type: Boolean, default: false },
  parentNotifiedAt: { type: Date },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterName: { type: String, trim: true },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'] },
  academicYear: { type: Number, default: () => new Date().getFullYear() },
}, { timestamps: true });

behaviourIncidentSchema.index({ student: 1, date: -1 });
behaviourIncidentSchema.index({ type: 1, academicYear: 1 });

module.exports = mongoose.model('BehaviourIncident', behaviourIncidentSchema);
