const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName: { type: String, required: true, trim: true },
  staffRole: { type: String, trim: true },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'maternity', 'paternity', 'emergency', 'study', 'unpaid'],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  daysRequested: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, trim: true },
  supportingDoc: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewerName: { type: String, trim: true },
  reviewedAt: { type: Date },
  reviewNotes: { type: String, trim: true },
  handoverNotes: { type: String, trim: true },
}, { timestamps: true });

leaveRequestSchema.index({ staff: 1, startDate: -1 });
leaveRequestSchema.index({ status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
