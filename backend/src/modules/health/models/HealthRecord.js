const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  visitDate: { type: Date, required: true, default: Date.now },
  visitType: {
    type: String,
    enum: ['sick-visit', 'injury', 'immunization', 'routine-check', 'dental', 'referral', 'mental-health'],
    required: true,
  },
  complaint: { type: String, trim: true },
  diagnosis: { type: String, trim: true },
  treatment: { type: String, trim: true },
  medicationGiven: [{
    name: { type: String, trim: true },
    dosage: { type: String, trim: true },
    quantity: { type: String, trim: true },
  }],
  vitals: {
    temperature: { type: Number },       // Celsius
    weight: { type: Number },            // kg
    height: { type: Number },            // cm
    bloodPressure: { type: String, trim: true }, // e.g. "120/80"
    pulse: { type: Number },             // bpm
  },
  outcome: {
    type: String,
    enum: ['treated-released', 'sent-home', 'referred', 'hospitalized', 'monitoring'],
    default: 'treated-released',
  },
  referralDetails: { type: String, trim: true },
  attendingNurse: { type: String, trim: true },
  attendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  followUpDate: { type: Date },
  isConfidential: { type: Boolean, default: false },
  notes: { type: String, trim: true },
}, { timestamps: true });

healthRecordSchema.index({ student: 1, visitDate: -1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
