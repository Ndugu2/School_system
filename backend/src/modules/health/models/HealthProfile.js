const mongoose = require('mongoose');

const healthProfileSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'],
    default: 'Unknown',
  },
  allergies: [{ type: String, trim: true }],
  chronicConditions: [{ type: String, trim: true }],
  currentMedications: [{
    name: { type: String, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
  }],
  immunizations: [{
    vaccine: { type: String, required: true, trim: true },
    date: { type: Date },
    batchNumber: { type: String, trim: true },
    nextDueDate: { type: Date },
  }],
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true },
  },
  insuranceProvider: { type: String, trim: true },
  insuranceNumber: { type: String, trim: true },
  lastPhysicalDate: { type: Date },
  vision: { type: String, trim: true },
  hearing: { type: String, trim: true },
  dietaryRestrictions: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('HealthProfile', healthProfileSchema);
