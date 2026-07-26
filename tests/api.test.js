/**
 * TimeMaster HTTP Integration Test Suite
 * Validates REST API endpoints, CORS policies, rate limiting, session lifetimes,
 * validation boundaries, version conflict OCC triggers, and expired session blocks.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

// Direct DB target override
const testDbPath = path.join(__dirname, 'test-db.json');
const config = require('../config/server.config');
config.DB_PATH = testDbPath; // Override DB path config

// Set mock mode checks to production to enforce security guards in tests
process.env.NODE_ENV = 'production';

// Cleanup stale test DB
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const app = require('../server');
const dbModule = require('../modules/db');
const authModule = require('../modules/auth');

let server = null;
let port = 0;

// Promise helper to send native HTTP requests
function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log("=========================================");
  console.log("RUNNING HTTP API INTEGRATION TESTS");
  console.log("=========================================");

  // Boot server on a dynamic port
  server = app.listen(0, '127.0.0.1', async () => {
    port = server.address().port;
    console.log(`Test server booted on port ${port}`);

    try {
      // 1. Verify Seed DB creation
      dbModule.readDb();
      assert.ok(fs.existsSync(testDbPath), "Test database file should be created");

      // 2. Verify CORS Reflection & Policy
      console.log("\nTest 1: Validating CORS origin policy...");
      const corsAllowed = await request('GET', '/api/ip', { 'Origin': 'http://localhost:3000' });
      assert.strictEqual(corsAllowed.headers['access-control-allow-origin'], 'http://localhost:3000', "Localhost should reflect in CORS header");

      const corsBlocked = await request('GET', '/api/ip', { 'Origin': 'http://malicious-domain.com' });
      assert.strictEqual(corsBlocked.headers['access-control-allow-origin'], undefined, "Untrusted domain should not reflect CORS origin");

      // 3. Verify Registration and Hashed Password
      console.log("\nTest 2: Verifying password hashing on register...");
      const reg = await request('POST', '/api/register', {}, JSON.stringify({ username: 'api-tester', password: 'securePass123' }));
      assert.strictEqual(reg.statusCode, 200, "Registration should succeed");
      assert.ok(reg.body.token, "Register should return a valid token");
      
      const db = dbModule.readDb();
      const userDoc = db.users['api-tester'];
      assert.ok(userDoc, "User account should exist in DB");
      assert.ok(userDoc.password.includes(':'), "Password should be securely hashed (salt:hash format)");
      assert.notStrictEqual(userDoc.password, 'securePass123', "Password must not be stored as plain-text");

      // 4. Verify Session Expired / Revocation
      console.log("\nTest 3: Checking session logout / revocation...");
      const stateBefore = await request('GET', '/api/state', { 'Authorization': `Bearer ${reg.body.token}` });
      assert.strictEqual(stateBefore.statusCode, 200, "Should access state with active token");

      const logout = await request('POST', '/api/logout', { 'Authorization': `Bearer ${reg.body.token}` });
      assert.strictEqual(logout.statusCode, 200, "Logout request should succeed");

      const stateAfter = await request('GET', '/api/state', { 'Authorization': `Bearer ${reg.body.token}` });
      assert.strictEqual(stateAfter.statusCode, 401, "Subsequent queries with revoked token should fail with 401");

      // 5. Verify Production Dev Bypass Blocks
      console.log("\nTest 4: Checking developer token bypass blocks in production mode...");
      const devBypass = await request('GET', '/api/state', { 'Authorization': 'Bearer mock-tester' });
      assert.strictEqual(devBypass.statusCode, 401, "Mock developer tokens must be blocked in production environments");

      // 6. Verify Schema Validation Bounds
      console.log("\nTest 5: Testing state schema validation guards...");
      // Obtain fresh login session
      const login = await request('POST', '/api/login', {}, JSON.stringify({ username: 'api-tester', password: 'securePass123' }));
      const token = login.body.token;

      // Make query with malformed state payload
      const badState = await request('POST', '/api/state', { 'Authorization': `Bearer ${token}` }, JSON.stringify({
        energy: 80,
        tasks: [],
        weapons: {},
        superpowers: {},
        rechargeState: { active: false },
        values: {},
        maliciousAttributeKey: true // Unknown root parameter
      }));
      assert.strictEqual(badState.statusCode, 400, "Unknown root parameters should fail schema validation check with 400");

      // 7. Verify Successful State Write
      console.log("\nTest 6: Testing successful state write and version increment...");
      const validState = {
        version: 1,
        energy: 70,
        activeFocusTaskId: null,
        tasks: [],
        weapons: {
          deepFocus: { name: "Deep Focus", description: "Concentrate", active: false, duration: 25 }
        },
        superpowers: {},
        rechargeState: { active: false },
        values: {}
      };
      const writeRes = await request('POST', '/api/state', { 'Authorization': `Bearer ${token}` }, JSON.stringify(validState));
      assert.strictEqual(writeRes.statusCode, 200, "Valid state write should return 200");
      assert.strictEqual(writeRes.body.version, 2, "Successful state save should increment the version to 2");

      // 8. Verify Deliberate 409 Version Conflict
      console.log("\nTest 7: Testing deliberate 409 version conflict...");
      const staleState = { ...validState, version: 1, energy: 90 }; // version 1 is stale now since server is at version 2
      const conflictRes = await request('POST', '/api/state', { 'Authorization': `Bearer ${token}` }, JSON.stringify(staleState));
      assert.strictEqual(conflictRes.statusCode, 409, "Outdated state version save should return 409 Conflict");
      assert.strictEqual(conflictRes.body.serverState.version, 2, "Conflict response must include current server state version");

      // 9. Verify Session Expiration simulation
      console.log("\nTest 8: Simulating expired session token...");
      // Let's modify db.json session expiration directly in file
      const currentDb = JSON.parse(fs.readFileSync(testDbPath, 'utf8'));
      let sessionFound = false;
      if (currentDb.sessions && currentDb.sessions[token]) {
        currentDb.sessions[token].expiresAt = new Date(Date.now() - 10000).toISOString(); // Expired 10s ago
        sessionFound = true;
      }
      assert.ok(sessionFound, "Session token should be found in db.json");
      fs.writeFileSync(testDbPath, JSON.stringify(currentDb, null, 2), 'utf8');

      // Now query server with the expired token session
      const expiredRes = await request('GET', '/api/state', { 'Authorization': `Bearer ${token}` });
      assert.strictEqual(expiredRes.statusCode, 401, "Expired session tokens must return 401 Unauthorized");

      // 10. Verify Rate Limiting triggers
      console.log("\nTest 9: Validating login rate limiter block...");
      let hitRateLimit = false;
      // Trigger login attempts rapidly
      for (let i = 0; i < 25; i++) {
        const attempt = await request('POST', '/api/login', {}, JSON.stringify({ username: 'api-tester', password: 'wrongPassword' }));
        if (attempt.statusCode === 429) {
          hitRateLimit = true;
          break;
        }
      }
      assert.ok(hitRateLimit, "Login endpoint must activate 429 Too Many Requests after threshold exceeded");
      console.log("✓ Rate limiting successfully triggered!");

      console.log("\n=========================================");
      console.log("ALL HTTP INTEGRATION TESTS COMPLETED (9/9)");
      console.log("=========================================");
      cleanupAndExit(0);
    } catch (err) {
      console.error("\n❌ HTTP API TESTS FAILED:", err.message);
      cleanupAndExit(1);
    }
  });
}

function cleanupAndExit(code) {
  if (server) server.close();
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (_) {}
  }
  process.exit(code);
}

runTests();
