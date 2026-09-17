const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    enum: ['Sibling', 'Aunt', 'Uncle', 'Cousin', 'Grandparent', 'Other'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true
  },
  address: String,
  isPrimary: {
    type: Boolean,
    default: false
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
