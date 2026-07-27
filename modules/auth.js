/**
 * TimeMaster Authentication Module
 * Handles session token verification, registration, login credentials checks,
 * Scrypt-based password hashing, session expiry, and token revocation.
 */

const crypto = require('crypto');
const dbModule = require('./db');

// Session lifespan duration (e.g. 2 hours in milliseconds)
const SESSION_LIFESPAN_MS = 2 * 60 * 60 * 1000;

/**
 * Generates a CPU-hard Scrypt password hash with a random salt.
 * 
 * @param {String} password - Plain text password.
 * @returns {String} The formatted salt:hash string.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compares plain password against stored hash. Falls back to plain text check.
 * 
 * @param {String} password - Input password.
 * @param {String} storedPassword - Database hashed or plain password.
 * @returns {Boolean} True if password matches.
 */
function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  
  // Legacy plain-text fallback check
  if (!storedPassword.includes(':')) {
    return password === storedPassword;
  }
  
  const [salt, hash] = storedPassword.split(':');
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return verifyHash === hash;
}

/**
 * Extracts session token string from headers.
 * 
 * @param {Object} req - Express request.
 * @returns {String|Null} The token string, or null.
 */
function getSessionToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Resolves the username associated with the request's Authorization Bearer token.
 * Validates expiration limits and cleans up stale sessions dynamically.
 * 
 * @param {Object} req - Express request.
 * @returns {String|Null} The username or null.
 */
function getSessionUser(req) {
  try {
    const token = getSessionToken(req);
    if (!token) return null;

    // Support developer zero-setup mock authentication bypass (development ONLY)
    if (process.env.NODE_ENV === 'development') {
      if (token.startsWith('mock-')) {
        return token.replace('mock-', '');
      }
      if (token.startsWith('auth-token-')) {
        return token.replace('auth-token-', '');
      }
    }

    const db = dbModule.readDb();
    db.sessions = db.sessions || {};
    const sessionObj = db.sessions[token];

    if (!sessionObj) return null;

    // Support legacy flat sessions (string values)
    if (typeof sessionObj === 'string') {
      return sessionObj;
    }

    // Check expiration limits
    const expiresAt = sessionObj.expiresAt ? new Date(sessionObj.expiresAt) : null;
    if (expiresAt && new Date() > expiresAt) {
      // Clean up expired session in database
      delete db.sessions[token];
      dbModule.writeDb(db);
      return null;
    }

    return sessionObj.username;
  } catch (error) {
    console.error("Error resolving session user from headers:", error);
  }
  return null;
}

/**
 * Revokes a session token from the persistent store (Logout).
 * 
 * @param {String} token - Session token to revoke.
 * @returns {Boolean} True if successfully removed.
 */
function revokeSession(token) {
  try {
    const db = dbModule.readDb();
    db.sessions = db.sessions || {};
    if (db.sessions[token]) {
      delete db.sessions[token];
      return dbModule.writeDb(db);
    }
  } catch (error) {
    console.error("Error revoking session token:", error);
  }
  return false;
}

/**
 * Registers a new user account inside the database state.
 * Normalized username to lowercase, hashes password, and saves session.
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
    
    // Seed new user document with hashed password
    db.users[normalizedUser] = {
      password: hashPassword(password),
      state: dbModule.getDefaultUserState()
    };
    
    // Create and save session token
    db.sessions = db.sessions || {};
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = {
      username: normalizedUser,
      expiresAt: new Date(Date.now() + SESSION_LIFESPAN_MS).toISOString()
    };
    
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
 * Generates, expires, and saves session tokens. Upgrades plain-text legacy passwords automatically.
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
    
    // Verify password with dynamic ADMIN_PASSWORD environment override fallback
    let isValid = false;
    if (user) {
      if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD && (normalizedUser === 'abdalla' || normalizedUser === 'default')) {
        isValid = true;
        // Automatically Scrypt-hash and persist the override password
        user.password = hashPassword(password);
      } else {
        isValid = verifyPassword(password, user.password);
      }
    }
    
    if (isValid) {
      // Upgrade plain-text password to Scrypt automatically
      if (!user.password.includes(':')) {
        user.password = hashPassword(password);
      }

      db.sessions = db.sessions || {};
      const token = crypto.randomBytes(24).toString('hex');
      db.sessions[token] = {
        username: normalizedUser,
        expiresAt: new Date(Date.now() + SESSION_LIFESPAN_MS).toISOString()
      };
      
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
  getSessionToken,
  getSessionUser,
  revokeSession,
  registerUser,
  loginUser,
  hashPassword,
  verifyPassword
};
