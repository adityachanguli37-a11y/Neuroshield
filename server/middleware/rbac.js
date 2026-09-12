/**
 * Role-Based Access Control (RBAC) Middleware
 * Server-side authorization check.
 */

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User identity unverified.'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role '${userRole}' is not authorized for this operation. Required: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
}

module.exports = {
  authorize
};
