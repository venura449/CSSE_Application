/**
 * Single Responsibility Principle (SRP)
 * AuthMiddleware is responsible only for authentication middleware
 */
import { AuthService } from "../services/AuthService.js";

export class AuthMiddleware {
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Middleware to authenticate JWT token
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   * @param {Function} next Express next function
   */
  authenticate = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = auth.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    try {
      const payload = this.authService.verifyToken(token);
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  /**
   * Middleware to check if user has specific role
   * @param {string|string[]} allowedRoles Role or array of roles
   * @returns {Function} Express middleware function
   */
  requireRole = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: "Missing token" });
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    };
  };

  /**
   * Middleware to check if user has any of the specified roles
   * @param {string[]} allowedRoles Array of allowed roles
   * @returns {Function} Express middleware function
   */
  requireAnyRole = (allowedRoles = []) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: "Missing token" });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    };
  };
}

