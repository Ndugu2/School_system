const mongoose = require('mongoose');

// Stage 1: A parent/guardian contacts the school expressing interest
const enquirySchema = new mongoose.Schema({
  parentName: { type: String, required: true, trim: true },
  parentPhone: { type: String, required: true, trim: true },
  parentEmail: { type: String, trim: true, lowercase: true },
  childName: { type: String, required: true, trim: true },
  childDob: { type: Date },
  childGender: { type: String, enum: ['Male', 'Female'] },
  applyingForClass: { type: String, required: true, trim: true }, // e.g. "P1", "S1"
  currentSchool: { type: String, trim: true },
  preferredStartTerm: { type: String, trim: true },
  preferredStartYear: { type: Number, default: () => new Date().getFullYear() },
  howHeardAboutUs: { type: String, trim: true },
  notes: { type: String, trim: true },
  status: {
    type: String,
    enum: ['new', 'contacted', 'tour-booked', 'converted-to-application', 'not-interested'],
    default: 'new',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  followUpDate: { type: Date },
  convertedToApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
