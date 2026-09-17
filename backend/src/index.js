const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is missing. Add your MongoDB Atlas connection string to backend/.env.');
  process.exit(1);
}

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
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

// Basic request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Database ─────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 Ndugu Academy Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Ndugu Academy API is healthy', timestamp: new Date() });
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
app.use('/api/academic-years',  require('./routes/academicYears'));
app.use('/api/registrations',   require('./routes/registrations'));
app.use('/api/requirements',    require('./routes/requirements'));

// ── Audit Log (read-only, super-admin) ───────────────────────────────────────
app.use('/api/audit-logs',      require('./routes/auditLogs'));

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

// ── Scheduled Jobs (cron) ────────────────────────────────────────────────────
// Run daily at 6:00 AM EAT (03:00 UTC)
cron.schedule('0 3 * * *', async () => {
  console.log('[CRON] Running daily maintenance jobs...');

  try {
    const Invoice = require('./modules/finance/models/Invoice');
    const CheckoutRecord = require('./modules/inventory/models/CheckoutRecord');
    const Asset = require('./modules/inventory/models/Asset');

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
    const Consumable = require('./modules/inventory/models/Consumable');
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
  } catch (err) {
    console.error('[CRON] Error in daily jobs:', err.message);
  }
}, { timezone: 'Africa/Kampala' });

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: { message: err.message || 'Internal Server Error' } });
});

startServer();
