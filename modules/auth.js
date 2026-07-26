/**
 * TimeMaster Authentication Module
 * Handles session token verification, registration, login credentials checks,
 * and maintains active login session state maps.
 */

const crypto = require('crypto');
const dbModule = require('./db');

// In-memory mapping of active session tokens to normalized usernames
const activeSessions = {};

/**
 * Resolves the username associated with the request's Authorization Bearer token.
 * Supports legacy local accounts, mock developer accounts, and standard hex session tokens.
 * 
 * @param {Object} req - Express request object.
 * @returns {String|Null} The resolved username, or null if unauthorized.
 */
function getSessionUser(req) {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Support developer zero-setup mock authentication bypass
      if (token.startsWith('mock-')) {
        return token.replace('mock-', '');
      }

      // Maintain backward compatibility with legacy token profiles
      if (token.startsWith('auth-token-')) {
        return token.replace('auth-token-', '');
      }

      // Check active cryptographically generated sessions map
      return activeSessions[token] || null;
    }
  } catch (error) {
    console.error("Error resolving session user from headers:", error);
  }
  return null;
}

/**
 * Registers a new user account inside the database state.
 * Normalized username to lowercase, seeds default tasks and triggers, and generates a session.
 * 
 * @param {String} username - Plain username.
 * @param {String} password - Plain password.
 * @returns {Object} Result object containing status, token, or error details.
 */
function registerUser(username, password) {
  // Defensive validation of inputs
  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return { status: "error", code: 400, message: "Username and password must be valid strings" };
  }

  const normalizedUser = username.trim().toLowerCase();
  if (!normalizedUser || !password.trim()) {
    return { status: "error", code: 400, message: "Username and password cannot be blank" };
  }

  try {
    const db = dbModule.readDb();
    
    // Check duplication constraints
    if (db.users[normalizedUser]) {
      return { status: "error", code: 400, message: "Username already exists" };
    }
    
    // Seed new user document
    db.users[normalizedUser] = {
      password: password,
      state: dbModule.getDefaultUserState()
    };
    
    const success = dbModule.writeDb(db);
    if (success) {
      // Issue cryptographically secure 24-byte hex token
      const token = crypto.randomBytes(24).toString('hex');
      activeSessions[token] = normalizedUser;
      return { status: "success", token };
    }
  } catch (error) {
    console.error(`Failed to register user ${normalizedUser}:`, error);
  }

  return { status: "error", code: 500, message: "Failed to create account" };
}

/**
 * Authenticates a user by credentials verification.
 * Generates a session token upon successful validation.
 * 
 * @param {String} username - Plain username.
 * @param {String} password - Plain password.
 * @returns {Object} Result object containing status, token, or error details.
 */
function loginUser(username, password) {
  // Defensive validation of inputs
  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return { status: "error", code: 400, message: "Username and password must be valid strings" };
  }

  const normalizedUser = username.trim().toLowerCase();

  try {
    const db = dbModule.readDb();
    const user = db.users[normalizedUser];
    
    // Verify password equality
    if (user && user.password === password) {
      const token = crypto.randomBytes(24).toString('hex');
      activeSessions[token] = normalizedUser;
      return { status: "success", token };
    }
  } catch (error) {
    console.error(`Login error for user ${normalizedUser}:`, error);
  }

  return { status: "error", code: 401, message: "Invalid username or password" };
}

module.exports = {
  activeSessions,
  getSessionUser,
  registerUser,
  loginUser
};
