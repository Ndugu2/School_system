const mongoose = require('mongoose');

const checkoutRecordSchema = new mongoose.Schema({
  // What is being checked out
  itemType: { type: String, enum: ['asset', 'consumable'], required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  consumable: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumable' },
  itemName: { type: String, required: true, trim: true },

  // Who is borrowing it (cross-module safe string IDs)
  borrowerId: { type: String, required: true, trim: true },       // studentId or staffId
  borrowerType: { type: String, enum: ['student', 'staff'], required: true },
  borrowerName: { type: String, required: true, trim: true },

  quantityCheckedOut: { type: Number, default: 1, min: 1 }, // For consumables

  checkedOutAt: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedAt: { type: Date },
  returnCondition: { type: String, enum: ['good', 'damaged', 'lost', null], default: null },

  status: { type: String, enum: ['active', 'returned', 'overdue', 'lost'], default: 'active' },
  notes: { type: String, trim: true },

  checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Admin/librarian
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who accepted return
}, { timestamps: true });

// Auto-flag overdue
checkoutRecordSchema.pre('save', function (next) {
  if (this.status === 'active' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

checkoutRecordSchema.index({ borrowerId: 1 });
checkoutRecordSchema.index({ status: 1 });
checkoutRecordSchema.index({ dueDate: 1 });

module.exports = mongoose.model('CheckoutRecord', checkoutRecordSchema);
