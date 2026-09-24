const mongoose = require('mongoose');

const aLevelCombinationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  subjects: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject' 
  }],
  subject_names: [{ 
    type: String, 
    trim: true 
  }],
  description: { 
    type: String, 
    trim: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('ALevelCombination', aLevelCombinationSchema);
