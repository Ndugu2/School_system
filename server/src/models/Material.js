const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  fileUrl: {
    type: String,
    required: true // File URL (PDF, doc, etc.)
  },
  fileType: {
    type: String, // e.g. "pdf", "video", "doc"
    default: "pdf"
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Material', materialSchema);
