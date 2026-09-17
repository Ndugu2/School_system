const mongoose = require('mongoose');

const libraryLoanSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
  bookTitle: { type: String, trim: true }, // denormalized for quick display
  borrowerType: { type: String, enum: ['student', 'teacher', 'staff'], required: true },
  borrowerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  borrowerName: { type: String, required: true, trim: true },
  borrowerClass: { type: String, trim: true },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date },
  status: { type: String, enum: ['active', 'returned', 'overdue', 'lost'], default: 'active' },
  fineAmount: { type: Number, default: 0 },         // UGX fine for overdue/lost
  finePaid: { type: Boolean, default: false },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returnedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
}, { timestamps: true });

libraryLoanSchema.index({ borrowerId: 1, status: 1 });
libraryLoanSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('LibraryLoan', libraryLoanSchema);
