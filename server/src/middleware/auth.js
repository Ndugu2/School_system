const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: { message: 'Not authorized, no token provided' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    if (!req.user.isActive) {
      return res.status(403).json({ error: { message: 'User account is deactivated' } });
    }
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(401).json({ error: { message: 'Not authorized, token failed or expired' } });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Not authorized' } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: { message: `User role '${req.user.role}' is not authorized to access this resource` } 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
