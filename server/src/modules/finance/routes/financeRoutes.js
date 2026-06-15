const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payroll = require('../models/Payroll');
const Expense = require('../models/Expense');
const FeeStructure = require('../../../models/FeeStructure');  // reuse existing
const Student = require('../../../models/Student');
const User = require('../../../models/User');
const { protect, authorize } = require('../../../middleware/auth');

// ── HELPER ───────────────────────────────────────────────────────────────────
const generateInvoiceNumber = async () => {
  const prefix = `INV-${new Date().getFullYear()}-`;
  const last = await Invoice.findOne({ invoiceNumber: new RegExp('^' + prefix) }).sort({ invoiceNumber: -1 });
  const seq = last ? parseInt(last.invoiceNumber.split('-')[2]) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════════════════

// @desc  Get all invoices (with filters)
// @route GET /api/finance/invoices
router.get('/invoices', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
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
router.post('/invoices/generate-bulk', protect, authorize('super-admin', 'admin'), async (req, res) => {
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
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Record payment against an invoice
// @route POST /api/finance/invoices/:id/pay
router.post('/invoices/:id/pay', protect, authorize('super-admin', 'admin', 'parent'), async (req, res) => {
  const { amount, method, transactionRef, remarks } = req.body;

  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });
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
router.get('/reports/summary', protect, authorize('super-admin', 'admin'), async (req, res) => {
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
router.get('/reports/cashflow-forecast', protect, authorize('super-admin', 'admin'), async (req, res) => {
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
router.get('/payroll', protect, authorize('super-admin', 'admin'), async (req, res) => {
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
router.post('/payroll', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const payroll = await Payroll.create({ ...req.body });
    res.status(201).json(payroll);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/finance/payroll/:id/process
router.put('/payroll/:id/process', protect, authorize('super-admin', 'admin'), async (req, res) => {
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
router.get('/expenses', protect, authorize('super-admin', 'admin'), async (req, res) => {
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
router.post('/expenses', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/finance/expenses/:id/approve
router.put('/expenses/:id/approve', protect, authorize('super-admin', 'admin'), async (req, res) => {
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

router.post('/invoices/:id/remind-sms', protect, authorize('super-admin', 'admin'), async (req, res) => {
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

module.exports = router;
