const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }, // "Computer Lab A", "Hall"
  type: { type: String, enum: ['classroom', 'lab', 'hall', 'library', 'office', 'outdoor'], required: true },
  capacity: { type: Number, required: true, min: 1 },
  floor: { type: String, trim: true },
  building: { type: String, trim: true },
  facilities: [{ type: String }], // ["projector", "AC", "whiteboard"]
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
