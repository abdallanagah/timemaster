/**
 * TimeMaster Authentication Module
 * Handles session token verification, registration, login credentials checks,
 * and maintains persistent sessions inside the database file.
 */

const crypto = require('crypto');
const dbModule = require('./db');

/**
 * Resolves the username associated with the request's Authorization Bearer token.
 * Supports developer mock bypass and persistent session mappings stored in db.json.
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

      // Query persistent sessions from db.json
      const db = dbModule.readDb();
      db.sessions = db.sessions || {};
      return db.sessions[token] || null;
    }
  } catch (error) {
    console.error("Error resolving session user from headers:", error);
  }
  return null;
}

/**
 * Registers a new user account inside the database state.
 * Normalized username to lowercase, seeds default tasks, and registers session.
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
    
    // Create and save session token in db
    db.sessions = db.sessions || {};
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = normalizedUser;
    
    const success = dbModule.writeDb(db);
    if (success) {
      return { status: "success", token };
    }
  } catch (error) {
    console.error(`Failed to register user ${normalizedUser}:`, error);
  }

  return { status: "error", code: 500, message: "Failed to create account" };
}

/**
 * Authenticates a user by credentials verification.
 * Generates and saves a session token inside the persistent store upon success.
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
      db.sessions = db.sessions || {};
      const token = crypto.randomBytes(24).toString('hex');
      db.sessions[token] = normalizedUser;
      
      const success = dbModule.writeDb(db);
      if (success) {
        return { status: "success", token };
      }
    }
  } catch (error) {
    console.error(`Login error for user ${normalizedUser}:`, error);
  }

  return { status: "error", code: 401, message: "Invalid username or password" };
}

module.exports = {
  getSessionUser,
  registerUser,
  loginUser
};
