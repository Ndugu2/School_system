const mongoose = require('mongoose');

const transportAssignmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  busRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'BusRoute', required: true },
  boardingStop: { type: String, required: true, trim: true },
  dropOffStop: { type: String, required: true, trim: true },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'], required: true },
  academicYear: { type: Number, required: true },
  direction: { type: String, enum: ['morning', 'afternoon', 'both'], default: 'both' },
  transportFee: { type: Number, default: 0 },
  feeStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One student only on one route per term/year
transportAssignmentSchema.index({ student: 1, term: 1, academicYear: 1 }, { unique: true });
transportAssignmentSchema.index({ busRoute: 1, term: 1, academicYear: 1 });

module.exports = mongoose.model('TransportAssignment', transportAssignmentSchema);
