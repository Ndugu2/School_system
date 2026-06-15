const express = require('express');
const router = express.Router();
const { Course, ContentModule, Assignment, Submission, Quiz, QuizAttempt, DiscussionPost } = require('../models');
const Student = require('../../../models/Student');
const { protect, authorize } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/courses', protect, async (req, res) => {
  try {
    const { gradeLevel, term, academicYear, isHolidayCourse } = req.query;
    const query = { isActive: true };
    if (gradeLevel) query.gradeLevel = gradeLevel;
    if (term) query.term = term;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (isHolidayCourse !== undefined) query.isHolidayCourse = isHolidayCourse === 'true';

    // Students only see courses for their class
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id }).populate('class', 'level');
      if (student) query.gradeLevel = student.class?.level;
    }

    const courses = await Course.find(query)
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/courses', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, teacher: req.user._id, teacherName: req.user.name });
    res.status(201).json(course);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.get('/courses/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('teacher', 'name');
    if (!course) return res.status(404).json({ error: { message: 'Course not found' } });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT MODULES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/courses/:id/modules', protect, async (req, res) => {
  try {
    const modules = await ContentModule.find({ course: req.params.id })
      .sort({ week: 1, order: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/courses/:id/modules', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const module = await ContentModule.create({ ...req.body, course: req.params.id, uploadedBy: req.user._id });
    res.status(201).json(module);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/modules/:id', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const module = await ContentModule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(module);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/modules/:id', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    await ContentModule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Content module deleted' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/courses/:id/assignments', protect, async (req, res) => {
  try {
    const assignments = await Assignment.find({ course: req.params.id, isActive: true }).sort({ dueDate: 1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/courses/:id/assignments', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const assignment = await Assignment.create({ ...req.body, course: req.params.id, createdBy: req.user._id });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route POST /api/lms/assignments/:id/submit
router.post('/assignments/:id/submit', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: { message: 'Assignment not found' } });

    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(403).json({ error: { message: 'Only students can submit assignments' } });

    // Check for existing submission
    const existing = await Submission.findOne({ assignment: assignment._id, student: student._id });
    if (existing) return res.status(400).json({ error: { message: 'You have already submitted this assignment' } });

    const isLate = new Date() > new Date(assignment.dueDate);
    const submission = await Submission.create({
      assignment: assignment._id,
      student: student._id,
      studentId: student.studentId,
      studentName: req.user.name,
      fileUrl: req.body.fileUrl || null,
      textContent: req.body.textContent || null,
      isLate,
    });

    res.status(201).json({ message: isLate ? 'Submitted (late)' : 'Submitted successfully', submission });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route GET /api/lms/assignments/:id/submissions (teacher view)
router.get('/assignments/:id/submissions', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const submissions = await Submission.find({ assignment: req.params.id }).sort({ submittedAt: 1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route PUT /api/lms/submissions/:id/grade
router.put('/submissions/:id/grade', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const { score, feedback } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { score, feedback, gradedAt: new Date(), gradedBy: req.user._id, status: 'graded' },
      { new: true }
    );
    res.json(submission);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// QUIZZES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/courses/:id/quizzes', protect, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.id, isActive: true });
    // Don't expose correct answers to students
    if (req.user.role === 'student') {
      const safeQuizzes = quizzes.map(q => ({
        ...q.toObject(),
        questions: q.questions.map(({ correctAnswer, ...rest }) => rest),
      }));
      return res.json(safeQuizzes);
    }
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/courses/:id/quizzes', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const quiz = await Quiz.create({ ...req.body, course: req.params.id, createdBy: req.user._id });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route POST /api/lms/quizzes/:id/attempt — auto-graded
const { StudentProgress } = require('../models');

router.post('/quizzes/:id/attempt', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: { message: 'Quiz not found' } });
    if (!quiz.isActive) return res.status(400).json({ error: { message: 'Quiz is not available' } });

    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(403).json({ error: { message: 'Only students can attempt quizzes' } });

    // Check max attempts
    const priorAttempts = await QuizAttempt.countDocuments({ quiz: quiz._id, student: student._id });
    if (priorAttempts >= quiz.maxAttempts) {
      return res.status(400).json({ error: { message: `Maximum ${quiz.maxAttempts} attempt(s) allowed` } });
    }

    const { answers, timeTaken } = req.body; // answers: [{ questionId, answer }]
    let score = 0;
    const gradedAnswers = [];

    for (const question of quiz.questions) {
      const studentAnswer = answers.find(a => String(a.questionId) === String(question._id));
      const isCorrect = studentAnswer?.answer === question.correctAnswer;
      const marks = isCorrect ? (question.marks || 1) : 0;
      score += marks;
      gradedAnswers.push({
        questionId: question._id,
        answer: studentAnswer?.answer || '',
        isCorrect,
        marks,
      });
    }

    const percentage = quiz.totalMarks > 0 ? Math.round((score / quiz.totalMarks) * 100) : 0;

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: student._id,
      studentId: student.studentId,
      studentName: req.user.name,
      answers: gradedAnswers,
      score,
      percentage,
      completedAt: new Date(),
      timeTaken: timeTaken || null,
      attemptNumber: priorAttempts + 1,
    });

    // Gamification Logic
    let progress = await StudentProgress.findOne({ student: student._id });
    if (!progress) {
      progress = await StudentProgress.create({ student: student._id });
    }

    // Award points (10 points per correct answer, 50 points bonus for passing >= 70%)
    const pointsEarned = (score * 10) + (percentage >= 70 ? 50 : 0);
    progress.points += pointsEarned;

    // Streak Logic (consecutive days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (progress.lastActive) {
      const lastAct = new Date(progress.lastActive);
      lastAct.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(today - lastAct);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        progress.streak += 1;
      } else if (diffDays > 1) {
        progress.streak = 1;
      }
    } else {
      progress.streak = 1;
    }
    progress.lastActive = new Date();

    // Check Badges
    const badgeNames = progress.badges.map(b => b.name);
    if (progress.streak >= 3 && !badgeNames.includes('Streak Master')) {
      progress.badges.push({ name: 'Streak Master', description: 'Maintained a 3-day learning streak!' });
    }
    if (percentage === 100 && !badgeNames.includes('Perfect Score')) {
      progress.badges.push({ name: 'Perfect Score', description: 'Scored 100% on a quiz!' });
    }
    if (progress.points >= 500 && !badgeNames.includes('Point Hoarder')) {
      progress.badges.push({ name: 'Point Hoarder', description: 'Accumulated 500+ learning points!' });
    }

    await progress.save();

    res.status(201).json({
      message: 'Quiz submitted and graded',
      score,
      percentage,
      totalMarks: quiz.totalMarks,
      gradedAnswers,
      attemptId: attempt._id,
      gamification: {
        pointsEarned,
        totalPoints: progress.points,
        streak: progress.streak,
        badges: progress.badges,
      }
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DISCUSSION BOARDS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/courses/:id/discussion', protect, async (req, res) => {
  try {
    // Top-level posts only, with reply counts
    const posts = await DiscussionPost.find({ course: req.params.id, parentPost: null, isHidden: false })
      .populate('author', 'name')
      .sort({ createdAt: -1 });

    // Get reply counts
    const postsWithReplies = await Promise.all(posts.map(async (post) => {
      const replyCount = await DiscussionPost.countDocuments({ parentPost: post._id, isHidden: false });
      return { ...post.toObject(), replyCount };
    }));

    res.json(postsWithReplies);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/discussion/:id/replies', protect, async (req, res) => {
  try {
    const replies = await DiscussionPost.find({ parentPost: req.params.id, isHidden: false })
      .populate('author', 'name')
      .sort({ createdAt: 1 });
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/courses/:id/discussion', protect, async (req, res) => {
  try {
    const post = await DiscussionPost.create({
      ...req.body,
      course: req.params.id,
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
    });
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/lms/discussion/:id/moderate
router.put('/discussion/:id/moderate', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  const { action, reason } = req.body; // action: 'hide' | 'show'
  try {
    const post = await DiscussionPost.findByIdAndUpdate(
      req.params.id,
      {
        isHidden: action === 'hide',
        isModerated: true,
        hiddenReason: reason || null,
        moderatedBy: req.user._id,
      },
      { new: true }
    );
    res.json({ message: `Post ${action === 'hide' ? 'hidden' : 'restored'}`, post });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route GET /api/lms/my-progress — student's course progress summary
router.get('/my-progress', protect, async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(403).json({ error: { message: 'Student record not found' } });

    const [submissions, attempts] = await Promise.all([
      Submission.find({ student: student._id }).populate('assignment', 'title maxScore dueDate'),
      QuizAttempt.find({ student: student._id }).populate('quiz', 'title totalMarks'),
    ]);

    res.json({ studentId: student.studentId, submissions, quizAttempts: attempts });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route GET /api/lms/gamification-progress
router.get('/gamification-progress', protect, async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.json({ points: 0, streak: 0, badges: [] });

    let progress = await StudentProgress.findOne({ student: student._id });
    if (!progress) {
      progress = await StudentProgress.create({ student: student._id });
    }
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
