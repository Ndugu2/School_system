const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Payroll = require('../models/Payroll');
const Expense = require('../models/Expense');
const JournalEntry = require('../models/JournalEntry');
const PaymentReceipt = require('../../../models/PaymentReceipt');
const MomoPayment = require('../models/MomoPayment');
const FeeStructure = require('../../../models/FeeStructure');  // reuse existing
const Student = require('../../../models/Student');
const User = require('../../../models/User');
const { protect, authorize } = require('../../../middleware/auth');
const { canAccessStudent, parentStudentFilter } = require('../../../middleware/recordAccess');
const { logAudit } = require('../../../middleware/auditLog');
const { createCollectionRequest, getCollectionStatus } = require('../services/momoService');
const FINANCE_VIEW_ROLES = ['super-admin', 'admin', 'headteacher', 'bursar'];
const FINANCE_EDIT_ROLES = ['super-admin', 'admin', 'bursar'];

const finalizeMomoPayment = async (momoPayment, providerStatus) => {
  if (providerStatus.status !== 'SUCCESSFUL') {
    const failed = providerStatus.status === 'FAILED';
    if (failed) {
      await MomoPayment.updateOne(
        { _id: momoPayment._id, status: 'pending' },
        { $set: { status: 'failed', failureReason: providerStatus.reason || 'MTN MoMo payment failed' } }
      );
    }
    return { status: failed ? 'failed' : 'pending' };
  }
  if (providerStatus.externalId && providerStatus.externalId !== momoPayment.externalId) {
    throw new Error('MTN MoMo status externalId did not match the payment request');
  }
  if (providerStatus.amount && Number(providerStatus.amount) !== momoPayment.amount) {
    throw new Error('MTN MoMo status amount did not match the requested payment');
  }
  if (providerStatus.currency && providerStatus.currency !== momoPayment.currency) {
    throw new Error('MTN MoMo status currency did not match the payment request');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const current = await MomoPayment.findById(momoPayment._id).session(session);
    if (!current) throw new Error('MTN MoMo payment request was not found');
    if (current.paymentReceipt) {
      await session.commitTransaction();
      return { status: 'successful', receiptId: current.paymentReceipt };
    }
    if (current.status !== 'pending') {
      await session.commitTransaction();
      return { status: current.status };
    }

    const invoice = await Invoice.findById(current.invoice).session(session);
    if (!invoice) throw new Error('The invoice for this MTN MoMo payment no longer exists');
    const updatedInvoice = await Invoice.findOneAndUpdate(
      { _id: invoice._id, balance: { $gte: current.amount }, status: { $nin: ['paid', 'waived'] } },
      [{
        $set: {
          paidAmount: { $add: [{ $ifNull: ['$paidAmount', 0] }, current.amount] },
          balance: { $subtract: [{ $ifNull: ['$balance', 0] }, current.amount] },
          status: {
            $cond: [
              { $lte: [{ $subtract: [{ $ifNull: ['$balance', 0] }, current.amount] }, 0] },
              'paid',
              'partial',
            ],
          },
        },
      }],
      { new: true, session }
    );
    if (!updatedInvoice) throw new Error('Invoice balance changed; MTN payment requires finance reconciliation');

    const transactionReference = providerStatus.financialTransactionId || current.referenceId;
    const receiptNumber = `REC-MTN-${current.referenceId}`;
    const [receipt] = await PaymentReceipt.create([{
      receiptNumber,
      invoice: invoice._id,
      student: current.student,
      studentId: invoice.studentId,
      academicYear: invoice.academicYear,
      term: invoice.term,
      amount: current.amount,
      paymentMethod: 'MTN Mobile Money',
      transactionReference,
      status: 'verified',
      recordedBy: current.initiatedBy,
      recordedByName: 'MTN MoMo',
      verifiedByName: 'MTN MoMo',
      verifiedAt: new Date(),
    }], { session });
    await JournalEntry.create([{
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(),
      description: `MTN MoMo fee payment for ${invoice.invoiceNumber}`,
      reference: transactionReference,
      academicYear: invoice.academicYear,
      lines: [
        { accountCode: '1200', accountName: 'Mobile Money Clearing', accountType: 'Asset', debit: current.amount, credit: 0 },
        { accountCode: '1100', accountName: 'Student Fees Receivable', accountType: 'Asset', debit: 0, credit: current.amount },
      ],
      createdBy: current.initiatedBy,
    }], { session });
    await MomoPayment.updateOne(
      { _id: current._id, status: 'pending' },
      {
        $set: {
          status: 'successful',
          providerTransactionId: transactionReference,
          paymentReceipt: receipt._id,
          completedAt: new Date(),
        },
      },
      { session }
    );
    await session.commitTransaction();
    return { status: 'successful', receiptId: receipt._id, invoice: updatedInvoice };
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
};

router.post('/momo/request', protect, authorize('parent', 'student', ...FINANCE_EDIT_ROLES), async (req, res) => {
  const { invoiceId, phoneNumber } = req.body;
  const amount = Number(req.body.amount);
  if (!invoiceId || !Number.isSafeInteger(amount) || amount <= 0 ||
      typeof phoneNumber !== 'string' || !/^(\+?256|0)7\d{8}$/.test(phoneNumber.trim())) {
    return res.status(400).json({ error: { message: 'Invoice, positive whole UGX amount, and valid Ugandan mobile number are required' } });
  }
  const callbackUrl = process.env.MTN_MOMO_CALLBACK_URL;
  if (!callbackUrl) return res.status(503).json({ error: { message: 'MTN MoMo callback URL is not configured' } });
  try {
    if (new URL(callbackUrl).protocol !== 'https:') throw new Error();
  } catch {
    return res.status(503).json({ error: { message: 'MTN_MOMO_CALLBACK_URL must be a valid HTTPS URL' } });
  }
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });
    if (!FINANCE_EDIT_ROLES.includes(req.user.role) && !(await canAccessStudent(req.user, invoice.student))) {
      return res.status(403).json({ error: { message: 'Not authorized to pay this invoice' } });
    }
    if (invoice.status === 'paid' || invoice.status === 'waived' || amount > invoice.balance) {
      return res.status(400).json({ error: { message: 'Payment amount exceeds the current payable invoice balance' } });
    }

    const normalizedPhone = phoneNumber.trim().replace(/^\+/, '').replace(/^0/, '256');
    const referenceId = crypto.randomUUID();
    const externalId = crypto.randomUUID();
    const currency = process.env.MTN_MOMO_CURRENCY || 'UGX';
    const pending = await MomoPayment.create({
      invoice: invoice._id,
      student: invoice.student,
      initiatedBy: req.user._id,
      referenceId,
      externalId,
      amount,
      currency,
      phoneNumber: normalizedPhone,
    });
    try {
      await createCollectionRequest({ referenceId, externalId, amount, phoneNumber: normalizedPhone, callbackUrl });
    } catch (err) {
      await MomoPayment.updateOne(
        { _id: pending._id, status: 'pending' },
        { $set: { status: 'failed', failureReason: err.message } }
      );
      throw err;
    }
    res.status(202).json({
      message: 'Payment request sent to the MTN MoMo customer prompt; awaiting provider confirmation',
      payment: pending,
    });
  } catch (err) {
    res.status(502).json({ error: { message: err.message } });
  }
});

