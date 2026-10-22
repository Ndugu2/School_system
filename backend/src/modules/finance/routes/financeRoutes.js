const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Models
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

const { ensureDefaultAccounts } = require('../services/accountService');
const { protect, authorize } = require('../../../middleware/auth');
const { canAccessStudent } = require('../../../middleware/recordAccess');

const FINANCE_VIEW_ROLES = ['super-admin', 'admin', 'headteacher', 'bursar'];
const FINANCE_EDIT_ROLES = ['super-admin', 'admin', 'bursar'];

// ── NUMBER GENERATORS ────────────────────────────────────────────────────────
const generateInvoiceNumber = async () => {
  const prefix = `INV-${new Date().getFullYear()}-`;
  const last = await Invoice.findOne({ invoiceNumber: new RegExp('^' + prefix) }).sort({ invoiceNumber: -1 });
  const seq = last ? parseInt(last.invoiceNumber.split('-')[2], 10) + 1 : 1;
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
// 1. CHART OF ACCOUNTS (QUICKBOOKS COA)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/accounts — list all accounts with live balances
router.get('/accounts', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    await ensureDefaultAccounts();

    const accounts = await Account.find().sort({ code: 1 }).lean();

    // Compute live balances from JournalEntry lines
    const journalEntries = await JournalEntry.find().select('lines');
    const balanceByCode = {};

    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        const c = line.accountCode;
        if (!balanceByCode[c]) balanceByCode[c] = { debit: 0, credit: 0 };
        balanceByCode[c].debit += Number(line.debit || 0);
        balanceByCode[c].credit += Number(line.credit || 0);
      });
    });

    const enriched = accounts.map(acc => {
      const stats = balanceByCode[acc.code] || { debit: 0, credit: 0 };
      const opening = Number(acc.openingBalance || 0);
      let calculatedBalance = 0;

      // In double-entry:
      // Asset / Expense normal balance: Debit - Credit
      // Liability / Equity / Income normal balance: Credit - Debit
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        calculatedBalance = opening + (stats.debit - stats.credit);
      } else {
        calculatedBalance = opening + (stats.credit - stats.debit);
      }

      return {
        ...acc,
        totalDebit: stats.debit,
        totalCredit: stats.credit,
        currentBalance: calculatedBalance
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/accounts — create custom account in COA
router.post('/accounts', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const { code, name, type, subType, description, openingBalance = 0 } = req.body;
    if (!code || !name || !type) {
      return res.status(400).json({ error: { message: 'Account code, name, and type are required' } });
    }

    const existing = await Account.findOne({ code: code.trim() });
    if (existing) {
      return res.status(400).json({ error: { message: `Account code ${code} is already in use` } });
    }

    const account = await Account.create({
      code: code.trim(),
      name: name.trim(),
      type,
      subType: subType?.trim() || 'General',
      description: description?.trim(),
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(openingBalance) || 0
    });

    res.status(201).json(account);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/finance/accounts/:id — update account
router.put('/accounts/:id', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!account) return res.status(404).json({ error: { message: 'Account not found' } });
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// GET /api/finance/accounts/:code/ledger — account transaction history (General Ledger Card)
router.get('/accounts/:code/ledger', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { code } = req.params;
    const account = await Account.findOne({ code });
    if (!account) return res.status(404).json({ error: { message: 'Account not found' } });

    const entries = await JournalEntry.find({ 'lines.accountCode': code })
      .populate('createdBy', 'name')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    let runningBalance = Number(account.openingBalance || 0);
    const transactions = [];

    entries.forEach(entry => {
      const matchLines = (entry.lines || []).filter(l => l.accountCode === code);
      matchLines.forEach(line => {
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        if (account.type === 'Asset' || account.type === 'Expense') {
          runningBalance += (debit - credit);
        } else {
          runningBalance += (credit - debit);
        }

        transactions.push({
          journalId: entry._id,
          entryNumber: entry.entryNumber,
          date: entry.date,
          description: entry.description,
          reference: entry.reference,
          debit,
          credit,
          balance: runningBalance,
          createdBy: entry.createdBy?.name || 'System'
        });
      });
    });

    res.json({
      account,
      openingBalance: account.openingBalance || 0,
      closingBalance: runningBalance,
      transactions
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. QUOTATIONS / PRO-FORMA ESTIMATES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/quotations
router.get('/quotations', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { status, academicYear, term } = req.query;
    const query = {};
    if (status) query.status = status;
    if (academicYear) query.academicYear = parseInt(academicYear, 10);
    if (term) query.term = term;

    const quotations = await Quotation.find(query)
      .populate('student', 'studentId admissionNumber user')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(quotations);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/quotations
router.post('/quotations', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const {
      student,
      studentId,
      recipientName,
      recipientEmail,
      recipientPhone,
      classLevel,
      term,
      academicYear,
      expiryDate,
      lineItems = [],
      discounts = [],
      notes,
      termsAndConditions
    } = req.body;

    if (!recipientName || !classLevel || !term || !expiryDate) {
      return res.status(400).json({ error: { message: 'Recipient name, class level, term, and expiry date are required' } });
    }

    const calculatedItems = lineItems.map(item => ({
      name: item.name,
      description: item.description,
      category: item.category || 'Tuition',
      amount: Number(item.amount) || 0,
      quantity: Number(item.quantity) || 1,
      total: (Number(item.amount) || 0) * (Number(item.quantity) || 1)
    }));

    const subtotal = calculatedItems.reduce((acc, item) => acc + item.total, 0);

    let discountTotal = 0;
    (discounts || []).forEach(d => {
      if (d.percentage > 0) discountTotal += subtotal * (Number(d.percentage) / 100);
      else discountTotal += Number(d.amount || 0);
    });

    const totalAmount = Math.max(0, subtotal - discountTotal);
    const quoteNumber = await generateQuoteNumber();

    const quote = await Quotation.create({
      quoteNumber,
      student: student || undefined,
      studentId: studentId || undefined,
      recipientName,
      recipientEmail,
      recipientPhone,
      classLevel,
      term,
      academicYear: academicYear || new Date().getFullYear(),
      expiryDate: new Date(expiryDate),
      lineItems: calculatedItems,
      discounts,
      subtotal,
      discountTotal,
      totalAmount,
      status: 'draft',
      notes,
      termsAndConditions,
      createdBy: req.user._id
    });

    res.status(201).json(quote);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// GET /api/finance/quotations/:id
router.get('/quotations/:id', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id)
      .populate('student')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('convertedInvoice')
      .populate('createdBy', 'name');
    if (!quote) return res.status(404).json({ error: { message: 'Quotation not found' } });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// PUT /api/finance/quotations/:id — update status or details
router.put('/quotations/:id', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const quote = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quote) return res.status(404).json({ error: { message: 'Quotation not found' } });
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// POST /api/finance/quotations/:id/convert-to-invoice
router.post('/quotations/:id/convert-to-invoice', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: { message: 'Quotation not found' } });
    if (quote.status === 'converted') {
      return res.status(400).json({ error: { message: 'This quotation has already been converted to an invoice' } });
    }

    let studentDoc = null;
    if (quote.student) {
      studentDoc = await Student.findById(quote.student);
    }

    if (!studentDoc && quote.studentId) {
      studentDoc = await Student.findOne({ studentId: quote.studentId });
    }

    if (!studentDoc) {
      return res.status(400).json({ error: { message: 'A registered student record is required to convert a quotation into an official invoice' } });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days due

    const invoice = await Invoice.create({
      invoiceNumber,
      student: studentDoc._id,
      studentId: studentDoc.studentId,
      term: quote.term,
      academicYear: quote.academicYear,
      classLevel: quote.classLevel,
      lineItems: quote.lineItems.map(item => ({ name: item.name, amount: item.total })),
      discounts: quote.discounts,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      totalAmount: quote.totalAmount,
      paidAmount: 0,
      balance: quote.totalAmount,
      dueDate,
      notes: `Converted from Quotation ${quote.quoteNumber}. ${quote.notes || ''}`,
      generatedBy: req.user._id
    });

    // Auto-post double-entry journal for Accounts Receivable
    const journalLines = [
      {
        accountCode: '1200',
        accountName: 'Accounts Receivable (A/R - Student Fees)',
        accountType: 'Asset',
        debit: quote.totalAmount,
        credit: 0
      }
    ];

    quote.lineItems.forEach(item => {
      const mapped = mapLineItemToAccount(item.name);
      journalLines.push({
        accountCode: mapped.code,
        accountName: mapped.name,
        accountType: 'Income',
        debit: 0,
        credit: item.total
      });
    });

    // Balance check
    const totalCredit = journalLines.slice(1).reduce((acc, l) => acc + l.credit, 0);
    if (Math.abs(quote.totalAmount - totalCredit) > 0.01) {
      // Adjust last line if discounts offset
      const diff = quote.totalAmount - totalCredit;
      journalLines[1].credit += diff;
    }

    await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(),
      description: `Billing invoice ${invoice.invoiceNumber} (Quote ${quote.quoteNumber})`,
      reference: invoice.invoiceNumber,
      academicYear: quote.academicYear,
      lines: journalLines,
      createdBy: req.user._id
    });

    quote.status = 'converted';
    quote.convertedInvoice = invoice._id;
    await quote.save();

    res.status(201).json({
      message: `Quotation converted to Invoice ${invoice.invoiceNumber} successfully!`,
      invoice,
      quote
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. INVOICES & BILLING ENGINE (WITH AUTO DOUBLE-ENTRY POSTING)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/invoices
router.get('/invoices', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { status, term, academicYear, classLevel, search, page = 1, limit = 100 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear, 10);
    if (classLevel) query.classLevel = classLevel;

    let invoices = await Invoice.find(query)
      .populate('student', 'studentId admissionNumber user currentClass')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      invoices = invoices.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.studentId?.toLowerCase().includes(q) ||
        inv.student?.user?.name?.toLowerCase().includes(q)
      );
    }

    const total = await Invoice.countDocuments(query);
    res.json({ invoices, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/invoices — create custom invoice (Tuition, Tours, Boarding, Uniforms, etc.)
router.post('/invoices', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const {
      studentId,
      classLevel,
      term,
      academicYear,
      dueDate,
      lineItems = [],
      discounts = [],
      notes
    } = req.body;

    if (!studentId || !classLevel || !term || !dueDate) {
      return res.status(400).json({ error: { message: 'Student, class level, term, and due date are required' } });
    }

    // Resolve student
    let studentDoc = await Student.findById(studentId);
    if (!studentDoc) studentDoc = await Student.findOne({ studentId });
    if (!studentDoc) return res.status(404).json({ error: { message: 'Student not found' } });

    const formattedLineItems = lineItems.map(item => ({
      name: item.name,
      amount: Number(item.amount) || 0
    })).filter(i => i.amount > 0);

    if (formattedLineItems.length === 0) {
      return res.status(400).json({ error: { message: 'Invoice must contain at least one line item with an amount' } });
    }

    const subtotal = formattedLineItems.reduce((acc, i) => acc + i.amount, 0);

    let discountTotal = 0;
    (discounts || []).forEach(d => {
      if (d.percentage > 0) discountTotal += subtotal * (Number(d.percentage) / 100);
      else discountTotal += Number(d.amount || 0);
    });

    const totalAmount = Math.max(0, subtotal - discountTotal);
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      student: studentDoc._id,
      studentId: studentDoc.studentId,
      term,
      academicYear: academicYear || new Date().getFullYear(),
      classLevel,
      lineItems: formattedLineItems,
      discounts,
      subtotal,
      discountTotal,
      totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      dueDate: new Date(dueDate),
      notes: notes?.trim(),
      generatedBy: req.user._id
    });

    // Auto-post double-entry journal (A/R Debit, Revenue Credits)
    const journalLines = [
      {
        accountCode: '1200',
        accountName: 'Accounts Receivable (A/R - Student Fees)',
        accountType: 'Asset',
        debit: totalAmount,
        credit: 0
      }
    ];

    formattedLineItems.forEach(item => {
      const mapped = mapLineItemToAccount(item.name);
      journalLines.push({
        accountCode: mapped.code,
        accountName: mapped.name,
        accountType: 'Income',
        debit: 0,
        credit: item.amount
      });
    });

    const totalCredit = journalLines.slice(1).reduce((acc, l) => acc + l.credit, 0);
    if (Math.abs(totalAmount - totalCredit) > 0.01) {
      const diff = totalAmount - totalCredit;
      journalLines[1].credit += diff;
    }

    await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(),
      description: `Invoice ${invoiceNumber} issued to ${studentDoc.studentId}`,
      reference: invoiceNumber,
      academicYear: invoice.academicYear,
      lines: journalLines,
      createdBy: req.user._id
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('student', 'studentId user currentClass')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } });

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// POST /api/finance/invoices/generate-bulk — batch generate invoices by class cohort
router.post('/invoices/generate-bulk', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  const { classLevel, term, academicYear, dueDate, discounts, auxiliaryItems = [] } = req.body;

  try {
    const year = parseInt(academicYear, 10) || new Date().getFullYear();
    const feeStructure = await FeeStructure.findOne({ classLevel, term, academicYear: year });

    if (!feeStructure && auxiliaryItems.length === 0) {
      return res.status(404).json({ error: { message: `No fee structure configured for ${classLevel}, ${term} ${year}. Please configure fees first.` } });
    }

    const studentsInClass = await Student.find({
      $or: [{ currentClassLevel: classLevel }, { currentClass: { $ne: null } }],
      studentStatus: { $in: ['active', 'enrolled', 'admitted'] }
    }).populate('currentClass', 'level name');

    const targetStudents = studentsInClass.filter(
      s => s.currentClassLevel === classLevel || s.currentClass?.level === classLevel || s.currentClass?.name?.startsWith(classLevel)
    );

    if (targetStudents.length === 0) {
      return res.status(404).json({ error: { message: `No registered students found in ${classLevel}` } });
    }

    const results = { created: 0, skipped: 0, errors: [] };
    const created = [];

    for (const student of targetStudents) {
      const exists = await Invoice.findOne({ student: student._id, term, academicYear: year });
      if (exists) {
        results.skipped++;
        continue;
      }

      const lineItems = [];
      if (feeStructure) {
        if (feeStructure.tuitionFee > 0) lineItems.push({ name: 'Tuition Fee', amount: feeStructure.tuitionFee });
        if (feeStructure.developmentFee > 0) lineItems.push({ name: 'Development Fee', amount: feeStructure.developmentFee });
        if (feeStructure.functionalFee > 0) lineItems.push({ name: 'Functional Fee', amount: feeStructure.functionalFee });
        if (student.boardingApproval && feeStructure.boardingFee > 0) {
          lineItems.push({ name: 'Boarding & Accommodation', amount: feeStructure.boardingFee });
        }
        (feeStructure.otherFees || []).forEach(f => {
          if (f.amount > 0) lineItems.push({ name: f.name, amount: f.amount });
        });
      }

      // Add extra items (e.g. Tours, Excursions)
      (auxiliaryItems || []).forEach(item => {
        if (Number(item.amount) > 0) {
          lineItems.push({ name: item.name, amount: Number(item.amount) });
        }
      });

      const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
      let discountTotal = 0;
      (discounts || []).forEach(d => {
        if (d.percentage > 0) discountTotal += subtotal * (d.percentage / 100);
        else discountTotal += d.amount || 0;
      });

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
          discounts: discounts || [],
          subtotal,
          discountTotal,
          totalAmount,
          paidAmount: 0,
          balance: totalAmount,
          dueDate: new Date(dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
          generatedBy: req.user._id
        });

        // Double-entry posting
        const journalLines = [
          { accountCode: '1200', accountName: 'Accounts Receivable (A/R - Student Fees)', accountType: 'Asset', debit: totalAmount, credit: 0 }
        ];

        lineItems.forEach(item => {
          const mapped = mapLineItemToAccount(item.name);
          journalLines.push({ accountCode: mapped.code, accountName: mapped.name, accountType: 'Income', debit: 0, credit: item.amount });
        });

        const totalCredit = journalLines.slice(1).reduce((acc, l) => acc + l.credit, 0);
        if (Math.abs(totalAmount - totalCredit) > 0.01) {
          journalLines[1].credit += (totalAmount - totalCredit);
        }

        await JournalEntry.create({
          entryNumber: await generateJournalEntryNumber(),
          date: new Date(),
          description: `Cohort Billing for ${classLevel} - ${student.studentId}`,
          reference: invoiceNumber,
          academicYear: year,
          lines: journalLines,
          createdBy: req.user._id
        });

        created.push(inv);
        results.created++;
      } catch (e) {
        results.errors.push({ student: student.studentId, error: e.message });
      }
    }

    res.status(201).json({ message: `Generated ${results.created} invoices for ${classLevel}, skipped ${results.skipped}`, results, created });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/finance/invoices/:id
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

// DELETE /api/finance/invoices/:id
router.delete('/invoices/:id', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });
    if (invoice.paidAmount > 0) {
      return res.status(400).json({ error: { message: 'Cannot delete an invoice that has payments recorded against it' } });
    }

    // Delete corresponding journal entry
    await JournalEntry.deleteMany({ reference: invoice.invoiceNumber });
    await Invoice.findByIdAndDelete(req.params.id);

    res.json({ message: `Invoice ${invoice.invoiceNumber} and its journal entries removed successfully` });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. RECEIVE PAYMENTS (QUICKBOOKS WORKFLOW)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/finance/payments — record payment, post double entry, issue receipt
router.post('/payments', protect, authorize(...FINANCE_EDIT_ROLES, 'parent'), async (req, res) => {
  try {
    const {
      invoiceId,
      amount,
      paymentMethod = 'Bank Transfer',
      depositAccount = '1020',
      transactionReference,
      payerName,
      payerPhone,
      notes,
      paymentDate
    } = req.body;

    const invoice = await Invoice.findById(invoiceId).populate('student');
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });

    if (invoice.status === 'paid' || invoice.status === 'waived') {
      return res.status(400).json({ error: { message: `Invoice is already ${invoice.status}` } });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: { message: 'Payment amount must be greater than zero' } });
    }

    if (payAmount > invoice.balance) {
      return res.status(400).json({ error: { message: `Payment amount exceeds invoice balance of UGX ${invoice.balance.toLocaleString()}` } });
    }

    // Lookup deposit account
    const accDoc = await Account.findOne({ code: depositAccount });
    const depositAccountName = accDoc?.name || 'Bank Operating Account';

    // Update invoice
    invoice.paidAmount += payAmount;
    await invoice.save(); // pre-save updates status and balance

    // Generate receipt number
    const paymentNumber = await generatePaymentNumber();

    // Auto-post double-entry journal:
    // Debit Bank/Cash Account (increasing Asset)
    // Credit Accounts Receivable (reducing Asset)
    const journal = await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: paymentDate ? new Date(paymentDate) : new Date(),
      description: `Payment receipt ${paymentNumber} for ${invoice.invoiceNumber}`,
      reference: transactionReference || paymentNumber,
      academicYear: invoice.academicYear,
      lines: [
        {
          accountCode: depositAccount,
          accountName: depositAccountName,
          accountType: 'Asset',
          debit: payAmount,
          credit: 0
        },
        {
          accountCode: '1200',
          accountName: 'Accounts Receivable (A/R - Student Fees)',
          accountType: 'Asset',
          debit: 0,
          credit: payAmount
        }
      ],
      createdBy: req.user._id
    });

    const payment = await Payment.create({
      paymentNumber,
      invoice: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      student: invoice.student?._id || invoice.student,
      studentId: invoice.studentId,
      studentName: invoice.student?.user?.name || payerName || invoice.studentId,
      amount: payAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod,
      depositAccount,
      depositAccountName,
      transactionReference,
      payerName,
      payerPhone,
      notes,
      journalEntry: journal._id,
      receivedBy: req.user._id
    });

    // Check financial clearance (>= 40% paid unlocks class permit)
    if (invoice.student?._id) {
      const studentDoc = await Student.findById(invoice.student._id);
      if (studentDoc && (invoice.paidAmount / invoice.totalAmount) >= 0.4) {
        studentDoc.financialClearance = true;
        await studentDoc.save();
      }
    }

    res.status(201).json({
      message: `Payment of UGX ${payAmount.toLocaleString()} recorded successfully!`,
      payment,
      invoice
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/finance/payments — list all payments
router.get('/payments', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { search, method, startDate, endDate, limit = 100 } = req.query;
    const query = {};
    if (method) query.paymentMethod = method;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    let payments = await Payment.find(query)
      .populate('student', 'studentId user')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      payments = payments.filter(p =>
        p.paymentNumber?.toLowerCase().includes(q) ||
        p.invoiceNumber?.toLowerCase().includes(q) ||
        p.studentName?.toLowerCase().includes(q) ||
        p.transactionReference?.toLowerCase().includes(q)
      );
    }

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/finance/payments/:id
router.get('/payments/:id', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('invoice')
      .populate('student')
      .populate('receivedBy', 'name');
    if (!payment) return res.status(404).json({ error: { message: 'Payment record not found' } });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @desc  Record payment against an invoice (legacy wrapper)
// @route POST /api/finance/invoices/:id/pay
router.post('/invoices/:id/pay', protect, authorize(...FINANCE_EDIT_ROLES, 'parent'), async (req, res) => {
  req.body.invoiceId = req.params.id;
  try {
    const invoice = await Invoice.findById(req.params.id).populate('student');
    if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });

    const payAmount = parseFloat(req.body.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: { message: 'Invalid payment amount' } });
    }
    if (payAmount > invoice.balance) {
      return res.status(400).json({ error: { message: `Amount exceeds balance of UGX ${invoice.balance.toLocaleString()}` } });
    }

    invoice.paidAmount += payAmount;
    await invoice.save();

    const paymentNumber = await generatePaymentNumber();
    const depositAccount = req.body.depositAccount || '1020';
    const accDoc = await Account.findOne({ code: depositAccount });

    await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: new Date(),
      description: `Payment receipt ${paymentNumber} for ${invoice.invoiceNumber}`,
      reference: req.body.transactionRef || paymentNumber,
      academicYear: invoice.academicYear,
      lines: [
        { accountCode: depositAccount, accountName: accDoc?.name || 'Bank Operating Account', accountType: 'Asset', debit: payAmount, credit: 0 },
        { accountCode: '1200', accountName: 'Accounts Receivable (A/R - Student Fees)', accountType: 'Asset', debit: 0, credit: payAmount }
      ],
      createdBy: req.user._id
    });

    const payment = await Payment.create({
      paymentNumber,
      invoice: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      student: invoice.student?._id || invoice.student,
      studentId: invoice.studentId,
      studentName: invoice.student?.user?.name || invoice.studentId,
      amount: payAmount,
      paymentMethod: req.body.method || 'Bank Transfer',
      depositAccount,
      depositAccountName: accDoc?.name || 'Bank Operating Account',
      transactionReference: req.body.transactionRef,
      payerName: req.body.payerName,
      receivedBy: req.user._id
    });

    res.json({ message: 'Payment recorded successfully', payment, invoice });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. DYNAMIC TUITION & FEE STRUCTURES BY CLASS & AUXILIARY ITEMS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/fee-structures
router.get('/fee-structures', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    const query = {};
    if (academicYear) query.academicYear = parseInt(academicYear, 10);
    if (term) query.term = term;

    const structures = await FeeStructure.find(query).sort({ classLevel: 1, term: 1 });
    res.json(structures);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/fee-structures — configure tuition, boarding, tours per class
router.post('/fee-structures', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const {
      classLevel,
      term,
      academicYear,
      tuitionFee = 0,
      developmentFee = 0,
      functionalFee = 0,
      boardingFee = 0,
      transportFee = 0,
      examFee = 0,
      otherFees = [],
      notes
    } = req.body;

    if (!classLevel || !term) {
      return res.status(400).json({ error: { message: 'Class level and term are required' } });
    }

    const year = parseInt(academicYear, 10) || new Date().getFullYear();
    const otherFeesTotal = (otherFees || []).reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

    const totalDayStudent =
      Number(tuitionFee) +
      Number(developmentFee) +
      Number(functionalFee) +
      Number(transportFee) +
      Number(examFee) +
      otherFeesTotal;

    const totalBoardingStudent = totalDayStudent + Number(boardingFee);

    const updated = await FeeStructure.findOneAndUpdate(
      { classLevel, term, academicYear: year },
      {
        classLevel,
        term,
        academicYear: year,
        tuitionFee: Number(tuitionFee),
        developmentFee: Number(developmentFee),
        functionalFee: Number(functionalFee),
        boardingFee: Number(boardingFee),
        transportFee: Number(transportFee),
        examFee: Number(examFee),
        otherFees,
        totalDayStudent,
        totalBoardingStudent,
        totalAmount: totalDayStudent,
        notes,
        createdBy: req.user._id
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(updated);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// DELETE /api/finance/fee-structures/:id
router.delete('/fee-structures/:id', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    await FeeStructure.findByIdAndDelete(req.params.id);
    res.json({ message: 'Fee structure deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. QUICKBOOKS FINANCIAL STATEMENTS & REPORTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/reports/profit-loss (Income Statement)
router.get('/reports/profit-loss', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const year = parseInt(req.query.academicYear, 10) || new Date().getFullYear();
    const entries = await JournalEntry.find({ academicYear: year }).select('lines');

    const incomeAccounts = {};
    const expenseAccounts = {};

    entries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        if (line.accountType === 'Income') {
          const key = line.accountCode;
          if (!incomeAccounts[key]) {
            incomeAccounts[key] = { code: line.accountCode, name: line.accountName, amount: 0 };
          }
          // Income normal balance is Credit - Debit
          incomeAccounts[key].amount += (Number(line.credit || 0) - Number(line.debit || 0));
        } else if (line.accountType === 'Expense') {
          const key = line.accountCode;
          if (!expenseAccounts[key]) {
            expenseAccounts[key] = { code: line.accountCode, name: line.accountName, amount: 0 };
          }
          // Expense normal balance is Debit - Credit
          expenseAccounts[key].amount += (Number(line.debit || 0) - Number(line.credit || 0));
        }
      });
    });

    const incomeList = Object.values(incomeAccounts).sort((a, b) => a.code.localeCompare(b.code));
    const expenseList = Object.values(expenseAccounts).sort((a, b) => a.code.localeCompare(b.code));

    const totalIncome = incomeList.reduce((acc, i) => acc + i.amount, 0);
    const totalExpenses = expenseList.reduce((acc, e) => acc + e.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    res.json({
      academicYear: year,
      incomeList,
      totalIncome,
      expenseList,
      totalExpenses,
      netIncome,
      netMarginPercentage: totalIncome > 0 ? Math.round((netIncome / totalIncome) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/finance/reports/balance-sheet
router.get('/reports/balance-sheet', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const year = parseInt(req.query.academicYear, 10) || new Date().getFullYear();
    const accounts = await Account.find({ isActive: true }).lean();
    const entries = await JournalEntry.find({ academicYear: year }).select('lines');

    const balanceByCode = {};
    entries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        const c = line.accountCode;
        if (!balanceByCode[c]) balanceByCode[c] = { debit: 0, credit: 0 };
        balanceByCode[c].debit += Number(line.debit || 0);
        balanceByCode[c].credit += Number(line.credit || 0);
      });
    });

    const assets = [];
    const liabilities = [];
    const equity = [];
    let netSurplus = 0;

    // Calculate net income for equity retained surplus
    entries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        if (line.accountType === 'Income') netSurplus += (Number(line.credit || 0) - Number(line.debit || 0));
        if (line.accountType === 'Expense') netSurplus -= (Number(line.debit || 0) - Number(line.credit || 0));
      });
    });

    accounts.forEach(acc => {
      const stats = balanceByCode[acc.code] || { debit: 0, credit: 0 };
      const opening = Number(acc.openingBalance || 0);

      if (acc.type === 'Asset') {
        const balance = opening + (stats.debit - stats.credit);
        assets.push({ code: acc.code, name: acc.name, subType: acc.subType, balance });
      } else if (acc.type === 'Liability') {
        const balance = opening + (stats.credit - stats.debit);
        liabilities.push({ code: acc.code, name: acc.name, subType: acc.subType, balance });
      } else if (acc.type === 'Equity') {
        let balance = opening + (stats.credit - stats.debit);
        if (acc.code === '3020') {
          balance += netSurplus; // Add current period net surplus
        }
        equity.push({ code: acc.code, name: acc.name, subType: acc.subType, balance });
      }
    });

    const totalAssets = assets.reduce((acc, a) => acc + a.balance, 0);
    const totalLiabilities = liabilities.reduce((acc, l) => acc + l.balance, 0);
    const totalEquity = equity.reduce((acc, e) => acc + e.balance, 0);

    res.json({
      academicYear: year,
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/finance/reports/trial-balance
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
        credit: 0
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
        credit: total.credit + account.credit
      }), { debit: 0, credit: 0 })
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. GENERAL LEDGER & JOURNALS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/journal-entries
router.get('/journal-entries', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { academicYear = new Date().getFullYear(), limit = 100 } = req.query;
    const entries = await JournalEntry.find({ academicYear: parseInt(academicYear, 10) })
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/finance/journal-entries — manual balanced journal entry
router.post('/journal-entries', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const { date, description, reference, academicYear, lines } = req.body;
    const entry = await JournalEntry.create({
      entryNumber: await generateJournalEntryNumber(),
      date: date || new Date(),
      description,
      reference,
      academicYear: academicYear || new Date().getFullYear(),
      lines,
      createdBy: req.user._id
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. PAYROLL, EXPENSES, WALLET & SUMMARY (PRESERVED)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/my-invoices
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

// GET /api/finance/reports/summary
router.get('/reports/summary', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { academicYear = new Date().getFullYear(), term } = req.query;
    const matchQ = { academicYear: parseInt(academicYear, 10) };
    if (term) matchQ.term = term;

    const [invoiceStats, expenseStats, payrollStats] = await Promise.all([
      Invoice.aggregate([
        { $match: matchQ },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Expense.aggregate([
        { $match: { ...matchQ, status: 'approved' } },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Payroll.aggregate([
        { $match: { year: parseInt(academicYear, 10), status: 'processed' } },
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$grossPay' },
            totalNet: { $sum: '$netPay' },
            totalDeductions: { $sum: '$totalDeductions' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalInvoiced = invoiceStats.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCollected = invoiceStats.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalExpenses = expenseStats.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPayroll = payrollStats[0]?.totalGross || 0;

    res.json({
      revenue: {
        totalInvoiced,
        totalCollected,
        outstanding: totalInvoiced - totalCollected,
        collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
        breakdown: invoiceStats
      },
      expenses: {
        totalExpenses,
        byCategory: expenseStats
      },
      payroll: {
        totalPayroll,
        netPay: payrollStats[0]?.totalNet || 0,
        deductions: payrollStats[0]?.totalDeductions || 0,
        staffCount: payrollStats[0]?.count || 0
      },
      netSurplus: totalCollected - (totalExpenses + totalPayroll)
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// Payroll endpoints
router.get('/payroll', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};
    if (month) query.month = parseInt(month, 10);
    if (year) query.year = parseInt(year, 10);
    const payroll = await Payroll.find(query).populate('staff', 'name email role department').sort({ year: -1, month: -1 });
    res.json(payroll);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/payroll/generate', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  const { month, year } = req.body;
  try {
    const staffMembers = await User.find({ role: { $in: ['teacher', 'admin', 'bursar'] }, isActive: true });
    const records = [];
    for (const staff of staffMembers) {
      const exists = await Payroll.findOne({ staff: staff._id, month, year });
      if (exists) continue;
      const baseSalary = 800000;
      const paye = baseSalary * 0.1;
      const nssf = baseSalary * 0.05;
      const netPay = baseSalary - (paye + nssf);

      const record = await Payroll.create({
        staff: staff._id,
        month,
        year,
        baseSalary,
        allowances: [],
        deductions: [{ type: 'PAYE', amount: paye }, { type: 'NSSF', amount: nssf }],
        grossPay: baseSalary,
        totalDeductions: paye + nssf,
        netPay,
        status: 'draft',
        generatedBy: req.user._id
      });
      records.push(record);
    }
    res.status(201).json({ message: `Generated ${records.length} payroll slips`, records });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

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

// Expenses
router.get('/expenses', protect, authorize(...FINANCE_VIEW_ROLES), async (req, res) => {
  try {
    const { category, status, academicYear } = req.query;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (academicYear) query.academicYear = parseInt(academicYear, 10);
    const expenses = await Expense.find(query).populate('submittedBy', 'name').populate('approvedBy', 'name').sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/expenses', protect, authorize(...FINANCE_EDIT_ROLES, 'teacher'), async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/expenses/:id/approve', protect, authorize(...FINANCE_EDIT_ROLES), async (req, res) => {
  try {
    const { action } = req.body;
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

// Cafeteria Wallet
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

// SMS Fee Reminder
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
