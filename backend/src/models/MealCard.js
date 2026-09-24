const mongoose = require('mongoose');

const mealCardSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  academicYear: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  cardNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  isValid: {
    type: Boolean,
    default: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // 31-day meal punch tracking (dining hall attendance)
  mealDaysLogged: [{
    dayNumber: { type: Number, min: 1, max: 31 },
    date: { type: Date, default: Date.now },
    loggedBy: { type: String, default: 'Dining Staff' }
  }],
  notes: { type: String, trim: true, default: '' }
}, { timestamps: true });

mealCardSchema.index({ student: 1, term: 1, academicYear: 1 }, { unique: true });

// Sequential Card Number Generator: prefix "MC-" (e.g. MC-0000001)
mealCardSchema.statics.generateCardNumber = async function() {
  const prefix = "MC-";
  const lastCard = await this.findOne({
    cardNumber: new RegExp(`^${prefix}`)
  }).sort({ cardNumber: -1 });

  let nextNumber = 1;
  if (lastCard && lastCard.cardNumber) {
    try {
      const lastNum = parseInt(lastCard.cardNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    } catch (_) {
      nextNumber = 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(7, '0')}`;
};

module.exports = mongoose.model('MealCard', mealCardSchema);