router.get('/momo/requests/:id', protect, async (req, res) => {
  try {
    const payment = await MomoPayment.findById(req.params.id).populate('invoice', 'invoiceNumber term academicYear');
    if (!payment) return res.status(404).json({ error: { message: 'MTN MoMo request not found' } });
    if (!FINANCE_VIEW_ROLES.includes(req.user.role) && !(await canAccessStudent(req.user, payment.student))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this MTN MoMo payment' } });
    }
    if (payment.status === 'pending') {
      const providerStatus = await getCollectionStatus(payment.referenceId);
      await finalizeMomoPayment(payment, providerStatus);
      await payment.populate('paymentReceipt');
    }
    res.json(await MomoPayment.findById(payment._id).populate('paymentReceipt'));
  } catch (err) {
    res.status(502).json({ error: { message: err.message } });
  }
});

router.post('/momo/callback', async (req, res) => {
  const externalId = req.body?.externalId;
  if (typeof externalId !== 'string' || !externalId) {
    return res.status(400).json({ error: { message: 'MTN MoMo callback externalId is required' } });
  }
  try {
    const payment = await MomoPayment.findOne({ externalId });
    if (!payment) return res.status(404).json({ error: { message: 'MTN MoMo request not found' } });
    if (payment.status !== 'pending') return res.json({ received: true, status: payment.status });
    const providerStatus = await getCollectionStatus(payment.referenceId);
    const result = await finalizeMomoPayment(payment, providerStatus);
    res.json({ received: true, status: result.status });
  } catch (err) {
    res.status(502).json({ error: { message: err.message } });
  }
});

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
  const sequence = last ? parseInt(last.entryNumber.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// GENERAL LEDGER
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/finance/journal-entries
router.get('/journal-entries', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { academicYear = new Date().getFullYear(), limit = 50 } = req.query;
    const entries = await JournalEntry.find({ academicYear: parseInt(academicYear, 10) })
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/finance/journal-entries
router.post('/journal-entries', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const { date, description, reference, academicYear, lines } = req.body;
    const entry = await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date,
      description,
      reference,
      academicYear: academicYear || new Date().getFullYear(),
      lines,
      createdBy: req.user._id,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route GET /api/finance/reports/trial-balance
router.get('/reports/trial-balance', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { academicYear = new Date().getFullYear() } = req.query;
    const entries = await JournalEntry.find({ academicYear: parseInt(academicYear, 10) }).select('lines');
    const accountsByCode = new Map();

    entries.forEach(entry => entry.lines.forEach(line => {
      const current = accountsByCode.get(line.accountCode) || {
        accountCode: line.accountCode,
        accountName: line.accountName,
        accountType: line.accountType,
        debit: 0,
        credit: 0,
      };
      current.debit += Number(line.debit || 0);
      current.credit += Number(line.credit || 0);
      accountsByCode.set(line.accountCode, current);
    }));

    const accounts = [...accountsByCode.values()].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    res.json({
      academicYear: parseInt(academicYear, 10),
      accounts,
      totals: accounts.reduce((total, account) => ({
        debit: total.debit + account.debit,
        credit: total.credit + account.credit,
      }), { debit: 0, credit: 0 }),
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════════════════

// @desc  Get all invoices (with filters)
// @route GET /api/finance/invoices
router.get('/invoices', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
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
router.post('/invoices/generate-bulk', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  const { classLevel, term, academicYear, dueDate, discounts } = req.body;

  try {
    // Get fee structure for this cohort
    const year = academicYear || new Date().getFullYear();
    const feeStructure = await FeeStructure.findOne({ classLevel, term, academicYear: year });
    if (!feeStructure) {
      return res.status(404).json({ error: { message: `No fee structure found for ${classLevel}, ${term} ${year}` } });
    }

    // Find all students in this class level
    const studentsInClass = await Student.find({
      $or: [{ currentClassLevel: classLevel }, { currentClass: { $ne: null } }],
    })
      .populate('currentClass', 'level')
      .populate('user', 'name');

    const targetStudents = studentsInClass.filter(s => s.currentClassLevel === classLevel || s.currentClass?.level === classLevel);
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
    if (!FINANCE_VIEW_ROLES.includes(req.user.role) && !(await canAccessStudent(req.user, invoice.student._id || invoice.student))) {
      return res.status(403).json({ error: { message: 'Not authorized to view this invoice' } });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Record payment against an invoice
// @route POST /api/finance/invoices/:id/pay
router.post('/invoices/:id/pay', protect, authorize(...FINANCE_EDIT_ROLES, 'parent'), async (req, res) => {
  const { amount, method, transactionRef } = req.body;
  let session;

  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });
    if (req.user.role === 'parent' && !(await canAccessStudent(req.user, invoice.student))) {
      return res.status(403).json({ error: { message: 'Not authorized to pay this invoice' } });
    }
    if (invoice.status === 'paid' || invoice.status === 'waived') {
      return res.status(400).json({ error: { message: `Invoice is already ${invoice.status}` } });
    }

    const payAmount = Number(amount);
    const paymentMethods = ['MTN Mobile Money', 'Airtel Money', 'Bank Deposit', 'Cash', 'Card'];
    if (!Number.isSafeInteger(payAmount) || payAmount <= 0) return res.status(400).json({ error: { message: 'Payment amount must be a positive whole number of UGX' } });
    if (!paymentMethods.includes(method)) return res.status(400).json({ error: { message: 'Select a valid payment method' } });
    if (payAmount > invoice.balance) {
      return res.status(400).json({ error: { message: `Amount exceeds balance of UGX ${invoice.balance.toLocaleString()}` } });
    }

    const oldValue = { paidAmount: invoice.paidAmount, balance: invoice.balance, status: invoice.status };
    session = await mongoose.startSession();
    session.startTransaction();
    const updatedInvoice = await Invoice.findOneAndUpdate(
      { _id: invoice._id, status: { $nin: ['paid', 'waived'] }, balance: { $gte: payAmount } },
      [{ $set: {
        paidAmount: { $add: [{ $ifNull: ['$paidAmount', 0] }, payAmount] },
        balance: { $subtract: [{ $ifNull: ['$balance', 0] }, payAmount] },
        status: { $cond: [{ $lte: [{ $subtract: [{ $ifNull: ['$balance', 0] }, payAmount] }, 0] }, 'paid', 'partial'] },
      } }],
      { new: true, session }
    );
    if (!updatedInvoice) {
      await session.abortTransaction();
      return res.status(409).json({ error: { message: 'Invoice balance changed or the invoice is no longer payable; refresh and try again' } });
    }

    const cashAccount = method === 'MTN Mobile Money' || method === 'Airtel Money'
      ? 'Mobile Money Clearing'
      : method || 'Cash and Mobile Money';
    await JournalEntry.create([{
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(),
      description: `Fee receipt for ${invoice.invoiceNumber}`,
      reference: transactionRef || invoice.invoiceNumber,
      academicYear: invoice.academicYear,
      lines: [
        { accountCode: '1200', accountName: cashAccount, accountType: 'Asset', debit: payAmount, credit: 0 },
        { accountCode: '1100', accountName: 'Student Fees Receivable', accountType: 'Asset', debit: 0, credit: payAmount },
      ],
      createdBy: req.user._id,
    }], { session });
    await session.commitTransaction();

    await logAudit(req, { action: 'payment.created', module: 'payments', recordId: invoice._id,
      oldValue, newValue: { paidAmount: updatedInvoice.paidAmount, balance: updatedInvoice.balance, status: updatedInvoice.status, method, amount: payAmount },
      description: `UGX ${payAmount} payment recorded for invoice ${invoice.invoiceNumber}` });
    res.json({ message: 'Payment recorded successfully', invoice: updatedInvoice });
  } catch (err) {
    if (session?.inTransaction()) await session.abortTransaction();
    res.status(500).json({ error: { message: err.message } });
  } finally {
    if (session) await session.endSession();
  }
});

// @desc  Get student's own invoices (parent/student role)
// @route GET /api/finance/my-invoices
router.get('/my-invoices', protect, async (req, res) => {
  try {
    let studentIds = [];
    if (req.user.role === 'parent') {
      const students = await Student.find(parentStudentFilter(req.user));
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
router.get('/reports/summary', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
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
router.get('/reports/cashflow-forecast', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
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
router.get('/payroll', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
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
router.post('/payroll', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const payroll = await Payroll.create({ ...req.body });
    res.status(201).json(payroll);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/finance/payroll/:id/process
router.put('/payroll/:id/process', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
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
router.get('/expenses', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
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
router.post('/expenses', protect, authorize(...FINANCE_EDIT_ROLES, 'teacher'), async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/finance/expenses/:id/approve
router.put('/expenses/:id/approve', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
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
router.post('/wallets/:studentId/transaction', protect, authorize(...FINANCE_EDIT_ROLES, 'parent'), async (req, res) => {
  try {
    if (!FINANCE_EDIT_ROLES.includes(req.user.role) && !(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ error: { message: 'Not authorized to use this wallet' } });
    }
    const { type, amount, vendor, itemDescription } = req.body;
    const transactionAmount = Number(amount);
    if (!['deposit', 'purchase'].includes(type)) return res.status(400).json({ error: { message: 'Transaction type must be deposit or purchase' } });
    if (!Number.isSafeInteger(transactionAmount) || transactionAmount <= 0) return res.status(400).json({ error: { message: 'Amount must be a positive whole number of UGX' } });
    if (type === 'deposit' && !FINANCE_EDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Wallet deposits must be recorded by school finance staff after payment is confirmed' } });
    }
    const update = {
      $inc: { balance: type === 'purchase' ? -transactionAmount : transactionAmount },
      $push: { transactions: { type, amount: transactionAmount, vendor, itemDescription, date: new Date() } },
    };
    const filter = { student: req.params.studentId, isActive: true };
    if (type === 'purchase') filter.balance = { $gte: transactionAmount };
    const wallet = await Wallet.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    if (!wallet) {
      const exists = await Wallet.exists({ student: req.params.studentId });
      if (!exists) return res.status(404).json({ error: { message: 'Wallet not found' } });
      return res.status(400).json({ error: { message: 'Wallet is inactive or has insufficient balance' } });
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc Send Fee Reminder SMS via Africa's Talking
// @route POST /api/finance/invoices/:id/remind-sms
const { sendSMS } = require('../../messaging/services/smsService');

router.post('/invoices/:id/remind-sms', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
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
