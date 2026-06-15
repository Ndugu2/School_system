const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
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
    let userRole = role || 'student';

    if (userCount === 0) {
      // First user is super-admin
      userRole = 'super-admin';
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
        if (!requestor || (requestor.role !== 'super-admin' && requestor.role !== 'admin')) {
          return res.status(403).json({ error: { message: 'Only administrators can register new accounts' } });
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

module.exports = router;
