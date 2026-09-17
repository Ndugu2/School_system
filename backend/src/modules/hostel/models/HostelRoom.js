const mongoose = require('mongoose');

const hostelRoomSchema = new mongoose.Schema({
  dormitory: { type: mongoose.Schema.Types.ObjectId, ref: 'Dormitory', required: true },
  roomNumber: { type: String, required: true, trim: true },
  floor: { type: String, trim: true },
  capacity: { type: Number, required: true, min: 1, default: 4 },
  currentOccupancy: { type: Number, default: 0 },
  roomType: { type: String, enum: ['dormitory', 'private', 'semi-private'], default: 'dormitory' },
  amenities: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

hostelRoomSchema.index({ dormitory: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model('HostelRoom', hostelRoomSchema);
