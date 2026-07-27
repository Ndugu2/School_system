const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Consumable = require('../models/Consumable');
const CheckoutRecord = require('../models/CheckoutRecord');
const { protect, authorize } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// ASSETS
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/inventory/assets
router.get('/assets', protect, async (req, res) => {
  try {
    const { category, condition, isCheckedOut, search } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (isCheckedOut !== undefined) query.isCheckedOut = isCheckedOut === 'true';
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { assetTag: new RegExp(search, 'i') },
      { serialNumber: new RegExp(search, 'i') },
    ];
    const assets = await Asset.find(query).populate('addedBy', 'name').sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/inventory/assets
router.post('/assets', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const asset = await Asset.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/inventory/assets/:id
router.put('/assets/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) return res.status(404).json({ error: { message: 'Asset not found' } });
    res.json(asset);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route POST /api/inventory/assets/:id/checkout
router.post('/assets/:id/checkout', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  const { borrowerId, borrowerType, borrowerName, dueDate, notes } = req.body;
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: { message: 'Asset not found' } });
    if (asset.isCheckedOut) return res.status(400).json({ error: { message: `Asset is already checked out to ${asset.assignedToName}` } });

    const checkout = await CheckoutRecord.create({
      itemType: 'asset',
      asset: asset._id,
      itemName: asset.name,
      borrowerId, borrowerType, borrowerName,
      dueDate: new Date(dueDate),
      notes,
      checkedOutBy: req.user._id,
    });

    await Asset.findByIdAndUpdate(asset._id, {
      isCheckedOut: true,
      assignedTo: borrowerId,
      assignedToType: borrowerType,
      assignedToName: borrowerName,
    });

    res.status(201).json({ message: 'Asset checked out successfully', checkout });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/inventory/assets/:id/checkin
router.post('/assets/:id/checkin', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  const { returnCondition, notes } = req.body;
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: { message: 'Asset not found' } });
    if (!asset.isCheckedOut) return res.status(400).json({ error: { message: 'Asset is not currently checked out' } });

    // Find active checkout record
    const checkout = await CheckoutRecord.findOne({ asset: asset._id, status: { $in: ['active', 'overdue'] } });
    if (checkout) {
      checkout.returnedAt = new Date();
      checkout.returnCondition = returnCondition || 'good';
      checkout.status = 'returned';
      checkout.notes = notes || checkout.notes;
      checkout.receivedBy = req.user._id;
      await checkout.save();
    }

    await Asset.findByIdAndUpdate(asset._id, {
      isCheckedOut: false,
      assignedTo: null,
      assignedToType: null,
      assignedToName: null,
      condition: returnCondition || asset.condition,
    });

    res.json({ message: 'Asset checked in successfully', checkout });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route GET /api/inventory/assets/overdue
router.get('/assets/overdue', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const overdueCheckouts = await CheckoutRecord.find({
      itemType: 'asset',
      status: { $in: ['active', 'overdue'] },
      dueDate: { $lt: new Date() },
    }).populate('asset', 'name assetTag category').sort({ dueDate: 1 });
    res.json(overdueCheckouts);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route GET /api/inventory/assets/replacement-forecast
router.get('/assets/replacement-forecast', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const assets = await Asset.find({ isActive: true, purchaseDate: { $exists: true } });
    const now = new Date();
    
    // Calculate replacement windows
    const forecast = { upcomingMonth: [], nextThreeMonths: [], nextSixMonths: [] };
    
    assets.forEach(asset => {
      if (!asset.purchaseDate || !asset.expectedLifespanMonths) return;
      const expiryDate = new Date(asset.purchaseDate);
      expiryDate.setMonth(expiryDate.getMonth() + asset.expectedLifespanMonths);
      
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30 && diffDays > -365) forecast.upcomingMonth.push({ asset, replacementDate: expiryDate });
      else if (diffDays <= 90 && diffDays > 30) forecast.nextThreeMonths.push({ asset, replacementDate: expiryDate });
      else if (diffDays <= 180 && diffDays > 90) forecast.nextSixMonths.push({ asset, replacementDate: expiryDate });
    });
    
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSUMABLES
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/inventory/consumables
router.get('/consumables', protect, async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { sku: new RegExp(search, 'i') },
    ];
    const consumables = await Consumable.find(query).sort({ name: 1 });
    res.json(consumables);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route POST /api/inventory/consumables
router.post('/consumables', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const consumable = await Consumable.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json(consumable);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// @route PUT /api/inventory/consumables/:id/restock
router.put('/consumables/:id/restock', protect, authorize('super-admin', 'admin'), async (req, res) => {
  const { quantity, unitCost, supplier } = req.body;
  try {
    const consumable = await Consumable.findById(req.params.id);
    if (!consumable) return res.status(404).json({ error: { message: 'Item not found' } });
    consumable.quantity += parseInt(quantity);
    consumable.lastRestockedAt = new Date();
    consumable.lastRestockedQuantity = parseInt(quantity);
    if (unitCost) consumable.unitCost = parseFloat(unitCost);
    if (supplier) consumable.supplier = supplier;
    await consumable.save();
    res.json({ message: 'Stock updated', consumable });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route PUT /api/inventory/consumables/:id/use
router.put('/consumables/:id/use', protect, async (req, res) => {
  const { quantity } = req.body;
  try {
    const consumable = await Consumable.findById(req.params.id);
    if (!consumable) return res.status(404).json({ error: { message: 'Item not found' } });
    if (consumable.quantity < parseInt(quantity)) {
      return res.status(400).json({ error: { message: `Insufficient stock. Available: ${consumable.quantity}` } });
    }
    consumable.quantity -= parseInt(quantity);
    await consumable.save();
    res.json({ message: 'Stock decremented', consumable, isLowStock: consumable.quantity <= consumable.reorderLevel });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route GET /api/inventory/consumables/low-stock
router.get('/consumables/low-stock', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const lowStock = await Consumable.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    }).sort({ quantity: 1 });
    res.json(lowStock);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT RECORDS
// ═══════════════════════════════════════════════════════════════════════════

// @route GET /api/inventory/checkouts
router.get('/checkouts', protect, authorize('super-admin', 'admin', 'teacher'), async (req, res) => {
  try {
    const { status, borrowerType, borrowerId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (borrowerType) query.borrowerType = borrowerType;
    if (borrowerId) query.borrowerId = borrowerId;
    const checkouts = await CheckoutRecord.find(query).populate('asset', 'name assetTag').sort({ checkedOutAt: -1 });
    res.json(checkouts);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route GET /api/inventory/summary
router.get('/summary', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const [totalAssets, checkedOutAssets, totalConsumables, lowStockItems, overdueCheckouts] = await Promise.all([
      Asset.countDocuments({ isActive: true }),
      Asset.countDocuments({ isActive: true, isCheckedOut: true }),
      Consumable.countDocuments({ isActive: true }),
      Consumable.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$reorderLevel'] } }),
      CheckoutRecord.countDocuments({ status: 'overdue' }),
    ]);

    res.json({ totalAssets, checkedOutAssets, availableAssets: totalAssets - checkedOutAssets, totalConsumables, lowStockItems, overdueCheckouts });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
