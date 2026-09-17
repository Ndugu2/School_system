const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  isbn: { type: String, trim: true },
  publisher: { type: String, trim: true },
  publishedYear: { type: Number },
  category: {
    type: String,
    enum: ['textbook', 'reference', 'fiction', 'non-fiction', 'magazine', 'newspaper', 'periodical', 'other'],
    default: 'textbook',
  },
  subject: { type: String, trim: true },       // e.g. "Mathematics", "Biology"
  gradeLevel: { type: String, trim: true },    // e.g. "S4", "P6", "All"
  language: { type: String, trim: true, default: 'English' },
  totalCopies: { type: Number, required: true, min: 1, default: 1 },
  availableCopies: { type: Number, default: 1 },
  location: { type: String, trim: true },      // shelf/section
  coverImage: { type: String, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

libraryBookSchema.index({ title: 'text', author: 'text', isbn: 'text' });
libraryBookSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('LibraryBook', libraryBookSchema);
