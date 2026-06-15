const mongoose = require('mongoose');

// ── Course ──────────────────────────────────────────────────────────────────
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName: { type: String, trim: true },
  gradeLevel: { type: String, required: true }, // "S4", "P6", etc.
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherName: { type: String, required: true },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3', 'Holiday'], required: true },
  academicYear: { type: Number, default: () => new Date().getFullYear() },
  coverImageUrl: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isHolidayCourse: { type: Boolean, default: false },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
}, { timestamps: true });

courseSchema.index({ gradeLevel: 1, term: 1, academicYear: 1 });

// ── Content Module ───────────────────────────────────────────────────────────
const contentModuleSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  week: { type: Number, required: true, min: 1 },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['video', 'pdf', 'reading', 'audio', 'link'], required: true },
  url: { type: String, required: true, trim: true }, // Google Drive / YouTube link or upload path
  duration: { type: String, trim: true }, // "12 min" for video
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Assignment ───────────────────────────────────────────────────────────────
const assignmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  instructions: { type: String, trim: true },
  dueDate: { type: Date, required: true },
  maxScore: { type: Number, required: true, min: 1 },
  submissionType: { type: String, enum: ['file', 'text', 'both'], default: 'both' },
  attachmentUrl: { type: String, trim: true }, // Teacher's reference material
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// ── Submission ───────────────────────────────────────────────────────────────
const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentId: { type: String, required: true }, // cross-module safe
  studentName: { type: String },
  submittedAt: { type: Date, default: Date.now },
  fileUrl: { type: String, trim: true },
  textContent: { type: String, trim: true },
  isLate: { type: Boolean, default: false },
  score: { type: Number, min: 0 },
  feedback: { type: String, trim: true },
  gradedAt: { type: Date },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' },
}, { timestamps: true });

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// ── Quiz ─────────────────────────────────────────────────────────────────────
const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'true-false'], required: true },
  options: [{ type: String }], // for MCQ: 4 options
  correctAnswer: { type: String, required: true }, // "A", "True", etc.
  marks: { type: Number, default: 1 },
}, { _id: true });

const quizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  questions: [questionSchema],
  totalMarks: { type: Number, default: 0 },
  timeLimit: { type: Number, default: 30 }, // minutes; 0 = unlimited
  maxAttempts: { type: Number, default: 1 },
  isActive: { type: Boolean, default: false },
  openFrom: { type: Date },
  openUntil: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Auto-calculate total marks
quizSchema.pre('save', function (next) {
  this.totalMarks = (this.questions || []).reduce((s, q) => s + (q.marks || 1), 0);
  next();
});

// ── Quiz Attempt ─────────────────────────────────────────────────────────────
const quizAttemptSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentId: { type: String, required: true },
  studentName: { type: String },
  answers: [{ questionId: mongoose.Schema.Types.ObjectId, answer: String, isCorrect: Boolean, marks: Number }],
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  timeTaken: { type: Number }, // minutes
  attemptNumber: { type: Number, default: 1 },
}, { timestamps: true });

// ── Discussion Post ──────────────────────────────────────────────────────────
const discussionPostSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, enum: ['student', 'teacher', 'admin'] },
  parentPost: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionPost', default: null }, // null = top-level
  content: { type: String, required: true, trim: true },
  attachmentUrl: { type: String, trim: true },
  isModerated: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
  hiddenReason: { type: String, trim: true },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

discussionPostSchema.index({ course: 1, parentPost: 1 });

// ── Student Progress (Gamification) ──────────────────────────────────────────
const studentProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  points: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActive: { type: Date },
  badges: [
    {
      name: { type: String, required: true },
      earnedAt: { type: Date, default: Date.now },
      description: { type: String }
    }
  ]
}, { timestamps: true });

module.exports = {
  Course: mongoose.model('Course', courseSchema),
  ContentModule: mongoose.model('ContentModule', contentModuleSchema),
  Assignment: mongoose.model('Assignment', assignmentSchema),
  Submission: mongoose.model('Submission', submissionSchema),
  Quiz: mongoose.model('Quiz', quizSchema),
  QuizAttempt: mongoose.model('QuizAttempt', quizAttemptSchema),
  DiscussionPost: mongoose.model('DiscussionPost', discussionPostSchema),
  StudentProgress: mongoose.model('StudentProgress', studentProgressSchema),
};
