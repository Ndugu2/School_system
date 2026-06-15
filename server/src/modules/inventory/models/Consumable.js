const mongoose = require('mongoose');

const consumableSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['textbook', 'stationery', 'cleaning', 'lab-supplies', 'food', 'medical', 'printing', 'other'],
    required: true,
  },
  sku: { type: String, trim: true }, // Stock-Keeping Unit code
  description: { type: String, trim: true },
  unit: { type: String, required: true, default: 'piece' }, // "piece", "ream", "litre", "box"

  quantity: { type: Number, required: true, min: 0, default: 0 },
  reorderLevel: { type: Number, required: true, min: 0, default: 5 }, // Alert threshold
  unitCost: { type: Number, min: 0, default: 0 }, // UGX per unit
  location: { type: String, trim: true }, // Storeroom, Lab, Library

  lastRestockedAt: { type: Date },
  lastRestockedQuantity: { type: Number, default: 0 },
  supplier: { type: String, trim: true },

  academicYear: { type: Number, default: () => new Date().getFullYear() },
  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Virtual: is stock low?
consumableSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.reorderLevel;
});

consumableSchema.index({ category: 1 });
consumableSchema.index({ quantity: 1 });

module.exports = mongoose.model('Consumable', consumableSchema);
