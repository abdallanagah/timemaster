/**
 * TimeMaster Router Controller Module
 * Maps HTTP REST API resource requests directly to logical module services.
 * Implements strict security authorization guards and rate limiters.
 */

const express = require('express');
const router = express.Router();
const authModule = require('../modules/auth');
const dbModule = require('../modules/db');
const ipModule = require('../modules/ip');
const config = require('../config/server.config');

// Rate limiting in-memory bucket map
const rateLimitMap = {};

/**
 * Custom rate limiting middleware to prevent brute-forcing and floods.
 * 
 * @param {Number} maxRequests - Max requests allowed in the window.
 * @param {Number} windowMs - Time window in milliseconds.
 * @returns {Function} Express middleware.
 */
function authRateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const now = Date.now();
      
      if (!rateLimitMap[ip]) {
        rateLimitMap[ip] = [];
      }
      
      // Clean up records older than the window
      rateLimitMap[ip] = rateLimitMap[ip].filter(timestamp => now - timestamp < windowMs);
      
      if (rateLimitMap[ip].length >= maxRequests) {
        return res.status(429).json({ 
          status: "error", 
          message: "Too many attempts. Please try again later." 
        });
      }
      
      rateLimitMap[ip].push(now);
      next();
    } catch (err) {
      console.error("Rate limiter failure, passing through defensively:", err);
      next();
    }
  };
}

/**
 * POST /api/register
 * Enrolls a new user account partition. Rate-limited to max 10 requests / 15 minutes.
 */
router.post('/register', authRateLimiter(10, 15 * 60 * 1000), (req, res) => {
  const { username, password } = req.body || {};
  const result = authModule.registerUser(username, password);
  if (result.status === 'success') {
    res.json(result);
  } else {
    res.status(result.code || 400).json(result);
  }
});

/**
 * POST /api/login
 * Validates user credentials and issues session tokens. Rate-limited to max 20 attempts / 5 minutes.
 */
router.post('/login', authRateLimiter(20, 5 * 60 * 1000), (req, res) => {
  const { username, password } = req.body || {};
  const result = authModule.loginUser(username, password);
  if (result.status === 'success') {
    res.json(result);
  } else {
    res.status(result.code || 401).json(result);
  }
});

/**
 * POST /api/logout
 * Revokes the active session token, logging the user out.
 */
router.post('/logout', (req, res) => {
  try {
    const token = authModule.getSessionToken(req);
    if (token) {
      authModule.revokeSession(token);
    }
    res.json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during session logout:", error);
    res.status(500).json({ status: "error", message: "Error clearing session details" });
  }
});

/**
 * GET /api/state
 * Retrieves the state document of the authorized session user.
 */
router.get('/state', (req, res) => {
  const username = authModule.getSessionUser(req);
  if (!username) {
    return res.status(401).json({ status: "error", message: "Unauthorized session token" });
  }
  res.json(dbModule.getUserState(username));
});

/**
 * POST /api/state
 * Persists changes to the user's workspace dashboard state.
 */
router.post('/state', (req, res) => {
  const username = authModule.getSessionUser(req);
  if (!username) {
    return res.status(401).json({ status: "error", message: "Unauthorized session token" });
  }
  if (!dbModule.validateStateSchema(req.body)) {
    return res.status(400).json({ status: "error", message: "Invalid workspace state payload schema" });
  }
  const result = dbModule.saveUserState(username, req.body);
  if (result.status === 'success') {
    res.json({ status: "success", message: "State saved successfully", version: result.version });
  } else if (result.status === 'conflict') {
    res.status(409).json({ 
      status: "conflict", 
      message: "Workspace conflict: local version out-of-date.", 
      serverState: result.serverState 
    });
  } else {
    res.status(500).json({ status: "error", message: "Failed to write data" });
  }
});

/**
 * GET /api/ip
 * Exposes the active local server IPv4 address and port to build client sync QR targets.
 * Evaluates dynamically on every request to account for network card transitions.
 */
router.get('/ip', (req, res) => {
  try {
    const localIp = ipModule.getLocalIpAddress();
    res.json({ 
      ip: localIp, 
      port: config.PORT, 
      url: `http://${localIp}:${config.PORT}` 
    });
  } catch (error) {
    console.error("Failed to fetch IP details dynamically:", error);
    res.status(500).json({ status: "error", message: "Failed to query system network adapters" });
  }
});

module.exports = router;
