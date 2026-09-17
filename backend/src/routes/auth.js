const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { ROLES, ADMIN_ROLES } = require('../config/roles');
const router = express.Router();

// Generate Access Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a user (First user gets super-admin automatically, subsequent registrations require admin role)
// @access  Public (for first super-admin) / Private (for subsequent)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: { message: 'User already exists with this email' } });
    }

    // Check if any user exists in the database
    const userCount = await User.countDocuments({});
    let userRole = role || ROLES.STUDENT;

    if (userCount === 0) {
      // First user is super-admin
      userRole = ROLES.SUPER_ADMIN;
      console.log('No users found in database. Setting first registered user as super-admin.');
    } else {
      // Subsequent registrations require authentication and admin/super-admin roles
      // For simplicity in scaffolding, if they specify super-admin or admin, let's verify if auth token exists
      let authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ error: { message: 'Authentication required to register additional accounts' } });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const requestor = await User.findById(decoded.id);
        if (!requestor || !ADMIN_ROLES.includes(requestor.role)) {
          return res.status(403).json({ error: { message: 'Only administrators can register new accounts' } });
        }
        // Only an existing super-admin may grant the super-admin role.
        if (userRole === ROLES.SUPER_ADMIN && requestor.role !== ROLES.SUPER_ADMIN) {
          return res.status(403).json({ error: { message: 'Only a super-admin can create another super-admin' } });
        }
      } catch (err) {
        return res.status(401).json({ error: { message: 'Invalid token, cannot register' } });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: userRole
    });

    if (user) {
      res.status(201).json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ error: { message: 'Invalid user data' } });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Please provide email and password' } });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: { message: 'Your account has been deactivated' } });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.status(200).json(req.user);
});

// @route   GET /api/auth/users
// @desc    List all users (admin only — for dropdowns/HR)
// @access  Private (admin+)
router.get('/users', protect, async (req, res) => {
  try {
    if (!['super-admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Not authorized' } });
    }
    const users = await User.find({}, '_id name email role isActive').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   POST /api/auth/demo-login
// @desc    One-click demo login for any role (auto-provisions demo account if not found)
// @access  Public
router.post('/demo-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: { message: 'Not found' } });
  }
  const { role } = req.body;
  const demoAccounts = {
    admin: {
      email: 'admin@ndugu.ac.ug',
      password: 'admin123Demo!',
      name: 'Principal Mukasa (Admin)',
      role: 'admin'
    },
    headteacher: {
      email: 'headteacher@ndugu.ac.ug', password: 'headteacher123Demo!', name: 'Mrs. Nakato Sarah (Headteacher)', role: 'headteacher'
    },
    'director-of-studies': {
      email: 'dos@ndugu.ac.ug', password: 'dos123Demo!', name: 'Mr. Ocen David (Director of Studies)', role: 'director-of-studies'
    },
    bursar: {
      email: 'bursar@ndugu.ac.ug',
      password: 'bursar123Demo!',
      name: 'Mr. Semakula James (Finance Manager)',
      role: 'bursar'
    },
    'inventory-manager': {
      email: 'inventory@ndugu.ac.ug',
      password: 'inventory123Demo!',
      name: 'Mr. Okello Patrick (Inventory Mgr)',
      role: 'inventory-manager'
    },
    teacher: {
      email: 'teacher@ndugu.ac.ug',
      password: 'teacher123Demo!',
      name: 'Tr. Kato Ronald (Teacher)',
      role: 'teacher'
    },
    supervisor: {
      email: 'supervisor@ndugu.ac.ug',
      password: 'supervisor123Demo!',
      name: 'Dr. Sarah Namubiru (Supervisor)',
      role: 'supervisor'
    },
    parent: {
      email: 'parent@ndugu.ac.ug',
      password: 'parent123Demo!',
      name: 'Mr. David Otim (Parent)',
      role: 'parent'
    },
    student: {
      email: 'student@ndugu.ac.ug',
      password: 'student123Demo!',
      name: 'Grace Nakato (Student)',
      role: 'student'
    }
  };

  const account = demoAccounts[role] || demoAccounts.admin;

  try {
    let user = await User.findOne({ email: account.email });
    if (!user) {
      user = await User.create({
        name: account.name,
        email: account.email,
        password: account.password,
        role: account.role,
        isActive: true
      });
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id)
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (clears session / client token invalidation)
// @access  Private / Public
router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @route   GET /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.get('/refresh', async (req, res) => {
  const authHeader = req.headers.authorization;
  const refreshToken = req.headers['x-refresh-token'] || (authHeader && authHeader.startsWith('Bearer') ? authHeader.split(' ')[1] : null);

  if (!refreshToken) {
    return res.status(401).json({ error: { message: 'Refresh token required' } });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: { message: 'Invalid token or inactive user' } });
    }

    res.status(200).json({
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(401).json({ error: { message: 'Refresh token expired or invalid' } });
  }
});

// ── Admin User Management CRUD (Matches userRouter architecture) ───────────────

// @route   POST /api/auth/
// @desc    Create user (Admin only)
// @access  Private (admin/super-admin)
router.post('/', protect, async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Admin privileges required' } });
    }
    const { name, email, password, role, isActive } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: { message: 'User already exists with this email' } });
    }
    if (role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: { message: 'Only a super-admin can create another super-admin' } });
    }
    const user = await User.create({
      name,
      email,
      password: password || 'defaultPass123!',
      role: role || 'student',
      isActive: isActive !== undefined ? isActive : true
    });
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   GET /api/auth/
// @desc    Get all users with search/role filter (Admin only)
// @access  Private (admin/super-admin)
router.get('/', protect, async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Admin privileges required' } });
    }
    const { role: filterRole, search } = req.query;
    const query = {};
    if (filterRole) query.role = filterRole;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(query, '-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   GET /api/auth/:id
// @desc    Get user by ID (Admin only)
// @access  Private (admin/super-admin)
router.get('/:id', protect, async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Admin privileges required' } });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   PUT /api/auth/:id
// @desc    Update user (Admin only)
// @access  Private (admin/super-admin)
router.put('/:id', protect, async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Admin privileges required' } });
    }
    const { name, email, role, isActive, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    if (role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: { message: 'Only a super-admin can grant the super-admin role' } });
    }
    if (user.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: { message: 'Only a super-admin can modify a super-admin account' } });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;

    await user.save();
    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// @route   DELETE /api/auth/:id
// @desc    Delete / deactivate user (Admin only)
// @access  Private (admin/super-admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Admin privileges required' } });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    if (user.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: { message: 'Only a super-admin can remove a super-admin account' } });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
