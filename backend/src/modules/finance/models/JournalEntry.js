const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
  accountCode: { type: String, required: true, trim: true },
  accountName: { type: String, required: true, trim: true },
  accountType: { type: String, enum: ['Asset', 'Liability', 'Income', 'Expense', 'Equity'], required: true },
  debit: { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 },
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
  entryNumber: { type: String, required: true, unique: true, trim: true },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, required: true, trim: true },
  reference: { type: String, trim: true },
  academicYear: { type: Number, required: true, default: () => new Date().getFullYear() },
  lines: {
    type: [journalLineSchema],
    validate: {
      validator: lines => lines.length >= 2,
      message: 'A journal entry must contain at least two lines',
    },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

journalEntrySchema.pre('validate', function (next) {
  const totals = (this.lines || []).reduce((result, line) => ({
    debit: result.debit + Number(line.debit || 0),
    credit: result.credit + Number(line.credit || 0),
  }), { debit: 0, credit: 0 });

  if (totals.debit <= 0 || Math.abs(totals.debit - totals.credit) > 0.01) {
    this.invalidate('lines', 'Total debits must equal total credits and be greater than zero');
  }
  next();
});

journalEntrySchema.index({ academicYear: 1, date: -1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
