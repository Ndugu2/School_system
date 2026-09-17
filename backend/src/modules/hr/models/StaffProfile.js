const mongoose = require('mongoose');

const staffProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeId: { type: String, required: true, unique: true, trim: true },
  department: { type: String, trim: true },
  position: { type: String, trim: true },
  contractType: {
    type: String,
    enum: ['permanent', 'contract', 'temporary', 'volunteer'],
    default: 'permanent',
  },
  contractStart: { type: Date },
  contractEnd: { type: Date },
  baseSalary: { type: Number, default: 0 },
  nationalId: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dob: { type: Date },
  qualifications: [{
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    year: { type: Number },
  }],
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true },
  },
  bankAccount: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountName: { type: String, trim: true },
  },
  annualLeaveBalance: { type: Number, default: 21 },
  sickLeaveBalance: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('StaffProfile', staffProfileSchema);
