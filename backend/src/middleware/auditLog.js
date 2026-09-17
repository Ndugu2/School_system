const AuditLog = require('../models/AuditLog');

/**
 * logAudit — helper to write a single immutable audit log entry.
 *
 * Usage:
 *   await logAudit(req, {
 *     action: 'payment.reversed',
 *     module: 'payments',
 *     recordId: receipt._id,
 *     recordRef: receipt.receiptNumber,
 *     oldValue: { status: 'verified' },
 *     newValue: { status: 'reversed' },
 *     reason: 'Wrong amount entered by cashier',
 *     description: `Receipt ${receipt.receiptNumber} reversed by ${req.user.name}`
 *   });
 */
const logAudit = async (req, {
  action,
  module,
  recordId,
  recordRef = null,
  oldValue = null,
  newValue = null,
  reason = null,
  description = null
}) => {
  try {
    await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action,
      module,
      recordId,
      recordRef,
      oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
      newValue: newValue ? JSON.stringify(newValue) : undefined,
      reason,
      description,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    });
  } catch (err) {
    // Audit logging must never crash the main flow
    console.error('[AUDIT] Failed to write audit log:', err.message);
  }
};

module.exports = { logAudit };
