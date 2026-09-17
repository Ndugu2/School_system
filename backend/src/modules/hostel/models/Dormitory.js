const mongoose = require('mongoose');

const dormitorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Mixed'], required: true },
  totalRooms: { type: Number, default: 0 },
  totalCapacity: { type: Number, default: 0 },
  warden: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  wardenName: { type: String, trim: true },
  wardenPhone: { type: String, trim: true },
  amenities: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Dormitory', dormitorySchema);
