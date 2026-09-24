const express = require('express');
const router = express.Router();
const StaffProfile = require('../models/StaffProfile');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../../../models/User');
const { protect, authorize } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// STAFF PROFILES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/hr/staff — all staff profiles
router.get('/staff', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const { department, contractType, isActive = 'true' } = req.query;
    const query = {};
    if (department) query.department = department;
    if (contractType) query.contractType = contractType;
    if (isActive !== 'all') query.isActive = isActive === 'true';

    const profiles = await StaffProfile.find(query)
      .populate('user', 'name email role avatar')
      .sort({ createdAt: -1 });

    const staffRoles = [
      'super-admin', 'admin', 'headteacher', 'hod', 'director-of-studies',
      'supervisor', 'deputy-head', 'bursar', 'inventory-manager',
      'registrar', 'academic-admin', 'class-teacher', 'teacher',
    ];
    const profileUserIds = new Set(profiles.map(profile => String(profile.user?._id)));
    const userQuery = {
      role: { $in: staffRoles },
      ...(isActive !== 'all' ? { isActive: isActive === 'true' } : {}),
    };
    const users = await User.find(userQuery, 'name email role avatar isActive').sort({ name: 1 });
    const roleLabels = {
      'super-admin': 'Super Admin',
      admin: 'Admin',
      headteacher: 'Head Teacher',
      'director-of-studies': 'Director of Studies',
      supervisor: 'Supervisor',
      'deputy-head': 'Deputy Head Teacher',
      bursar: 'Finance Manager',
      'inventory-manager': 'Inventory Manager',
      registrar: 'Registrar',
      'academic-admin': 'Academic Administrator',
      'class-teacher': 'Class Teacher',
      teacher: 'Teacher',
    };
    const profileResults = profiles.map(profile => ({
      _id: profile._id,
      source: 'profile',
      user: profile.user,
      name: profile.user?.name || '',
      email: profile.user?.email || '',
      role: profile.position || roleLabels[profile.user?.role] || profile.user?.role || '',
      department: profile.department || 'N/A',
      qualification: profile.qualifications?.[0]?.degree || '',
      phone: profile.phone || '',
      status: profile.isActive ? 'active' : 'inactive',
      subjects: [],
      joinDate: profile.contractStart || profile.createdAt,
    }));
    const userResults = users
      .filter(user => !profileUserIds.has(String(user._id)))
      .map(user => ({
        _id: user._id,
        source: 'user',
        user,
        name: user.name,
        email: user.email,
        role: roleLabels[user.role] || user.role,
        department: 'N/A',
        qualification: '',
        phone: '',
        status: user.isActive ? 'active' : 'inactive',
        subjects: [],
        joinDate: user.createdAt,
      }));

    res.json([...profileResults, ...userResults]);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/hr/staff/me — own profile
router.get('/staff/me', protect, async (req, res) => {
  try {
    const profile = await StaffProfile.findOne({ user: req.user._id }).populate('user', 'name email role');
    if (!profile) return res.status(404).json({ error: { message: 'No HR profile found for your account' } });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /api/hr/staff/:id
router.get('/staff/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const profile = await StaffProfile.findById(req.params.id).populate('user', 'name email role');
    if (!profile) return res.status(404).json({ error: { message: 'Staff profile not found' } });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/hr/staff — create new staff profile
router.post('/staff', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    // Auto-generate employee ID if not provided
    if (!req.body.employeeId) {
      const count = await StaffProfile.countDocuments();
      req.body.employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
    }
    const profile = await StaffProfile.create(req.body);
    res.status(201).json(profile);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: { message: 'A profile for this user already exists' } });
    }
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/hr/staff/:id
router.put('/staff/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const profile = await StaffProfile.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email role');
    if (!profile) return res.status(404).json({ error: { message: 'Staff profile not found' } });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/hr/leave — all leave requests (admin) or own (staff)
router.get('/leave', protect, async (req, res) => {
  try {
    const { status, leaveType, staffId } = req.query;
    const query = {};

    // Staff can only see their own; admins see all
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      query.staff = req.user._id;
    } else if (staffId) {
      query.staff = staffId;
    }

    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;

    const requests = await LeaveRequest.find(query)
      .populate('staff', 'name email role')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/hr/leave — submit new leave request
router.post('/leave', protect, async (req, res) => {
  try {
    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    const daysRequested = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const request = await LeaveRequest.create({
      ...req.body,
      staff: req.user._id,
      staffName: req.user.name,
      staffRole: req.user.role,
      daysRequested,
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// PUT /api/hr/leave/:id/review — approve or reject (admin only)
router.put('/leave/:id/review', protect, authorize('super-admin', 'admin'), async (req, res) => {
  const { status, reviewNotes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: { message: "Status must be 'approved' or 'rejected'" } });
  }

  try {
    const request = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewNotes,
        reviewedBy: req.user._id,
        reviewerName: req.user.name,
        reviewedAt: new Date(),
      },
      { new: true }
    ).populate('staff', 'name email');

    if (!request) return res.status(404).json({ error: { message: 'Leave request not found' } });

    // Deduct from leave balance if approved
    if (status === 'approved' && (request.leaveType === 'annual' || request.leaveType === 'sick')) {
      const balanceField = request.leaveType === 'annual' ? 'annualLeaveBalance' : 'sickLeaveBalance';
      await StaffProfile.findOneAndUpdate(
        { user: request.staff._id },
        { $inc: { [balanceField]: -request.daysRequested } }
      );
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// PUT /api/hr/leave/:id/cancel — staff cancels own pending request
router.put('/leave/:id/cancel', protect, async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({ _id: req.params.id, staff: req.user._id });
    if (!request) return res.status(404).json({ error: { message: 'Leave request not found' } });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: { message: 'Only pending requests can be cancelled' } });
    }
    request.status = 'cancelled';
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HR STATS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/stats', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const [totalStaff, activeStaff, pendingLeave, onLeaveToday, byDept, byContract] = await Promise.all([
      StaffProfile.countDocuments(),
      StaffProfile.countDocuments({ isActive: true }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      LeaveRequest.countDocuments({
        status: 'approved',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      }),
      StaffProfile.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      StaffProfile.aggregate([
        { $group: { _id: '$contractType', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ totalStaff, activeStaff, pendingLeave, onLeaveToday, byDept, byContract });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
