const mongoose = require('mongoose');

const parentDetailSchema = new mongoose.Schema({
  parent_first_name: { type: String, required: true, trim: true },
  parent_last_name: { type: String, required: true, trim: true },
  relation: { 
    type: String, 
    enum: ['Father', 'Mother', 'Guardian'], 
    required: true 
  },
  contact_number: { type: String, required: true, trim: true },
  occupation: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' }
}, { _id: false });

const studentApplicationSchema = new mongoose.Schema({
  // Unique tracking reference code for applicant status checking
  reference_number: { 
    type: String, 
    unique: true, 
    required: true, 
    trim: true,
    index: true
  },

  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true },
  date_of_birth: { type: Date, required: true },
  gender: { type: String, enum: ['M', 'F'], required: true },
  level: { type: String, enum: ['O', 'A'], required: true },
  class_applying: { 
    type: String, 
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], 
    required: true,
    index: true
  },
  former_school: { type: String, required: true, trim: true },

  // Location & Administrative Geography
  place_of_residence: { type: String, required: true, trim: true },
  place_of_origin: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  county: { type: String, required: true, trim: true },
  sub_county: { type: String, required: true, trim: true },
  village: { type: String, required: true, trim: true },

  // Health and Special Needs
  chronic_disease: { type: String, trim: true, default: 'None' },

  // Academic Documents & Verification Credentials (PDFs / Images)
  photo: { type: String, default: null },
  birth_certificate: { type: String, default: null },
  ple_pass_slip: { type: String, default: null },          // For S1 - S6
  recommendation_letter: { type: String, default: null },  // For S2 - S4
  uce_pass_slip: { type: String, default: null },          // For S5 - S6

  // Status & Unique Sequential Admission Number
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    index: true 
  },
  admission_number: { 
    type: String, 
    unique: true, 
    sparse: true, 
    trim: true,
    index: true 
  },

  // Combinations & Subject Selections
  combination: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ALevelCombination',
    default: null 
  },
  combination_name: { type: String, trim: true, default: '' },
  selected_subjects: [{ type: String, trim: true }],

  // Parents / Guardians
  parent_details: [parentDetailSchema],

  // Approvals & Audit
  approved_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  approved_by_name: { type: String, default: null },
  rejected_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  rejected_by_name: { type: String, default: null },
  rejection_reason: { type: String, default: null },
  decision_date: { type: Date, default: null },

  // Enrolled Student Record (when approved)
  enrolled_student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Sequential Admission Number Generator: prefix "LCK-" (e.g. LCK-00001, LCK-00002)
studentApplicationSchema.statics.generateAdmissionNumber = async function() {
  const prefix = "LCK-";
  const lastApplication = await this.findOne({ 
    admission_number: new RegExp(`^${prefix}`) 
  }).sort({ admission_number: -1 });

  let nextNumber = 1;
  if (lastApplication && lastApplication.admission_number) {
    try {
      const lastNumber = parseInt(lastApplication.admission_number.replace(prefix, ""), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    } catch (err) {
      nextNumber = 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

module.exports = mongoose.model('StudentApplication', studentApplicationSchema);
