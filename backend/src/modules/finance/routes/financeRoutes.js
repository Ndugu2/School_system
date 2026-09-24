const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payroll = require('../models/Payroll');
const Expense = require('../models/Expense');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const Quotation = require('../models/Quotation');
const Payment = require('../models/Payment');
const Bursary = require('../models/Bursary');
const Wallet = require('../models/Wallet');
const FeeStructure = require('../../../models/FeeStructure');
const Student = require('../../../models/Student');
const User = require('../../../models/User');
const { protect, authorize } = require('../../../middleware/auth');
const { canAccessStudent } = require('../../../middleware/recordAccess');
const FINANCE_ROLES = ['super-admin', 'admin', 'headteacher', 'bursar'];

// ── HELPER ───────────────────────────────────────────────────────────────────
const generateInvoiceNumber = async () => {
  const prefix = `INV-${new Date().getFullYear()}-`;
  const last = await Invoice.findOne({ invoiceNumber: new RegExp('^' + prefix) }).sort({ invoiceNumber: -1 });
  const seq = last ? parseInt(last.invoiceNumber.split('-')[2]) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

const generateJournalEntryNumber = async () => {
  const prefix = `JE-${new Date().getFullYear()}-`;
  const last = await JournalEntry.findOne({ entryNumber: new RegExp('^' + prefix) }).sort({ entryNumber: -1 });
  const seq = last ? parseInt(last.entryNumber.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

const generateQuoteNumber = async () => {
  const prefix = `QT-${new Date().getFullYear()}-`;
  const last = await Quotation.findOne({ quoteNumber: new RegExp('^' + prefix) }).sort({ quoteNumber: -1 });
  const seq = last ? parseInt(last.quoteNumber.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

const generatePaymentNumber = async () => {
  const prefix = `RCT-${new Date().getFullYear()}-`;
  const last = await Payment.findOne({ paymentNumber: new RegExp('^' + prefix) }).sort({ paymentNumber: -1 });
  const seq = last ? parseInt(last.paymentNumber.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

const generateBursaryCode = async () => {
  const prefix = `BUR-${new Date().getFullYear()}-`;
  const last = await Bursary.findOne({ bursaryCode: new RegExp('^' + prefix) }).sort({ bursaryCode: -1 });
  const seq = last ? parseInt(last.bursaryCode.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

const generateBillNumber = async () => {
  const prefix = `BILL-${new Date().getFullYear()}-`;
  const last = await Expense.findOne({ billNumber: new RegExp('^' + prefix) }).sort({ billNumber: -1 });
  const seq = last ? parseInt(last.billNumber.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

// Map fee line items to QuickBooks Revenue Account Codes
function mapLineItemToAccount(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('tuition')) return { code: '4010', name: 'Tuition Fees Revenue', type: 'Income' };
  if (n.includes('tour') || n.includes('trip') || n.includes('excursion') || n.includes('field')) {
    return { code: '4030', name: 'School Tours, Excursions & Field Trips', type: 'Income' };
  }
  if (n.includes('board') || n.includes('hostel') || n.includes('bed') || n.includes('messing')) {
    return { code: '4020', name: 'Boarding & Hostel Accommodation Revenue', type: 'Income' };
  }
  if (n.includes('uniform') || n.includes('sweater') || n.includes('badge')) {
    return { code: '4050', name: 'Uniforms, Sweaters & Badges Revenue', type: 'Income' };
  }
  if (n.includes('exam') || n.includes('assessment') || n.includes('uneb')) {
    return { code: '4060', name: 'Assessment, UNEB & Examination Fees', type: 'Income' };
  }
  if (n.includes('transport') || n.includes('bus') || n.includes('shuttle')) {
    return { code: '4070', name: 'Transport & Shuttle Bus Service', type: 'Income' };
  }
  if (n.includes('develop') || n.includes('building')) {
    return { code: '4080', name: 'Development & Building Fund Levy', type: 'Income' };
  }
  if (n.includes('admission') || n.includes('register')) {
    return { code: '4040', name: 'Admission & Student Registration Fees', type: 'Income' };
  }
  return { code: '4090', name: 'Miscellaneous & Auxiliary Revenue', type: 'Income' };
}
// ═══════════════════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════════════════

// @desc  Get all invoices (with filters)
// @route GET /api/finance/invoices
router.get('/invoices', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { status, term, academicYear, classLevel, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (classLevel) query.classLevel = classLevel;

    const invoices = await Invoice.find(query)
      .populate('student', 'studentId user')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Invoice.countDocuments(query);
    res.json({ invoices, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Generate invoices for a grade cohort (bulk)
// @route POST /api/finance/invoices/generate-bulk
router.post('/invoices/generate-bulk', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  const { classLevel, term, academicYear, dueDate, discounts } = req.body;

  try {
    // Get fee structure for this cohort
    const year = academicYear || new Date().getFullYear();
    const feeStructure = await FeeStructure.findOne({ classLevel, term, academicYear: year });
    if (!feeStructure) {
      return res.status(404).json({ error: { message: `No fee structure found for ${classLevel}, ${term} ${year}` } });
    }

    // Find all students in this class level
    const studentsInClass = await Student.find({})
      .populate('class', 'level')
      .populate('user', 'name');

    const targetStudents = studentsInClass.filter(s => s.class?.level === classLevel);
    if (targetStudents.length === 0) {
      return res.status(404).json({ error: { message: `No students found for class level: ${classLevel}` } });
    }

    const results = { created: 0, skipped: 0, errors: [] };
    const created = [];

    for (const student of targetStudents) {
      // Check if invoice already exists
      const exists = await Invoice.findOne({ student: student._id, term, academicYear: year });
      if (exists) { results.skipped++; continue; }

      const lineItems = [
        { name: 'Tuition Fee', amount: feeStructure.tuitionFee },
        { name: 'Development Fee', amount: feeStructure.developmentFee },
        { name: 'Functional Fee', amount: feeStructure.functionalFee },
        ...(feeStructure.otherFees || []).map(f => ({ name: f.name, amount: f.amount })),
      ].filter(li => li.amount > 0);

      const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);

      // Apply discounts
      const appliedDiscounts = discounts || [];
      let discountTotal = 0;
      for (const d of appliedDiscounts) {
        if (d.percentage > 0) discountTotal += subtotal * (d.percentage / 100);
        else discountTotal += d.amount || 0;
      }

      const totalAmount = Math.max(0, subtotal - discountTotal);
      const invoiceNumber = await generateInvoiceNumber();

      try {
        const inv = await Invoice.create({
          invoiceNumber,
          student: student._id,
          studentId: student.studentId,
          term,
          academicYear: year,
          classLevel,
          lineItems,
          discounts: appliedDiscounts,
          subtotal,
          discountTotal,
          totalAmount,
          paidAmount: 0,
          balance: totalAmount,
          dueDate: new Date(dueDate),
          generatedBy: req.user._id,
        });
        created.push(inv);
        results.created++;
      } catch (e) {
        results.errors.push({ student: student.studentId, error: e.message });
      }
    }

    res.status(201).json({ message: `Generated ${results.created} invoices, skipped ${results.skipped}`, results, created });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get single invoice
// @route GET /api/finance/invoices/:id
router.get('/invoices/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('student')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('generatedBy', 'name');
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });
    if (!FINANCE_ROLES.includes(req.user.role) && !(await canAccessStudent(req.user, invoice.student._id || invoice.student))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this invoice' } });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Record payment against an invoice
// @route POST /api/finance/invoices/:id/pay
router.post('/invoices/:id/pay', protect, authorize(...FINANCE_ROLES, 'parent'), async (req, res) => {
  const { amount, method, transactionRef, remarks } = req.body;

  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });
    if (req.user.role === 'parent' && !(await canAccessStudent(req.user, invoice.student))) {
      return res.status(403).json({ error: { message: 'Not authorized to pay this invoice' } });
    }
    if (invoice.status === 'paid' || invoice.status === 'waived') {
      return res.status(400).json({ error: { message: `Invoice is already ${invoice.status}` } });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: { message: 'Invalid payment amount' } });
    }
    if (payAmount > invoice.balance) {
      return res.status(400).json({ error: { message: `Amount exceeds balance of UGX ${invoice.balance.toLocaleString()}` } });
    }

    invoice.paidAmount += payAmount;
    // Status auto-updated by pre-save hook
    await invoice.save();

    res.json({ message: 'Payment recorded successfully', invoice });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Get student's own invoices (parent/student role)
// @route GET /api/finance/my-invoices
router.get('/my-invoices', protect, async (req, res) => {
  try {
    let studentIds = [];
    if (req.user.role === 'parent') {
      const students = await Student.find({ parentUser: req.user._id });
      studentIds = students.map(s => s._id);
    } else if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) studentIds = [student._id];
    } else {
      return res.status(403).json({ error: { message: 'Not authorized' } });
    }

    const invoices = await Invoice.find({ student: { $in: studentIds } }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Finance summary report
// @route GET /api/finance/reports/summary
router.get('/reports/summary', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { academicYear = new Date().getFullYear(), term } = req.query;
    const matchQ = { academicYear: parseInt(academicYear) };
    if (term) matchQ.term = term;

    const [invoiceStats, expenseStats, payrollStats] = await Promise.all([
      Invoice.aggregate([
        { $match: matchQ },
        { $group: {
          _id: '$status',
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          count: { $sum: 1 },
        }},
      ]),
      Expense.aggregate([
        { $match: { academicYear: parseInt(academicYear), status: 'paid', ...(term ? { term } : {}) } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payroll.aggregate([
        { $match: { year: parseInt(academicYear), status: 'processed' } },
        { $group: { _id: null, totalNetPay: { $sum: '$netPay' }, totalGross: { $sum: '$grossPay' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = invoiceStats.reduce((s, i) => s + i.paidAmount, 0);
    const totalExpenses = expenseStats.reduce((s, e) => s + e.total, 0);
    const totalPayroll = payrollStats[0]?.totalNetPay || 0;

    res.json({
      academicYear: parseInt(academicYear),
      term: term || 'All Terms',
      revenue: { totalRevenue, breakdown: invoiceStats },
      expenses: { totalExpenses, breakdown: expenseStats },
      payroll: { totalPayroll, ...payrollStats[0] },
      netPosition: totalRevenue - totalExpenses - totalPayroll,
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Smart Cashflow Forecast
// @route GET /api/finance/reports/cashflow-forecast
router.get('/reports/cashflow-forecast', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { academicYear = new Date().getFullYear() } = req.query;
    const activeInvoices = await Invoice.find({ academicYear, status: { $in: ['pending', 'partial'] } });
    
    // Simulate historical payment velocity
    // E.g., 30% collected in month 1, 40% in month 2, 20% in month 3
    const outstandingBalance = activeInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    
    const now = new Date();
    const forecast = [
      { month: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleString('default', { month: 'short' }), projectedCollection: outstandingBalance * 0.40 },
      { month: new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('default', { month: 'short' }), projectedCollection: outstandingBalance * 0.35 },
      { month: new Date(now.getFullYear(), now.getMonth() + 2, 1).toLocaleString('default', { month: 'short' }), projectedCollection: outstandingBalance * 0.15 },
    ];
    
    res.json({ totalOutstanding: outstandingBalance, forecast });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/finance/payroll
router.get('/payroll', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status) query.status = status;
    const records = await Payroll.find(query).sort({ year: -1, month: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/finance/payroll
router.post('/payroll', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const payroll = await Payroll.create({ ...req.body });
    res.status(201).json(payroll);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/finance/payroll/:id/process
router.put('/payroll/:id/process', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: 'processed', processedAt: new Date(), processedBy: req.user._id },
      { new: true }
    );
    if (!payroll) return res.status(404).json({ error: { message: 'Payroll record not found' } });
    res.json(payroll);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/finance/expenses
router.get('/expenses', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { category, status, academicYear } = req.query;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (academicYear) query.academicYear = parseInt(academicYear);
    const expenses = await Expense.find(query).populate('submittedBy', 'name').populate('approvedBy', 'name').sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/finance/expenses
router.post('/expenses', protect, authorize(...FINANCE_ROLES, 'teacher'), async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/finance/expenses/:id/approve
router.put('/expenses/:id/approve', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { action } = req.body; // "approve" or "reject"
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { status: action === 'approve' ? 'approved' : 'rejected', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!expense) return res.status(404).json({ error: { message: 'Expense not found' } });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DIGITAL WALLET (IoT CAFETERIA)
// ═══════════════════════════════════════════════════════════════════════════
const Wallet = require('../models/Wallet');

// @route GET /api/finance/wallets/:studentId
router.get('/wallets/:studentId', protect, authorize('super-admin', 'admin', 'parent', 'student'), async (req, res) => {
  try {
    if (!['super-admin', 'admin'].includes(req.user.role) && !(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this wallet' } });
    }
    let wallet = await Wallet.findOne({ student: req.params.studentId });
    if (!wallet) {
      wallet = await Wallet.create({ student: req.params.studentId });
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/finance/wallets/:studentId/transaction
router.post('/wallets/:studentId/transaction', protect, authorize('super-admin', 'admin', 'parent'), async (req, res) => {
  try {
    if (!['super-admin', 'admin'].includes(req.user.role) && !(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to use this wallet' } });
    }
    const { type, amount, vendor, itemDescription } = req.body;
    let wallet = await Wallet.findOne({ student: req.params.studentId });
    if (!wallet) return res.status(404).json({ error: { message: 'Wallet not found' } });
    
    if (type === 'purchase') {
      if (wallet.balance < amount) return res.status(400).json({ error: { message: 'Insufficient balance' } });
      wallet.balance -= amount;
    } else if (type === 'deposit') {
      wallet.balance += amount;
    }

    wallet.transactions.push({ type, amount, vendor, itemDescription });
    await wallet.save();
    
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc Send Fee Reminder SMS via Africa's Talking
// @route POST /api/finance/invoices/:id/remind-sms
const { sendSMS } = require('../../messaging/services/smsService');

router.post('/invoices/:id/remind-sms', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name' }
      });
      
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });
    if (invoice.balance <= 0) return res.status(400).json({ error: { message: 'Invoice is already fully paid' } });
    
    const student = await Student.findById(invoice.student._id);
    if (!student || !student.parentPhone) {
      return res.status(400).json({ error: { message: 'Parent phone number not configured for this student' } });
    }
    
    const message = `Ndugu Academy Balance Reminder: Dear Parent, please note that student ${invoice.student?.user?.name || 'your child'} has an outstanding balance of UGX ${invoice.balance.toLocaleString()} for ${invoice.term}. Please clear this amount.`;
    
    await sendSMS(student.parentPhone, message);
    
    res.json({ message: 'Fee reminder SMS sent successfully!' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. STUDENT STATEMENT OF ACCOUNTS (DEBITS, CREDITS, RUNNING BALANCES)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/students/:studentId/statement', protect, authorize(...FINANCE_VIEW_ROLES, 'parent', 'student'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term, startDate, endDate } = req.query;

    // Resolve student
    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId)
        .populate('user', 'name email phone avatar')
        .populate('parentUser', 'name email phone')
        .populate('currentClass', 'name level');
    }
    if (!student) {
      student = await Student.findOne({
        $or: [{ studentId }, { admissionNumber: studentId }]
      })
        .populate('user', 'name email phone avatar')
        .populate('parentUser', 'name email phone')
        .populate('currentClass', 'name level');
    }

    if (!student) {
      return res.status(404).json({ error: { message: 'Student account not found' } });
    }

    // Role check: parents can only see their children, students only themselves
    if (req.user.role === 'student' && String(student.user?._id) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }
    if (req.user.role === 'parent' && String(student.parentUser?._id) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Fetch all historical transactions for this student
    const [allInvoices, allPayments, allBursaries] = await Promise.all([
      Invoice.find({ student: student._id }).sort({ createdAt: 1 }).lean(),
      Payment.find({ student: student._id }).sort({ paymentDate: 1, createdAt: 1 }).lean(),
      Bursary.find({ student: student._id, status: { $ne: 'revoked' } }).sort({ createdAt: 1 }).lean()
    ]);

    // Build unified chronological ledger
    let rawEntries = [];

    allInvoices.forEach(inv => {
      rawEntries.push({
        id: inv._id,
        date: new Date(inv.createdAt),
        type: 'Invoice',
        ref: inv.invoiceNumber,
        description: `${inv.classLevel} ${inv.term} Billing (${inv.lineItems?.map(l => l.name).join(', ') || 'School Fees'})`,
        term: inv.term,
        academicYear: inv.academicYear,
        debit: Number(inv.totalAmount || 0),
        credit: 0,
        status: inv.status
      });
    });

    allPayments.forEach(p => {
      rawEntries.push({
        id: p._id,
        date: new Date(p.paymentDate || p.createdAt),
        type: 'Payment',
        ref: p.paymentNumber,
        description: `Fee Receipt (${p.paymentMethod || 'Deposit'} - Deposited to ${p.depositAccountName || p.depositAccount || 'Bank'})`,
        term: null,
        academicYear: null,
        debit: 0,
        credit: Number(p.amount || 0),
        status: 'completed'
      });
    });

    allBursaries.forEach(b => {
      rawEntries.push({
        id: b._id,
        date: new Date(b.createdAt),
        type: 'Bursary',
        ref: b.bursaryCode,
        description: `${b.name} (${b.category?.replace(/_/g, ' ') || 'Scholarship'})`,
        term: b.term,
        academicYear: b.academicYear,
        debit: 0,
        credit: Number(b.calculatedAmount || b.value || 0),
        status: b.status
      });
    });

    // Sort chronologically
    rawEntries.sort((a, b) => a.date - b.date);

    // Apply period filters and calculate Opening Balance
    let periodStart = null;
    let periodEnd = null;

    if (startDate) periodStart = new Date(startDate);
    if (endDate) periodEnd = new Date(endDate);

    let openingBalance = 0;
    let filteredTransactions = [];

    rawEntries.forEach(entry => {
      let isPrior = false;
      let isInPeriod = true;

      if (periodStart && entry.date < periodStart) {
        isPrior = true;
      }
      if (academicYear && entry.academicYear && entry.academicYear < parseInt(academicYear, 10)) {
        isPrior = true;
      }

      if (isPrior) {
        openingBalance += (entry.debit - entry.credit);
      } else {
        if (periodEnd && entry.date > periodEnd) isInPeriod = false;
        if (academicYear && entry.academicYear && entry.academicYear !== parseInt(academicYear, 10)) isInPeriod = false;
        if (term && entry.term && entry.term !== term) isInPeriod = false;

        if (isInPeriod) {
          filteredTransactions.push(entry);
        }
      }
    });

    // Compute running balance
    let currentBal = openingBalance;
    const transactions = filteredTransactions.map(tx => {
      currentBal += (tx.debit - tx.credit);
      return {
        ...tx,
        runningBalance: currentBal
      };
    });

    const totalDebits = transactions.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredits = transactions.reduce((sum, tx) => sum + tx.credit, 0);
    const totalPaid = transactions.filter(t => t.type === 'Payment').reduce((sum, tx) => sum + tx.credit, 0);
    const totalBursaries = transactions.filter(t => t.type === 'Bursary').reduce((sum, tx) => sum + tx.credit, 0);
    const closingBalance = currentBal;

    res.json({
      student: {
        _id: student._id,
        name: student.user?.name || student.studentId,
        admissionNumber: student.admissionNumber || student.studentId,
        studentId: student.studentId,
        classLevel: student.currentClassLevel || student.currentClass?.name || 'Class',
        parentName: student.parentUser?.name || 'Parent/Guardian',
        parentPhone: student.parentPhone || student.parentUser?.phone || '—',
        financialClearance: !!student.financialClearance
      },
      period: {
        academicYear: academicYear || 'All Time',
        term: term || 'All Terms',
        startDate: startDate || null,
        endDate: endDate || null
      },
      openingBalance,
      totalDebits,
      totalCredits,
      totalPaid,
      totalBursaries,
      closingBalance,
      transactions
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. BURSARIES & SCHOLARSHIPS ENGINE (HOW TO CHARGE A BURSARY)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/bursaries
router.get('/bursaries', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { studentId, academicYear, term } = req.query;
    const query = {};
    if (studentId) query.student = studentId;
    if (academicYear) query.academicYear = parseInt(academicYear, 10);
    if (term) query.term = term;

    const bursaries = await Bursary.find(query)
      .populate('student', 'studentId admissionNumber user currentClass')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('invoice', 'invoiceNumber totalAmount balance')
      .populate('awardedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(bursaries);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/bursaries — award and charge bursary with double-entry journal
router.post('/bursaries', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const {
      studentId,
      name,
      category = 'academic_excellence',
      amountType = 'percentage', // percentage or fixed_amount
      value, // e.g. 50 (%) or 500000 (UGX)
      academicYear = new Date().getFullYear(),
      term,
      invoiceId,
      sponsorName,
      notes
    } = req.body;

    if (!studentId || !name || !value || !term) {
      return res.status(400).json({ error: { message: 'Student, bursary name, value, and term are required' } });
    }

    // Resolve student
    let student = await Student.findById(studentId).populate('user', 'name');
    if (!student) student = await Student.findOne({ studentId }).populate('user', 'name');
    if (!student) return res.status(404).json({ error: { message: 'Student not found' } });

    // Find invoice to apply to
    let invoice = null;
    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId);
    } else {
      // Find open invoice for this student, year, and term
      invoice = await Invoice.findOne({
        student: student._id,
        academicYear: parseInt(academicYear, 10),
        term,
        status: { $in: ['unpaid', 'partial'] }
      });
    }

    // Calculate bursary amount
    let calculatedAmount = 0;
    const numVal = parseFloat(value);
    if (amountType === 'percentage') {
      const base = invoice ? invoice.subtotal : 1000000;
      calculatedAmount = Math.round(base * (numVal / 100));
    } else {
      calculatedAmount = numVal;
    }

    if (invoice) {
      calculatedAmount = Math.min(calculatedAmount, invoice.balance > 0 ? invoice.balance : calculatedAmount);

      invoice.discounts.push({
        type: 'bursary',
        description: `${name} (${category.replace(/_/g, ' ')})`,
        amount: calculatedAmount,
        percentage: amountType === 'percentage' ? numVal : 0
      });

      invoice.discountTotal = (invoice.discounts || []).reduce((acc, d) => acc + (d.amount || 0), 0);
      invoice.totalAmount = Math.max(0, invoice.subtotal - invoice.discountTotal);
      invoice.balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      if (invoice.balance === 0 && invoice.paidAmount >= 0) {
        invoice.status = 'paid';
      }
      await invoice.save();
    }

    const bursaryCode = await generateBursaryCode();

    // ── QUICKBOOKS DOUBLE-ENTRY POSTING FOR BURSARY ──
    // Debit 5095 Bursaries, Scholarships & Fee Remissions (Expense increases)
    // Credit 1200 Accounts Receivable (A/R - Student Fees) (Asset reduces)
    const journalLines = [
      {
        accountCode: '5095',
        accountName: 'Bursaries, Scholarships & Fee Remissions',
        accountType: 'Expense',
        debit: calculatedAmount,
        credit: 0
      },
      {
        accountCode: '1200',
        accountName: 'Accounts Receivable (A/R - Student Fees)',
        accountType: 'Asset',
        debit: 0,
        credit: calculatedAmount
      }
    ];

    const journal = await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(),
      description: `Bursary Award ${bursaryCode}: ${name} for ${student.user?.name || student.studentId}`,
      reference: bursaryCode,
      academicYear: parseInt(academicYear, 10),
      lines: journalLines,
      createdBy: req.user._id
    });

    const bursary = await Bursary.create({
      bursaryCode,
      student: student._id,
      studentId: student.studentId,
      studentName: student.user?.name || student.studentId,
      name,
      category,
      amountType,
      value: numVal,
      calculatedAmount,
      academicYear: parseInt(academicYear, 10),
      term,
      status: invoice ? 'applied' : 'active',
      invoice: invoice ? invoice._id : undefined,
      sponsorName,
      notes,
      journalEntry: journal._id,
      awardedBy: req.user._id
    });

    res.status(201).json({
      message: `Bursary ${bursaryCode} of UGX ${calculatedAmount.toLocaleString()} charged and credited to student!`,
      bursary,
      invoice
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/bursaries/:id/revoke
router.post('/bursaries/:id/revoke', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const bursary = await Bursary.findById(req.params.id);
    if (!bursary) return res.status(404).json({ error: { message: 'Bursary not found' } });
    if (bursary.status === 'revoked') {
      return res.status(400).json({ error: { message: 'Bursary is already revoked' } });
    }

    // Reversing double-entry journal:
    // Debit 1200 Accounts Receivable / Credit 5095 Bursaries Expense
    await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(),
      description: `Revoke Bursary ${bursary.bursaryCode} for ${bursary.studentName}`,
      reference: `REV-${bursary.bursaryCode}`,
      academicYear: bursary.academicYear,
      lines: [
        {
          accountCode: '1200',
          accountName: 'Accounts Receivable (A/R - Student Fees)',
          accountType: 'Asset',
          debit: bursary.calculatedAmount,
          credit: 0
        },
        {
          accountCode: '5095',
          accountName: 'Bursaries, Scholarships & Fee Remissions',
          accountType: 'Expense',
          debit: 0,
          credit: bursary.calculatedAmount
        }
      ],
      createdBy: req.user._id
    });

    bursary.status = 'revoked';
    await bursary.save();

    res.json({ message: `Bursary ${bursary.bursaryCode} revoked successfully and ledger adjusted` });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. QUICKBOOKS PAY BILLS & ACCOUNTS PAYABLE (A/P)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/bills — list all vendor bills with A/P balances
router.get('/bills', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { status, vendor, academicYear } = req.query;
    const query = {};
    if (status) query.status = status;
    if (vendor) query.vendor = new RegExp(vendor, 'i');
    if (academicYear) query.academicYear = parseInt(academicYear, 10);

    const bills = await Expense.find(query)
      .populate('submittedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/bills — enter vendor bill and post double-entry (Debit Expense / Credit Accounts Payable 2010)
router.post('/bills', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const {
      vendor,
      title,
      category = 'supplies',
      amount,
      date = new Date(),
      dueDate,
      description,
      expenseAccountCode = '5040',
      academicYear = new Date().getFullYear(),
      term = 'Term 1'
    } = req.body;

    if (!vendor || !title || !amount) {
      return res.status(400).json({ error: { message: 'Vendor, bill title, and amount are required' } });
    }

    const billNumber = await generateBillNumber();
    const expDoc = await Account.findOne({ code: expenseAccountCode });
    const expenseAccountName = expDoc?.name || 'General Operating Expense';

    const numAmount = parseFloat(amount);

    // Double-entry entry for receiving a bill:
    // Debit [Expense Account 50xx]
    // Credit 2010 Accounts Payable (A/P - Vendors & Suppliers)
    const journal = await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(date),
      description: `Vendor Bill ${billNumber}: ${vendor} (${title})`,
      reference: billNumber,
      academicYear: parseInt(academicYear, 10),
      lines: [
        {
          accountCode: expenseAccountCode,
          accountName: expenseAccountName,
          accountType: 'Expense',
          debit: numAmount,
          credit: 0
        },
        {
          accountCode: '2010',
          accountName: 'Accounts Payable (A/P - Vendors & Suppliers)',
          accountType: 'Liability',
          debit: 0,
          credit: numAmount
        }
      ],
      createdBy: req.user._id
    });

    const bill = await Expense.create({
      title,
      category,
      vendor,
      billNumber,
      amount: numAmount,
      paidAmount: 0,
      balance: numAmount,
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
      description,
      expenseAccountCode,
      expenseAccountName,
      status: 'approved',
      submittedBy: req.user._id,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      journalEntry: journal._id,
      academicYear: parseInt(academicYear, 10),
      term
    });

    res.status(201).json({
      message: `Bill ${billNumber} entered and posted to Accounts Payable (2010)!`,
      bill
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/bills/:id/pay — QuickBooks "Pay Bill": settle A/P and credit bank/cash
router.post('/bills/:id/pay', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const {
      paidFromAccountCode = '1020',
      paymentMethod = 'Bank Transfer',
      referenceNumber,
      paymentDate = new Date(),
      notes
    } = req.body;

    const bill = await Expense.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: { message: 'Bill not found' } });

    if (bill.status === 'paid' || bill.balance <= 0) {
      return res.status(400).json({ error: { message: 'This bill has already been fully paid' } });
    }

    const payAmount = parseFloat(req.body.paymentAmount) || bill.balance;
    if (payAmount <= 0) {
      return res.status(400).json({ error: { message: 'Payment amount must be greater than zero' } });
    }

    const bankAcc = await Account.findOne({ code: paidFromAccountCode });
    const paidFromAccountName = bankAcc?.name || 'Bank Operating Account';

    // Double-entry entry for paying a bill:
    // Debit 2010 Accounts Payable (reducing Liability)
    // Credit Bank / Cash Asset Account (reducing Asset)
    const journal = await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(paymentDate),
      description: `Bill Payment ${bill.billNumber || bill.title} to ${bill.vendor}`,
      reference: referenceNumber || bill.billNumber,
      academicYear: bill.academicYear,
      lines: [
        {
          accountCode: '2010',
          accountName: 'Accounts Payable (A/P - Vendors & Suppliers)',
          accountType: 'Liability',
          debit: payAmount,
          credit: 0
        },
        {
          accountCode: paidFromAccountCode,
          accountName: paidFromAccountName,
          accountType: 'Asset',
          debit: 0,
          credit: payAmount
        }
      ],
      createdBy: req.user._id
    });

    bill.paidAmount = (bill.paidAmount || 0) + payAmount;
    bill.balance = Math.max(0, bill.amount - bill.paidAmount);
    bill.paymentMethod = paymentMethod;
    bill.referenceNumber = referenceNumber;
    bill.paidFromAccountCode = paidFromAccountCode;
    bill.paidFromAccountName = paidFromAccountName;
    bill.paymentJournalEntry = journal._id;

    if (bill.balance === 0) {
      bill.status = 'paid';
    } else {
      bill.status = 'partial';
    }

    await bill.save();

    res.json({
      message: `Bill payment of UGX ${payAmount.toLocaleString()} posted! Accounts Payable updated.`,
      bill,
      journal
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
