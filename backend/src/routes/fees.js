const express = require('express');
const FeeStructure = require('../models/FeeStructure');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Helper to generate unique Receipt Numbers
const generateReceiptNumber = async () => {
  const prefix = `REC-${new Date().getFullYear()}-`;
  const latestPayment = await Payment.findOne({
    receiptNumber: new RegExp('^' + prefix)
  }).sort({ receiptNumber: -1 });

  let sequence = 1;
  if (latestPayment) {
    const lastNum = latestPayment.receiptNumber;
    const lastSeq = parseInt(lastNum.split('-')[2], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

// @route   POST /api/fees/structures
// @desc    Set fee structure for a class level & term
// @access  Private (Admin/Super-Admin)
router.post('/structures', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { classLevel, term, academicYear, tuitionFee, developmentFee, functionalFee, otherFees } = req.body;

  try {
    const tuition = parseFloat(tuitionFee) || 0;
    const dev = parseFloat(developmentFee) || 0;
    const func = parseFloat(functionalFee) || 0;
    
    let otherSum = 0;
    const formattedOthers = (otherFees || []).map(f => {
      const amt = parseFloat(f.amount) || 0;
      otherSum += amt;
      return { name: f.name, amount: amt };
    });

    const totalAmount = tuition + dev + func + otherSum;
    const year = academicYear || new Date().getFullYear();

    const structure = await FeeStructure.findOneAndUpdate(
      { classLevel, term, academicYear: year },
      {
        tuitionFee: tuition,
        developmentFee: dev,
        functionalFee: func,
        otherFees: formattedOthers,
        totalAmount
      },
      { new: true, upsert: true }
    );

    res.status(200).json(structure);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/fees/structures
// @desc    Get all fee structures
// @access  Private
router.get('/structures', protect, async (req, res) => {
  try {
    const structures = await FeeStructure.find({});
    res.status(200).json(structures);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/fees/payments
// @desc    Record/pay student fees (Stage 1: Recorded)
// @access  Private (Admin/Super-Admin/Bursar/Parent for self)
router.post('/payments', protect, authorize('super-admin', 'admin', 'bursar', 'parent', 'student'), async (req, res) => {
  const { studentId, term, academicYear, amountPaid, paymentMethod, transactionReference, remarks } = req.body;

  try {
    // Only allow admin, bursar, or parent of the student to make payments
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }
    if (req.user.role === 'parent' && String(student.parentUser) !== String(req.user._id) && student.parentEmail !== req.user.email) {
      return res.status(403).json({ error: { message: 'Not authorized to pay for this student' } });
    }
    if (req.user.role === 'student' && String(student.user) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Not authorized to pay for this student' } });
    }

    const year = academicYear || new Date().getFullYear();
    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      student: studentId,
      term,
      academicYear: year,
      amountPaid: parseFloat(amountPaid),
      paymentMethod,
      transactionReference,
      receiptNumber,
      recordedBy: req.user._id,
      status: 'recorded',
      remarks: remarks || ''
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/fees/payments/:id/verify
// @desc    Stage 2: Verify recorded payment against bank slip or telecom statement
// @access  Private (Bursar, Admin, Super-Admin)
router.post('/payments/:id/verify', protect, authorize('bursar', 'admin', 'super-admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: { message: 'Payment not found' } });
    if (payment.status === 'posted') {
      return res.status(400).json({ error: { message: 'Payment is already posted to account' } });
    }

    payment.status = 'verified';
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    res.json({ message: 'Payment verified successfully', payment });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   POST /api/fees/payments/:id/post
// @desc    Stage 3: Post verified payment to student fee account & update balance
// @access  Private (Bursar, Admin, Super-Admin)
router.post('/payments/:id/post', protect, authorize('bursar', 'admin', 'super-admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('student');
    if (!payment) return res.status(404).json({ error: { message: 'Payment not found' } });
    if (payment.status === 'posted') {
      return res.status(400).json({ error: { message: 'Payment is already posted' } });
    }

    payment.status = 'posted';
    payment.postedBy = req.user._id;
    payment.postedAt = new Date();
    if (!payment.verifiedBy) {
      payment.verifiedBy = req.user._id;
      payment.verifiedAt = new Date();
    }
    await payment.save();

    // Commit to FeeAccount running ledger
    const FeeAccount = require('../models/FeeAccount');
    let feeAccount = await FeeAccount.findOne({
      student: payment.student._id || payment.student,
      academicYear: payment.academicYear,
      term: payment.term
    });

    if (!feeAccount) {
      feeAccount = new FeeAccount({
        student: payment.student._id || payment.student,
        studentId: payment.student?.studentId || '',
        academicYear: payment.academicYear,
        term: payment.term,
        ledger: []
      });
    }

    feeAccount.ledger.push({
      type: 'payment',
      amount: payment.amountPaid,
      description: `Payment via ${payment.paymentMethod} (Ref: ${payment.transactionReference || 'N/A'})`,
      reference: payment.receiptNumber,
      recordedBy: req.user._id,
      date: payment.paymentDate || new Date()
    });

    feeAccount.recalculate();
    await feeAccount.save();

    res.json({
      message: 'Payment posted to account ledger successfully',
      payment,
      updatedBalance: feeAccount.balance,
      totalPaid: feeAccount.totalPaid
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   POST /api/fees/payments/:id/reject
// @desc    Reject invalid or bounced payment
// @access  Private (Bursar, Admin, Super-Admin)
router.post('/payments/:id/reject', protect, authorize('bursar', 'admin', 'super-admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: { message: 'Payment not found' } });

    payment.status = 'rejected';
    payment.rejectionReason = rejectionReason || 'Payment verification failed';
    await payment.save();

    res.json({ message: 'Payment rejected', payment });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   GET /api/fees/payments/pipeline
// @desc    Get 3-stage payment queue (recorded, verified, posted, rejected)
// @access  Private (Bursar, Admin, Super-Admin)
router.get('/payments/pipeline', protect, authorize('bursar', 'admin', 'super-admin'), async (req, res) => {
  try {
    const { term, academicYear, status } = req.query;
    const query = {};
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('student', 'studentId admissionNumber currentClassLevel currentStream')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('recordedBy', 'name')
      .populate('verifiedBy', 'name')
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });

    const counts = {
      recorded: payments.filter(p => p.status === 'recorded').length,
      verified: payments.filter(p => p.status === 'verified').length,
      posted: payments.filter(p => p.status === 'posted').length,
      rejected: payments.filter(p => p.status === 'rejected').length,
    };

    res.json({ counts, payments });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   GET /api/fees/invoice/:studentId/:term
// @desc    Get current invoice & payment details for a student
// @access  Private
router.get('/invoice/:studentId/:term', protect, async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const student = await Student.findById(studentId).populate('currentClass');
    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }
    if (req.user.role === 'parent' && String(student.parentUser) !== String(req.user._id) && student.parentEmail !== req.user.email) {
      return res.status(403).json({ error: { message: 'Not authorized to view this invoice' } });
    }
    if (req.user.role === 'student' && String(student.user) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Not authorized to view this invoice' } });
    }

    // Find applicable fee structure
    const feeStructure = await FeeStructure.findOne({
      classLevel: student.currentClass?.level,
      term,
      academicYear
    });

    // Find all payments made
    const payments = await Payment.find({
      student: studentId,
      term,
      academicYear
    });

    const totalInvoiced = feeStructure ? feeStructure.totalAmount : 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const balance = totalInvoiced - totalPaid;

    res.status(200).json({
      student,
      term,
      academicYear,
      feeStructure,
      payments,
      summary: {
        totalInvoiced,
        totalPaid,
        balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ──── PAYMENT PLANS ────────────────────────────────────────────────────────
const PaymentPlan = require('../models/PaymentPlan');
const SMSService = require('../services/smsService');
const InvoiceGenerator = require('../services/invoiceGenerator');

// @route   POST /api/fees/payment-plans
// @desc    Create a payment plan with multiple installments
// @access  Private (Admin/Super-Admin)
router.post('/payment-plans', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { studentId, term, academicYear, totalAmount, installments, notes } = req.body;

  try {
    if (!installments || installments.length < 2) {
      return res.status(400).json({ error: { message: 'Payment plan must have at least 2 installments' } });
    }

    // Verify amounts add up
    const installmentSum = installments.reduce((sum, inst) => sum + inst.amount, 0);
    if (installmentSum !== totalAmount) {
      return res.status(400).json({ error: { message: 'Installment amounts must equal total amount' } });
    }

    const plan = await PaymentPlan.create({
      student: studentId,
      term,
      academicYear,
      totalAmount,
      installments: installments.map((inst, idx) => ({
        installmentNumber: idx + 1,
        dueDate: new Date(inst.dueDate),
        amount: inst.amount,
        status: 'pending'
      })),
      createdBy: req.user.id,
      notes
    });

    // Notify parent via SMS
    const student = await Student.findById(studentId).populate('user');
    if (student && student.user) {
      await SMSService.sendPaymentPlanNotification(
        student.parentPhone,
        student.user.name,
        installments.length
      );
    }

    res.status(201).json(plan);
  } catch (error) {
    console.error('Payment plan error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/fees/payment-plans/:studentId/:term
// @desc    Get payment plan for a student/term
// @access  Private
router.get('/payment-plans/:studentId/:term', protect, async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const administrativeRoles = ['super-admin', 'admin', 'headteacher', 'bursar'];
    if (!administrativeRoles.includes(req.user.role)) {
      const student = await Student.findById(studentId).select('user parentUser parentEmail');
      const isStudentOwner = req.user.role === 'student' && String(student?.user) === String(req.user._id);
      const isParentOwner = req.user.role === 'parent' && (
        String(student?.parentUser) === String(req.user._id) ||
        student?.parentEmail === req.user.email
      );

      if (!isStudentOwner && !isParentOwner) {
        return res.status(403).json({ error: { message: 'You are not authorized to view this payment plan' } });
      }
    }

    const plan = await PaymentPlan.findOne({
      student: studentId,
      term,
      academicYear
    });

    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   PUT /api/fees/payment-plans/:planId/installment/:instNum
// @desc    Mark installment as paid
// @access  Private (Admin)
router.put('/payment-plans/:planId/installment/:instNum', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const { planId, instNum } = req.params;
  const { amountPaid } = req.body;

  try {
    const plan = await PaymentPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: { message: 'Payment plan not found' } });
    }

    const installment = plan.installments[instNum - 1];
    if (!installment) {
      return res.status(404).json({ error: { message: 'Installment not found' } });
    }

    installment.amountPaid = amountPaid;
    installment.status = amountPaid >= installment.amount ? 'paid' : 'partial';
    installment.paymentDate = new Date();

    // Check if all paid
    const allPaid = plan.installments.every(inst => inst.status === 'paid');
    if (allPaid) {
      plan.status = 'completed';
    }

    await plan.save();
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ──── INVOICE PDF ────────────────────────────────────────────────────────

// @route   GET /api/fees/invoice-pdf/:studentId/:term
// @desc    Generate and download invoice PDF
// @access  Private
router.get('/invoice-pdf/:studentId/:term', protect, async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const student = await Student.findById(studentId).populate('class user');
    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }
    if (req.user.role === 'parent' && String(student.parentUser) !== String(req.user._id) && student.parentEmail !== req.user.email) {
      return res.status(403).json({ error: { message: 'Not authorized to download this invoice' } });
    }
    if (req.user.role === 'student' && String(student.user) !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Not authorized to download this invoice' } });
    }

    const feeStructure = await FeeStructure.findOne({
      classLevel: student.class.level,
      term,
      academicYear
    });

    const payments = await Payment.find({
      student: studentId,
      term,
      academicYear
    });

    const totalInvoiced = feeStructure ? feeStructure.totalAmount : 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

    // Build invoice data
    const invoiceData = {
      schoolName: 'Ndugu Academy',
      schoolAddress: 'Kampala, Uganda',
      studentName: student.user.name,
      studentId: student.studentId,
      className: student.class.name,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      academicYear,
      term,
      totalAmount: totalInvoiced,
      amountPaid: totalPaid,
      outstandingBalance: totalInvoiced - totalPaid,
      feeBreakdown: feeStructure ? [
        { description: 'Tuition', amount: feeStructure.tuitionFee },
        { description: 'Development', amount: feeStructure.developmentFee },
        { description: 'Functional', amount: feeStructure.functionalFee },
        ...(feeStructure.otherFees || []).map(f => ({ description: f.name, amount: f.amount }))
      ] : [],
      paymentHistory: payments.map(p => ({
        paymentDate: p.paymentDate,
        receiptNumber: p.receiptNumber,
        amountPaid: p.amountPaid,
        paymentMethod: p.paymentMethod
      }))
    };

    // Generate PDF
    const fileName = `invoice-${studentId}-${term}-${Date.now()}.pdf`;
    const filePath = `/tmp/${fileName}`;
    
    await InvoiceGenerator.generateInvoice(invoiceData, filePath);

    // Send file
    res.download(filePath, `Invoice-${student.studentId}-${term}.pdf`, (err) => {
      if (err) console.error('Download error:', err);
      // Clean up file
      const fs = require('fs');
      fs.unlink(filePath, (err) => {
        if (err) console.error('File cleanup error:', err);
      });
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// ──── FEE REPORTS ────────────────────────────────────────────────────────

// @route   GET /api/fees/reports/class-summary
// @desc    Get fee collection summary by class
// @access  Private (Admin)
router.get('/reports/class-summary', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const term = req.query.term || 'Term 1';
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const classes = await Class.find();
    const summary = [];

    for (const cls of classes) {
      const students = await Student.find({ currentClass: cls._id });
      const feeStructure = await FeeStructure.findOne({
        classLevel: cls.level,
        term,
        academicYear
      });

      if (!students.length) continue;

      const totalFees = feeStructure ? feeStructure.totalAmount * students.length : 0;
      let totalPaid = 0;

      for (const student of students) {
        const payments = await Payment.find({
          student: student._id,
          term,
          academicYear
        });
        totalPaid += payments.reduce((sum, p) => sum + p.amountPaid, 0);
      }

      const balance = totalFees - totalPaid;
      const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

      summary.push({
        className: cls.name,
        classLevel: cls.level,
        enrolledStudents: students.length,
        totalFeesExpected: totalFees,
        totalFeesCollected: totalPaid,
        outstandingBalance: balance,
        collectionRate: parseFloat(collectionRate.toFixed(2))
      });
    }

    res.status(200).json({
      term,
      academicYear,
      summary,
      totalExpected: summary.reduce((sum, c) => sum + c.totalFeesExpected, 0),
      totalCollected: summary.reduce((sum, c) => sum + c.totalFeesCollected, 0),
      totalBalance: summary.reduce((sum, c) => sum + c.outstandingBalance, 0)
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/fees/reports/overdue-students
// @desc    Get students with outstanding balances
// @access  Private (Admin)
router.get('/reports/overdue-students', protect, authorize('admin', 'super-admin'), async (req, res) => {
  const term = req.query.term || 'Term 1';
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const students = await Student.find().populate('user class');
    const overdueList = [];

    for (const student of students) {
      const feeStructure = await FeeStructure.findOne({
        classLevel: student.class.level,
        term,
        academicYear
      });

      const payments = await Payment.find({
        student: student._id,
        term,
        academicYear
      });

      const totalInvoiced = feeStructure ? feeStructure.totalAmount : 0;
      const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const balance = totalInvoiced - totalPaid;

      if (balance > 0) {
        overdueList.push({
          studentId: student.studentId,
          studentName: student.user.name,
          className: student.class.name,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          totalFeesExpected: totalInvoiced,
          amountPaid: totalPaid,
          outstandingBalance: balance,
          lastPaymentDate: payments.length > 0 ? payments[payments.length - 1].paymentDate : null
        });
      }
    }

    res.status(200).json({
      term,
      academicYear,
      totalStudentsWithBalance: overdueList.length,
      totalOutstanding: overdueList.reduce((sum, s) => sum + s.outstandingBalance, 0),
      students: overdueList
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// ──── SMS REMINDERS ────────────────────────────────────────────────────────

// @route   POST /api/fees/send-reminders
// @desc    Send payment reminders to parents with due payments
// @access  Private (Admin)
router.post('/send-reminders', protect, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find all payment plans with reminders due in 7 days
    const plans = await PaymentPlan.find({
      status: 'active',
      'installments.dueDate': { $gte: today, $lte: sevenDaysFromNow },
      'installments.reminderSent': false,
      'installments.status': { $ne: 'paid' }
    }).populate('student');

    let remindersSent = 0;
    const results = [];

    for (const plan of plans) {
      for (const installment of plan.installments) {
        const instDate = new Date(installment.dueDate);
        if (instDate >= today && instDate <= sevenDaysFromNow && !installment.reminderSent && installment.status !== 'paid') {
          const student = plan.student;

          // Send SMS
          const smsResult = await SMSService.sendPaymentReminder(
            student.parentPhone,
            student.user ? student.user.name : 'Student',
            installment.dueDate,
            installment.amount
          );

          if (smsResult.success) {
            installment.reminderSent = true;
            installment.reminderSentDate = new Date();
            remindersSent++;
          }

          results.push({
            studentId: student.studentId,
            studentName: student.user ? student.user.name : 'Unknown',
            phoneNumber: student.parentPhone,
            amount: installment.amount,
            dueDate: installment.dueDate,
            smsSent: smsResult.success,
            error: smsResult.error
          });
        }
      }
      await plan.save();
    }

    res.status(200).json({
      remindersSent,
      results
    });
  } catch (error) {
    console.error('Reminder error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
