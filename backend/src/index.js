const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;

// ── Database Connection (Cached for Serverless & Standalone) ────────────────
let cachedConnection = null;
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  const uri = process.env.MONGODB_URI || mongoUri;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add your MongoDB Atlas connection string to environment variables.');
  }
  if (!cachedConnection) {
    cachedConnection = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  await cachedConnection;
  return mongoose.connection;
};

// ── Middleware ───────────────────────────────────────────────────────────────
// Trust reverse proxies (Vercel, Render, Nginx) for accurate IP rate limiting
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving (local + temporary serverless fallback)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
try {
  const tmpUploads = path.join(os.tmpdir(), 'uploads');
  app.use('/uploads', express.static(tmpUploads));
} catch (_) {}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');

    if (isAllowed) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin '${origin}' is not allowed`));
  },
  credentials: true,
}));

// Rate limiting — max 200 req/min per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please slow down.' } },
});
app.use('/api/', limiter);

// Connect DB middleware for API routes
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await connectDB();
    } catch (err) {
      console.error('❌ Database connection error:', err.message);
      return res.status(500).json({ error: { message: 'Database connection failed: ' + err.message } });
    }
  }
  next();
});

// Basic request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Ndugu Academy API is healthy',
    environment: process.env.VERCEL ? 'vercel-serverless' : 'standalone',
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date()
  });
});

// ── Core Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/classes',         require('./routes/classes'));
app.use('/api/students',        require('./routes/students'));
app.use('/api/teachers',        require('./routes/teachers'));
app.use('/api/subjects',        require('./routes/subjects'));
app.use('/api/attendance',      require('./routes/attendance'));
app.use('/api/grades',          require('./routes/grades'));
app.use('/api/exam-results',    require('./routes/examResults'));
app.use('/api/fees',            require('./routes/fees'));

// ── Phase 1: Foundation Routes ────────────────────────────────────────────────
app.use('/api/academic-years',      require('./routes/academicYears'));
app.use('/api/registrations',       require('./routes/registrations'));
app.use('/api/requirements',        require('./routes/requirements'));
app.use('/api/student-applications', require('./routes/studentApplications'));
app.use('/api/permits',              require('./routes/permits'));

// ── Audit Log (read-only, super-admin) ───────────────────────────────────────
app.use('/api/audit-logs',          require('./routes/auditLogs'));

// ── Module Routes (new) ──────────────────────────────────────────────────────
const financeRoutes = require('./modules/finance/routes/financeRoutes');
const inventoryRoutes = require('./modules/inventory/routes/inventoryRoutes');
const operationsRoutes = require('./modules/operations/routes/operationsRoutes');
const messagingRoutes = require('./modules/messaging/routes/messagingRoutes');
const lmsRoutes = require('./modules/lms/routes/lmsRoutes');
const aiTutorRoutes = require('./modules/lms/routes/aiTutorRoutes');
const analyticsRoutes = require('./modules/analytics/routes/analyticsRoutes');
const { calculateAllRisk } = require('./modules/analytics/services/riskCalculator');
const { sendSMS } = require('./modules/messaging/services/smsService');
const healthRoutes = require('./modules/health/routes/healthRoutes');
const hostelRoutes = require('./modules/hostel/routes/hostelRoutes');
const hrRoutes = require('./modules/hr/routes/hrRoutes');
const behaviourRoutes = require('./modules/behaviour/routes/behaviourRoutes');
const admissionsRoutes = require('./modules/admissions/routes/admissionsRoutes');
const libraryRoutes = require('./modules/library/routes/libraryRoutes');

// ── MODULE ROUTING ───────────────────────────────────────────────────────────
app.use('/api/finance', financeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/lms/ai-tutor', aiTutorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/behaviour', behaviourRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/library', libraryRoutes);

// ── Daily Maintenance Runner ────────────────────────────────────────────────
const runDailyJobs = async () => {
  console.log('[CRON] Running daily maintenance jobs...');

  const Invoice = require('./modules/finance/models/Invoice');
  const CheckoutRecord = require('./modules/inventory/models/CheckoutRecord');
  const Consumable = require('./modules/inventory/models/Consumable');

  // 1. Mark overdue invoices
  const overdueResult = await Invoice.updateMany(
    { status: { $in: ['unpaid', 'partial'] }, dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  );
  console.log(`[CRON] Marked ${overdueResult.modifiedCount} invoices as overdue`);

  // 2. Mark overdue checkouts
  const overdueCheckouts = await CheckoutRecord.updateMany(
    { status: 'active', dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  );
  console.log(`[CRON] Marked ${overdueCheckouts.modifiedCount} checkouts as overdue`);

  // 3. Low-stock check — log + send SMS if AT credentials are configured
  const lowStockItems = await Consumable.find({ isActive: true, $expr: { $lte: ['$quantity', '$reorderLevel'] } });
  if (lowStockItems.length > 0) {
    console.log(`[CRON] ⚠️  ${lowStockItems.length} consumable(s) are at or below reorder level:`);
    lowStockItems.forEach(item => console.log(`  - ${item.name}: ${item.quantity} ${item.unit} (reorder at ${item.reorderLevel})`));
    if (process.env.INVENTORY_ALERT_PHONE) {
      const itemList = lowStockItems.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
      const msg = `[Ndugu Academy] Low stock alert: ${itemList}. Please reorder.`;
      try {
        await sendSMS(process.env.INVENTORY_ALERT_PHONE, msg);
        console.log('[CRON] Low-stock SMS alert sent.');
      } catch (smsErr) {
        console.error('[CRON] Failed to send low-stock SMS:', smsErr.message);
      }
    }
  }

  // 4. Recalculate student risk profiles and email critical alerts
  try {
    const riskResults = await calculateAllRisk();
    console.log(`[CRON] Risk calculation: ${riskResults.updated} updated, ${riskResults.critical} critical`);
  } catch (riskErr) {
    console.error('[CRON] Risk calculation failed:', riskErr.message);
  }

  console.log('[CRON] Daily jobs completed.');
};

// Vercel / External Cron webhook endpoint
app.all('/api/cron/daily', async (req, res) => {
  try {
    await connectDB();
    await runDailyJobs();
    res.json({ success: true, message: 'Daily maintenance jobs executed successfully' });
  } catch (err) {
    console.error('[CRON ENDPOINT] Error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── Scheduled Jobs (cron) — Persistent Server Mode Only ──────────────────────
if (process.env.VERCEL !== '1') {
  // Run daily at 6:00 AM EAT (03:00 UTC)
  cron.schedule('0 3 * * *', async () => {
    try {
      await runDailyJobs();
    } catch (err) {
      console.error('[CRON] Error in daily jobs:', err.message);
    }
  }, { timezone: 'Africa/Kampala' });
}

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: { message: err.message || 'Internal Server Error' } });
});

// ── Standalone Server Starter ────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    console.log(`✅ MongoDB connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    app.listen(PORT, () => {
      console.log(`🚀 Ndugu Academy Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

if (process.env.VERCEL !== '1' && require.main === module) {
  startServer();
}

module.exports = app;
module.exports.connectDB = connectDB;
