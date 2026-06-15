const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  balance: { type: Number, default: 0, min: 0 },
  dailyLimit: { type: Number, default: 10000 }, // UGX limit
  transactions: [
    {
      type: { type: String, enum: ['deposit', 'purchase'], required: true },
      amount: { type: Number, required: true },
      vendor: { type: String }, // e.g., "School Cafeteria"
      itemDescription: { type: String }, // e.g., "Lunch Meal"
      date: { type: Date, default: Date.now }
    }
  ],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
