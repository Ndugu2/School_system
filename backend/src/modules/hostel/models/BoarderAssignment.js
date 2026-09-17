const mongoose = require('mongoose');

const boarderSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  dormitory: { type: mongoose.Schema.Types.ObjectId, ref: 'Dormitory', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom', required: true },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'], required: true },
  academicYear: { type: Number, required: true },
  bedNumber: { type: String, trim: true },
  checkInDate: { type: Date, default: Date.now },
  checkOutDate: { type: Date },
  boardingFee: { type: Number, default: 0 },
  feeStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  status: { type: String, enum: ['active', 'checked-out', 'suspended'], default: 'active' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
}, { timestamps: true });

// One student can only have one hostel assignment per term/year
boarderSchema.index({ student: 1, term: 1, academicYear: 1 }, { unique: true });
boarderSchema.index({ room: 1, term: 1, academicYear: 1 });

module.exports = mongoose.model('BoarderAssignment', boarderSchema);
