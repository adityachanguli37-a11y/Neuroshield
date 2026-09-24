const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateObjectId } = require('../middleware/validation');

router.use(authenticate);

// POST /api/users - Create new user identity (ADMIN only)
router.post('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, email, and password are required.'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A user with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: ['ADMIN', 'SECURITY_ANALYST', 'AUDITOR', 'EMPLOYEE'].includes(role) ? role : 'EMPLOYEE',
      status: ['ACTIVE', 'LOCKED', 'SUSPENDED'].includes(status) ? status : 'ACTIVE'
    });

    await user.save();

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'USER_CREATED',
        resource: 'User',
        resourceId: user._id.toString(),
        metadata: { role: user.role, status: user.status }
      });
    } catch (e) {}

    return res.status(201).json({
      message: 'User identity created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users - List users
router.get('/', authorize('ADMIN', 'SECURITY_ANALYST', 'AUDITOR'), async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    return res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', authorize('ADMIN', 'SECURITY_ANALYST'), validateObjectId('id'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Update user role or status (ADMIN only)
router.put('/:id', authorize('ADMIN'), validateObjectId('id'), async (req, res, next) => {
  try {
    const { role, status, name, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });

    if (role) user.role = role;
    if (status) user.status = status;
    if (name) user.name = name;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Bad Request', message: 'Password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: password ? 'USER_PASSWORD_RESET_BY_ADMIN' : 'USER_UPDATED',
        resource: 'User',
        resourceId: user._id.toString(),
        metadata: { updatedFields: { role, status, name, passwordReset: !!password } }
      });
    } catch (e) {}

    return res.json({ message: 'User updated successfully', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
