const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateObjectId } = require('../middleware/validation');

router.use(authenticate);

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
    const { role, status, name } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });

    if (role) user.role = role;
    if (status) user.status = status;
    if (name) user.name = name;

    await user.save();

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'USER_UPDATED',
        resource: 'User',
        resourceId: user._id.toString(),
        metadata: { updatedFields: { role, status, name } }
      });
    } catch (e) {}

    return res.json({ message: 'User updated successfully', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
