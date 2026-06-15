const express = require('express');
const FeeStructure = require('../models/FeeStructure');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
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
// @desc    Record/pay student fees
// @access  Private (Admin/Super-Admin/Parent for self)
router.post('/payments', protect, async (req, res) => {
  const { studentId, term, academicYear, amountPaid, paymentMethod, transactionReference, remarks } = req.body;

  try {
    // Only allow admin, or parent of the student to make payments
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }

    if (req.user.role === 'parent' && String(student.parentUser) !== String(req.user._id)) {
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
      remarks: remarks || ''
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/fees/invoice/:studentId/:term
// @desc    Get current invoice & payment details for a student
// @access  Private
router.get('/invoice/:studentId/:term', protect, async (req, res) => {
  const { studentId, term } = req.params;
  const academicYear = req.query.academicYear || new Date().getFullYear();

  try {
    const student = await Student.findById(studentId).populate('class');
    if (!student) {
      return res.status(404).json({ error: { message: 'Student not found' } });
    }

    // Find applicable fee structure
    const feeStructure = await FeeStructure.findOne({
      classLevel: student.class.level,
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

module.exports = router;
