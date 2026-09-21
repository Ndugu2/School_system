const mongoose = require('mongoose');

const exeatPassSchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true },
  admissionNo: { type: String, trim: true },
  dormName: { type: String, trim: true },
  roomNo: { type: String, trim: true },
  destination: { type: String, required: true, trim: true },
  parentName: { type: String, required: true, trim: true },
  departureTime: { type: String, required: true },
  returnTime: { type: String, required: true },
  actualReturn: String,
  otp: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending_parent', 'approved', 'active_exit', 'returned'],
    default: 'pending_parent'
  },
  wardenApproved: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('ExeatPass', exeatPassSchema);
