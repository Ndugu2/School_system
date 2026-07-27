const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetTag: { type: String, required: true, unique: true, trim: true }, // e.g. "NDUGU-COMP-001"
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['computer', 'laptop', 'tablet', 'furniture', 'lab-equipment', 'sports', 'audio-visual', 'vehicle', 'other'],
    required: true,
  },
  serialNumber: { type: String, trim: true },
  brand: { type: String, trim: true },
  model: { type: String, trim: true },
  description: { type: String, trim: true },

  condition: { type: String, enum: ['new', 'good', 'fair', 'poor', 'damaged', 'written-off'], default: 'good' },
  location: { type: String, trim: true }, // e.g. "Computer Lab A", "Library"
  purchaseDate: { type: Date },
  purchaseValue: { type: Number, min: 0 }, // UGX
  expectedLifespanMonths: { type: Number, default: 36 }, // Used for replacement forecasting
  warrantyExpiry: { type: Date },
  supplier: { type: String, trim: true },

  // Current assignment
  isCheckedOut: { type: Boolean, default: false },
  assignedTo: { type: String, trim: true },           // studentId or staffId string
  assignedToType: { type: String, enum: ['student', 'staff', null], default: null },
  assignedToName: { type: String, trim: true },

  isActive: { type: Boolean, default: true },
  photoUrl: { type: String, trim: true },
  notes: { type: String, trim: true },

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

assetSchema.index({ category: 1 });
assetSchema.index({ isCheckedOut: 1 });
assetSchema.index({ assetTag: 1 });

module.exports = mongoose.model('Asset', assetSchema);
