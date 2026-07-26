const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Temporarily point DB to a test location
const testDbPath = path.join(__dirname, 'test-db.json');
const config = require('../config/server.config');
config.DB_PATH = testDbPath; // Override database file location

const dbModule = require('../modules/db');
const authModule = require('../modules/auth');

// Cleanup previous test DB
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log("=========================================");
console.log("RUNNING AUTOMATED SYSTEM MODULES CHECKS");
console.log("=========================================");

try {
  // Test 1: DB Initialization & Schema Seeding
  console.log("Test 1: Seeding database schema...");
  const db = dbModule.readDb();
  assert.ok(db.users, "Database must seed a 'users' parent node");
  assert.ok(db.users.default, "Database must seed 'default' user state");
  assert.ok(authModule.verifyPassword("2000", db.users.default.password), "Default password should be verified as '2000'");
  assert.ok(db.users.default.state.tasks, "Default state should contain initialized tasks");
  console.log("✓ Test 1 Passed!");

  // Test 2: User Registration
  console.log("\nTest 2: Registering a new user account...");
  const registerResult = authModule.registerUser("tester", "securePass123");
  assert.strictEqual(registerResult.status, "success", "Registration status must be success");
  assert.ok(registerResult.token, "Registration must return a valid session token");
  console.log("✓ Test 2 Passed!");

  // Test 3: Duplicated User Validation
  console.log("\nTest 3: Checking duplicate user constraints...");
  const dupeResult = authModule.registerUser("tester", "newPassword");
  assert.strictEqual(dupeResult.status, "error", "Duplicate username should fail registration");
  assert.strictEqual(dupeResult.code, 400, "Error code should be 400");
  console.log("✓ Test 3 Passed!");

  // Test 4: Password Verification on Login
  console.log("\nTest 4: Logging in user...");
  const wrongLogin = authModule.loginUser("tester", "wrongPass");
  assert.strictEqual(wrongLogin.status, "error", "Invalid passwords should fail login check");
  assert.strictEqual(wrongLogin.code, 401, "Error code should be 401");

  const correctLogin = authModule.loginUser("tester", "securePass123");
  assert.strictEqual(correctLogin.status, "success", "Correct credentials must pass login verification");
  assert.ok(correctLogin.token, "Login success must issue a session token");
  console.log("✓ Test 4 Passed!");

  // Test 5: Secure Token Verification
  console.log("\nTest 5: Validating bearer token sessions...");
  const invalidReq = { headers: { 'authorization': 'Bearer invalid_token_xyz' } };
  const validReq = { headers: { 'authorization': `Bearer ${correctLogin.token}` } };
  
  const invalidUser = authModule.getSessionUser(invalidReq);
  assert.strictEqual(invalidUser, null, "Invalid session tokens must resolve to null user");

  const validUser = authModule.getSessionUser(validReq);
  assert.strictEqual(validUser, "tester", "Valid session token should resolve to the correct username");
  console.log("✓ Test 5 Passed!");

  // Test 6: Multi-Tenant State Isolation
  console.log("\nTest 6: Testing state isolation partitioning...");
  const testerState = dbModule.getUserState("tester");
  testerState.tasks.push({ id: "test-task", text: "Tester custom task", quadrant: "q1", status: "active" });
  dbModule.saveUserState("tester", testerState);

  const defaultUserState = dbModule.getUserState("default");
  const testerTaskInDefault = defaultUserState.tasks.find(t => t.id === "test-task");
  assert.strictEqual(testerTaskInDefault, undefined, "Modifying user A's state should not affect user B's workspace data");
  console.log("✓ Test 6 Passed!");

  console.log("\n=========================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY (6/6)");
  console.log("=========================================");

  // Cleanup test DB on success
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  process.exit(0);

} catch (error) {
  console.error("\n❌ TESTS FAILED:", error.message);
  // Cleanup test DB on failure
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  process.exit(1);
}
