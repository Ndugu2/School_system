const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Reference back to enquiry if it came from one
  enquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },

  // Application reference number (auto-generated)
  applicationNumber: { type: String, required: true, unique: true, trim: true },

  // Child / Applicant details
  childName: { type: String, required: true, trim: true },
  childDob: { type: Date, required: true },
  childGender: { type: String, enum: ['Male', 'Female'], required: true },
  childNationality: { type: String, trim: true, default: 'Ugandan' },
  religion: { type: String, trim: true },
  previousSchool: { type: String, trim: true },
  previousClass: { type: String, trim: true },

  // Application details
  applyingForClass: { type: String, required: true, trim: true },
  applyingForTerm: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'], required: true },
  applyingForYear: { type: Number, required: true },

  // Parent / Guardian
  parentName: { type: String, required: true, trim: true },
  parentPhone: { type: String, required: true, trim: true },
  parentEmail: { type: String, trim: true, lowercase: true },
  parentOccupation: { type: String, trim: true },
  parentAddress: { type: String, trim: true },

  // Second parent / guardian
  secondParentName: { type: String, trim: true },
  secondParentPhone: { type: String, trim: true },
  secondParentRelationship: { type: String, trim: true },

  // Medical
  hasAllergies: { type: Boolean, default: false },
  allergiesDetails: { type: String, trim: true },
  hasSpecialNeeds: { type: Boolean, default: false },
  specialNeedsDetails: { type: String, trim: true },

  // Pipeline stage
  status: {
    type: String,
    enum: ['submitted', 'under-review', 'interview-scheduled', 'accepted', 'rejected', 'waitlisted', 'enrolled'],
    default: 'submitted',
  },
  interviewDate: { type: Date },
  interviewNotes: { type: String, trim: true },
  decisionDate: { type: Date },
  decisionNotes: { type: String, trim: true },
  rejectionReason: { type: String, trim: true },

  // After acceptance
  enrolledStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  admissionFeeStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewerName: { type: String, trim: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
}, { timestamps: true });

applicationSchema.index({ status: 1, applyingForYear: 1 });

module.exports = mongoose.model('Application', applicationSchema);
