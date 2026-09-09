/**
 * Role-Based Access Control (RBAC) & JWT Middleware for BURSA
 * Verifies JWT tokens and enforces role-based endpoint security.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bursaros_super_secret_jwt_key_2026';

/**
 * Verify JWT Access Token Middleware
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-access-token'];

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required. Please log in.'
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Malformed authorization token header.'
      });
    }

    // Verify token cryptographic signature
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session token. Please log in again.'
    });
  }
};

/**
 * Optional JWT verification middleware - populates req.user if valid token present,
 * but allows unauthenticated access if not.
 */
export const optionalVerifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-access-token'];
    if (!authHeader) return next();

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return next();
  }
};

/**
 * Require specific user role(s) to access a route
 * @param {Array<string>} allowedRoles - Array of allowed roles e.g. ['PROPRIETOR'] or ['BURSAR', 'PROPRIETOR']
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Must have an active, verified user session
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication token required before role authorization.'
        });
      }

      // Strictly extract user role from cryptographically verified JWT payload
      const userRole = String(req.user.role).toUpperCase();
      const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

      if (normalizedAllowed.includes(userRole)) {
        req.userRole = userRole;
        return next();
      }

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access Denied: Role '${userRole}' does not have permission to access or modify this resource.`
      });
    } catch (error) {
      return res.status(500).json({ error: 'RBAC authorization failed', details: error.message });
    }
  };
};

/**
 * Enforce multi-tenant isolation: guarantees authenticated staff can only access
 * resources belonging to their own school.
 */
export const verifySchoolAccess = (req, res, next) => {
  try {
    const targetSchoolId = req.params.schoolId || req.body?.schoolId || req.query?.schoolId;
    if (!targetSchoolId) return next();

    // Authenticated session required for school-scoped endpoints
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token with school context required.'
      });
    }

    // Strict multi-tenant isolation: req.user.schoolId === req.params.schoolId
    if (req.user.schoolId !== targetSchoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You do not have permission to view or modify records for another school.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Tenant verification failed', details: error.message });
  }
};
