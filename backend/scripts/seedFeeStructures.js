const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const FeeStructure = require('../src/models/FeeStructure');
const User = require('../src/models/User');
const { ensureDefaultAccounts } = require('../src/modules/finance/services/accountService');

const ACADEMIC_YEAR = 2026;
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

// Published 2026 day/boarding rates are the source of truth for each total.
// The amounts below split those totals across the school's fee heads so the
// invoices and Chart of Accounts stay aligned.
const STANDARD_FEES = {
  S1: {
    tuitionFee: 500000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 20000,
    boardingFee: 670000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S2: {
    tuitionFee: 500000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 20000,
    boardingFee: 670000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S3: {
    tuitionFee: 540000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 40000,
    boardingFee: 710000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S4: {
    tuitionFee: 540000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 40000,
    boardingFee: 710000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 80000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S5: {
    tuitionFee: 600000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 50000,
    boardingFee: 730000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 100000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 20000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  },
  S6: {
    tuitionFee: 620000,
    developmentFee: 50000,
    functionalFee: 30000,
    examFee: 60000,
    boardingFee: 760000,
    otherFees: [
      { name: 'Educational Tour & Excursion', amount: 100000, applicableTo: 'all', accountCode: '4030' },
      { name: 'Science Laboratory & Practical Kit', amount: 50000, applicableTo: 'all', accountCode: '4110' },
      { name: 'ICT & Library Resources', amount: 30000, applicableTo: 'all', accountCode: '4120' },
      { name: 'Medical & Dispensary Welfare', amount: 20000, applicableTo: 'all', accountCode: '4130' }
    ]
  }
};

const ACCOUNT_MAPPING = {
  tuition: '4010',
  development: '4080',
  functional: '4100',
  boarding: '4020',
  transport: '4070',
  exam: '4060',
  registration: '4040'
};

async function seedFeeStructures() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    await ensureDefaultAccounts();
    console.log('Chart of Accounts fee revenue accounts are ready.');

    const admin = await User.findOne({ role: { $in: ['admin', 'super-admin'] } }).select('_id').lean();

    let created = 0;
    let updated = 0;

    for (const [classLevel, fees] of Object.entries(STANDARD_FEES)) {
      const otherFeesTotal = fees.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
      const totalDayStudent =
        fees.tuitionFee +
        fees.developmentFee +
        fees.functionalFee +
        fees.examFee +
        otherFeesTotal;
      const totalBoardingStudent = totalDayStudent + fees.boardingFee;

      for (const term of TERMS) {
        const existing = await FeeStructure.findOne({
          classLevel,
          term,
          academicYear: ACADEMIC_YEAR
        }).select('_id').lean();

        await FeeStructure.findOneAndUpdate(
          { classLevel, term, academicYear: ACADEMIC_YEAR },
          {
            classLevel,
            term,
            academicYear: ACADEMIC_YEAR,
            ...fees,
            registrationFee: 0,
            transportFee: 0,
            bedding: 0,
            messing: 0,
            accountMapping: ACCOUNT_MAPPING,
            totalDayStudent,
            totalBoardingStudent,
            totalAmount: totalDayStudent,
            notes: 'Standard 2026 fee structure aligned to the published day and boarding rates.',
            ...(admin?._id ? { createdBy: admin._id } : {})
          },
          { upsert: true, new: true, runValidators: true }
        );

        if (existing) updated++;
        else created++;
      }

      console.log(
        `${classLevel}: day UGX ${totalDayStudent.toLocaleString()} | boarding UGX ${totalBoardingStudent.toLocaleString()}`
      );
    }

    console.log(`Done. Created ${created}, updated ${updated} fee structures for ${ACADEMIC_YEAR}.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error seeding fee structures:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

seedFeeStructures();
