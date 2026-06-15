const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: '*', credentials: true }));

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
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Ndugu Academy API is healthy', timestamp: new Date() });
});

// ── Core Routes (existing) ───────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/classes',    require('./routes/classes'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/teachers',   require('./routes/teachers'));
app.use('/api/subjects',   require('./routes/subjects'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/grades',     require('./routes/grades'));
app.use('/api/fees',       require('./routes/fees'));

// ── Module Routes (new) ──────────────────────────────────────────────────────
const financeRoutes = require('./modules/finance/routes/financeRoutes');
const inventoryRoutes = require('./modules/inventory/routes/inventoryRoutes');
const operationsRoutes = require('./modules/operations/routes/operationsRoutes');
const messagingRoutes = require('./modules/messaging/routes/messagingRoutes');
const lmsRoutes = require('./modules/lms/routes/lmsRoutes');
const aiTutorRoutes = require('./modules/lms/routes/aiTutorRoutes');
const analyticsRoutes = require('./modules/analytics/routes/analyticsRoutes');

// ── MODULE ROUTING ───────────────────────────────────────────────────────────
app.use('/api/finance', financeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/lms/ai-tutor', aiTutorRoutes);
app.use('/api/analytics', analyticsRoutes);

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

    // 3. Low-stock check (log to console — real alerts would use Africa's Talking SMS here)
    const Consumable = require('./modules/inventory/models/Consumable');
    const lowStockItems = await Consumable.find({ isActive: true, $expr: { $lte: ['$quantity', '$reorderLevel'] } });
    if (lowStockItems.length > 0) {
      console.log(`[CRON] ⚠️  ${lowStockItems.length} consumable(s) are at or below reorder level:`);
      lowStockItems.forEach(item => console.log(`  - ${item.name}: ${item.quantity} ${item.unit} (reorder at ${item.reorderLevel})`));
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

app.listen(PORT, () => {
  console.log(`🚀 Ndugu Academy Server running on port ${PORT}`);
});
