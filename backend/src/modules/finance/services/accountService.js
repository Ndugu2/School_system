const Account = require('../models/Account');

const DEFAULT_ACCOUNTS = [
  // ── ASSETS (1000s) ──
  { code: '1010', name: 'Cash on Hand (Vault / Petty Cash)', type: 'Asset', subType: 'Cash and Cash Equivalents', isSystem: true, openingBalance: 0 },
  { code: '1020', name: 'Stanbic Bank Main Operating Account', type: 'Asset', subType: 'Bank Account', isSystem: true, openingBalance: 0 },
  { code: '1030', name: 'Centenary School Fees Collection Account', type: 'Asset', subType: 'Bank Account', isSystem: true, openingBalance: 0 },
  { code: '1040', name: 'MTN & Airtel Mobile Money Clearing', type: 'Asset', subType: 'Cash and Cash Equivalents', isSystem: true, openingBalance: 0 },
  { code: '1200', name: 'Accounts Receivable (A/R - Student Fees)', type: 'Asset', subType: 'Accounts Receivable', isSystem: true, openingBalance: 0 },
  { code: '1300', name: 'Prepaid Expenses & School Supplies', type: 'Asset', subType: 'Current Asset', isSystem: false, openingBalance: 0 },
  { code: '1500', name: 'School Land, Buildings & Campus Infrastructure', type: 'Asset', subType: 'Fixed Asset', isSystem: false, openingBalance: 0 },
  { code: '1550', name: 'School Buses & Fleet Vehicles', type: 'Asset', subType: 'Fixed Asset', isSystem: false, openingBalance: 0 },
  { code: '1560', name: 'Computers, Science Lab Equipment & Furniture', type: 'Asset', subType: 'Fixed Asset', isSystem: false, openingBalance: 0 },

  // ── LIABILITIES (2000s) ──
  { code: '2010', name: 'Accounts Payable (A/P - Vendors & Suppliers)', type: 'Liability', subType: 'Accounts Payable', isSystem: true, openingBalance: 0 },
  { code: '2020', name: 'Unearned Revenue (Prepaid School Fees)', type: 'Liability', subType: 'Current Liability', isSystem: true, openingBalance: 0 },
  { code: '2030', name: 'Accrued Salaries, PAYE & NSSF Payable', type: 'Liability', subType: 'Payroll Liabilities', isSystem: true, openingBalance: 0 },
  { code: '2050', name: 'School Development & Expansion Loans', type: 'Liability', subType: 'Long Term Liability', isSystem: false, openingBalance: 0 },

  // ── EQUITY (3000s) ──
  { code: '3010', name: 'School Capital Fund / Founding Equity', type: 'Equity', subType: 'Owner Equity', isSystem: true, openingBalance: 0 },
  { code: '3020', name: 'Retained Surplus / Accumulated Earnings', type: 'Equity', subType: 'Retained Earnings', isSystem: true, openingBalance: 0 },

  // ── REVENUE / INCOME (4000s) ──
  { code: '4010', name: 'Tuition Fees Revenue', type: 'Income', subType: 'Fee Revenue', isSystem: true, openingBalance: 0 },
  { code: '4020', name: 'Boarding & Hostel Accommodation Revenue', type: 'Income', subType: 'Fee Revenue', isSystem: true, openingBalance: 0 },
  { code: '4030', name: 'School Tours, Excursions & Field Trips', type: 'Income', subType: 'Activities Revenue', isSystem: true, openingBalance: 0 },
  { code: '4040', name: 'Admission & Student Registration Fees', type: 'Income', subType: 'Fee Revenue', isSystem: true, openingBalance: 0 },
  { code: '4050', name: 'Uniforms, Sweaters & Badges Revenue', type: 'Income', subType: 'Merchandise Revenue', isSystem: true, openingBalance: 0 },
  { code: '4060', name: 'Assessment, UNEB & Examination Fees', type: 'Income', subType: 'Academic Revenue', isSystem: true, openingBalance: 0 },
  { code: '4070', name: 'Transport & Shuttle Bus Service', type: 'Income', subType: 'Service Revenue', isSystem: false, openingBalance: 0 },
  { code: '4080', name: 'Development & Building Fund Levy', type: 'Income', subType: 'Special Fund', isSystem: true, openingBalance: 0 },
  { code: '4090', name: 'Miscellaneous & Auxiliary Revenue', type: 'Income', subType: 'Other Revenue', isSystem: false, openingBalance: 0 },

  // ── EXPENSES (5000s) ──
  { code: '5010', name: 'Teaching Faculty & Administrative Salaries', type: 'Expense', subType: 'Payroll Expense', isSystem: true, openingBalance: 0 },
  { code: '5020', name: 'Boarding Food, Groceries & Kitchen Fuel', type: 'Expense', subType: 'Welfare Expense', isSystem: true, openingBalance: 0 },
  { code: '5030', name: 'School Tours & Field Study Direct Costs', type: 'Expense', subType: 'Activities Expense', isSystem: true, openingBalance: 0 },
  { code: '5040', name: 'Utilities (Electricity, Water, Campus Internet)', type: 'Expense', subType: 'Operating Expense', isSystem: true, openingBalance: 0 },
  { code: '5050', name: 'Curriculum Books, Exams & Stationery Supplies', type: 'Expense', subType: 'Academic Expense', isSystem: true, openingBalance: 0 },
  { code: '5060', name: 'Campus Maintenance & Compound Repairs', type: 'Expense', subType: 'Facility Expense', isSystem: false, openingBalance: 0 },
  { code: '5070', name: 'Science Laboratory Chemicals & Equipment', type: 'Expense', subType: 'Lab Expense', isSystem: false, openingBalance: 0 },
  { code: '5080', name: 'Sickbay & First Aid Medical Supplies', type: 'Expense', subType: 'Welfare Expense', isSystem: false, openingBalance: 0 },
  { code: '5090', name: 'Bank Charges, MoMo Tariffs & SMS Gateway Fees', type: 'Expense', subType: 'Financial Expense', isSystem: true, openingBalance: 0 },
];

async function ensureDefaultAccounts() {
  try {
    for (const acc of DEFAULT_ACCOUNTS) {
      await Account.updateOne(
        { code: acc.code },
        { $setOnInsert: acc },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('Error seeding default Chart of Accounts:', err);
  }
}

module.exports = {
  DEFAULT_ACCOUNTS,
  ensureDefaultAccounts
};
