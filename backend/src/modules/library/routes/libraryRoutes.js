const express = require('express');
const router = express.Router();
const LibraryBook = require('../models/LibraryBook');
const LibraryLoan = require('../models/LibraryLoan');
const { protect, authorize } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// BOOKS CATALOG
// ═══════════════════════════════════════════════════════════════════════════

router.get('/books', protect, async (req, res) => {
  try {
    const { category, search, gradeLevel, available, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (gradeLevel) query.gradeLevel = gradeLevel;
    if (available === 'true') query.availableCopies = { $gt: 0 };
    if (search) query.$text = { $search: search };

    const books = await LibraryBook.find(query)
      .sort({ title: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await LibraryBook.countDocuments(query);
    res.json({ books, total });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/books', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const book = await LibraryBook.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/books/:id', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const book = await LibraryBook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ error: { message: 'Book not found' } });
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/books/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    await LibraryBook.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Book removed from catalog' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LOANS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/loans', protect, authorize('super-admin', 'admin', 'teacher', 'class-teacher'), async (req, res) => {
  try {
    const { status, borrowerId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (borrowerId) query.borrowerId = borrowerId;

    const loans = await LibraryLoan.find(query)
      .populate('book', 'title author isbn')
      .populate('issuedBy', 'name')
      .sort({ issueDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await LibraryLoan.countDocuments(query);
    res.json({ loans, total });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/library/loans — issue a book
router.post('/loans', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  const { bookId, borrowerType, borrowerId, borrowerName, borrowerClass, dueDate } = req.body;
  try {
    const book = await LibraryBook.findById(bookId);
    if (!book) return res.status(404).json({ error: { message: 'Book not found' } });
    if (book.availableCopies < 1) {
      return res.status(400).json({ error: { message: 'No copies available for this book' } });
    }

    const loan = await LibraryLoan.create({
      book: bookId,
      bookTitle: book.title,
      borrowerType,
      borrowerId,
      borrowerName,
      borrowerClass,
      dueDate: new Date(dueDate),
      issuedBy: req.user._id,
    });

    // Decrement available copies
    await LibraryBook.findByIdAndUpdate(bookId, { $inc: { availableCopies: -1 } });

    res.status(201).json(loan);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/library/loans/:id/return — return a book
router.put('/loans/:id/return', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const loan = await LibraryLoan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: { message: 'Loan not found' } });
    if (loan.status === 'returned') {
      return res.status(400).json({ error: { message: 'Book already returned' } });
    }

    const returnDate = new Date();
    const isOverdue = returnDate > loan.dueDate;
    const daysOverdue = isOverdue ? Math.ceil((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24)) : 0;
    const fineAmount = daysOverdue * (req.body.finePerDay || 500); // UGX 500/day default

    await LibraryLoan.findByIdAndUpdate(req.params.id, {
      returnDate,
      status: 'returned',
      fineAmount,
      finePaid: req.body.finePaid || false,
      returnedTo: req.user._id,
      notes: req.body.notes,
    });

    // Restore available copies
    await LibraryBook.findByIdAndUpdate(loan.book, { $inc: { availableCopies: 1 } });

    res.json({ message: 'Book returned', daysOverdue, fineAmount });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/stats', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const [totalBooks, totalCopies, activeLoans, overdueLoans, byCategory, totalTitles] = await Promise.all([
      LibraryBook.countDocuments({ isActive: true }),
      LibraryBook.aggregate([{ $group: { _id: null, total: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } }]),
      LibraryLoan.countDocuments({ status: 'active' }),
      LibraryLoan.countDocuments({ status: 'active', dueDate: { $lt: new Date() } }),
      LibraryBook.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, copies: { $sum: '$totalCopies' } } },
        { $sort: { copies: -1 } },
      ]),
      LibraryBook.countDocuments({ isActive: true }),
    ]);

    res.json({
      totalTitles,
      totalCopies: totalCopies[0]?.total || 0,
      availableCopies: totalCopies[0]?.available || 0,
      activeLoans,
      overdueLoans,
      byCategory,
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
