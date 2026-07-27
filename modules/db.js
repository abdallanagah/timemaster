const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/server.config');

// Default User State Generator
function getDefaultUserState() {
  return {
    version: 1,
    energy: 80,
    activeFocusTaskId: null,
    tasks: [],
    weapons: {
      deepFocus: { name: "Deep Focus", description: "Custom concentration block & break", active: false, startedAt: null, duration: 25, breakDuration: 5, sessionType: "focus", breakStartedAt: null },
      inboxZero: { name: "Inbox Zero Speedrun", description: "15-minute aggressive email/task processing", active: false, startedAt: null, duration: 15 },
      digitalDetox: { name: "Off-grid Mode", description: "120 minutes of offline system operation", active: false, startedAt: null, duration: 120 }
    },
    superpowers: {
      breathing: { name: "Tactical Breathing", description: "5-minute paced breathing for neural reset", duration: 5 },
      powerNap: { name: "Neuro-Nap", description: "20-minute rapid physical & mental recharge", duration: 20 },
      hydration: { name: "Hydration Surge", description: "2-minute physical hydration recharge", duration: 2 },
      reading: { name: "Insight Feed", description: "15-minute tactical reading or skill intake", duration: 15 }
    },
    rechargeState: { active: false, type: null, startedAt: null, duration: 0 },
    values: {
      health: { name: "Health & Vitality", score: 0 },
      mastery: { name: "Skill Mastery", score: 0 },
      creation: { name: "Creative Output", score: 0 },
      freedom: { name: "Freedom & Autonomy", score: 0 },
      family: { name: "Relationships & Family", score: 0 }
    }
  };
}

// Helper to read DB
function readDb() {
  try {
    if (!fs.existsSync(config.DB_PATH)) {
      // Prevent static seed account vulnerability in production by using environment settings or randomizing
      const defaultPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? crypto.randomBytes(24).toString('hex') : '2000');

      const salt1 = crypto.randomBytes(16).toString('hex');
      const hash1 = crypto.scryptSync(defaultPassword, salt1, 64).toString('hex');
      const salt2 = crypto.randomBytes(16).toString('hex');
      const hash2 = crypto.scryptSync(defaultPassword, salt2, 64).toString('hex');

      const initialDb = { 
        users: { 
          default: {
            password: `${salt1}:${hash1}`,
            state: getDefaultUserState()
          },
          abdalla: {
            password: `${salt2}:${hash2}`,
            state: getDefaultUserState()
          }
        } 
      };
      fs.writeFileSync(config.DB_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
    }
    const data = fs.readFileSync(config.DB_PATH, 'utf8');
    let db = JSON.parse(data);
    
    // Migrate flat root database if it exists
    if (!db.users) {
      db = {
        users: {
          default: {
            password: "2000",
            state: {
              energy: db.energy !== undefined ? db.energy : 80,
              activeFocusTaskId: db.activeFocusTaskId || null,
              tasks: db.tasks || [],
              weapons: db.weapons || getDefaultUserState().weapons,
              superpowers: db.superpowers || getDefaultUserState().superpowers,
              rechargeState: db.rechargeState || getDefaultUserState().rechargeState,
              values: db.values || getDefaultUserState().values
            }
          }
        }
      };
      fs.writeFileSync(config.DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    } else {
      // Check if default user is flat and migrate it
      if (db.users.default && !db.users.default.state) {
        db.users.default = {
          password: "2000",
          state: db.users.default
        };
        fs.writeFileSync(config.DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }
    return db;
  } catch (error) {
    console.error("Critical error reading database file:", error);
    throw error; // Propagate critical database read failures
  }
}

// Helper to write DB atomically using temporary replacement files
function writeDb(db) {
  const tempPath = config.DB_PATH + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempPath, config.DB_PATH);
    return true;
  } catch (error) {
    console.error("Error writing database atomically:", error);
    // Cleanup temporary buffer if it was created
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (_) {}
    return false;
  }
}

function getUserState(userId) {
  const db = readDb();
  const id = userId || 'default';
  if (!db.users[id]) {
    db.users[id] = {
      password: '',
      state: getDefaultUserState()
    };
    writeDb(db);
  }
  
  // Backwards compatibility migration
  if (db.users[id].state.version === undefined) {
    db.users[id].state.version = 1;
    writeDb(db);
  }
  
  return db.users[id].state;
}

function saveUserState(userId, userState) {
  const db = readDb();
  const id = userId || 'default';
  
  if (!db.users[id]) {
    db.users[id] = {
      password: '',
      state: userState
    };
    db.users[id].state.version = 1;
    const ok = writeDb(db);
    return ok ? { status: "success", version: 1 } : { status: "error" };
  }
  
  const serverState = db.users[id].state;
  const serverVersion = serverState.version || 1;
  const clientVersion = userState.version || 1;
  
  // Version mismatch: return conflict status containing server version
  if (clientVersion !== serverVersion) {
    return { status: "conflict", serverState };
  }
  
  // Increment version on successful updates
  userState.version = serverVersion + 1;
  db.users[id].state = userState;
  
  const ok = writeDb(db);
  return ok ? { status: "success", version: userState.version } : { status: "error" };
}

function validateStateSchema(state) {
  if (!state || typeof state !== 'object') return false;

  const requiredKeys = ['version', 'energy', 'activeFocusTaskId', 'tasks', 'weapons', 'superpowers', 'rechargeState', 'values'];
  const stateKeys = Object.keys(state);

  // Check that no unknown keys exist at the root
  for (const key of stateKeys) {
    if (!requiredKeys.includes(key)) return false;
  }

  // Check that all required keys are present
  for (const key of requiredKeys) {
    if (!stateKeys.includes(key)) return false;
  }

  // Type checks
  if (typeof state.version !== 'number' || state.version < 1) return false;
  if (typeof state.energy !== 'number' || state.energy < 0 || state.energy > 100) return false;
  if (state.activeFocusTaskId !== null && typeof state.activeFocusTaskId !== 'string') return false;
  if (!Array.isArray(state.tasks)) return false;
  if (state.tasks.length > 1000) return false; // Anti DoS limit

  // Validate configuration map sizes
  if (!state.weapons || typeof state.weapons !== 'object' || Object.keys(state.weapons).length > 15) return false;
  if (!state.values || typeof state.values !== 'object' || Object.keys(state.values).length > 40) return false;
  if (!state.superpowers || typeof state.superpowers !== 'object' || Object.keys(state.superpowers).length > 15) return false;

  // Validate weapons configuration map
  for (const k of Object.keys(state.weapons)) {
    const w = state.weapons[k];
    if (!w || typeof w !== 'object') return false;
    if (typeof w.name !== 'string' || w.name.length > 100) return false;
    if (typeof w.description !== 'string' || w.description.length > 300) return false;
    if (typeof w.active !== 'boolean') return false;
    if (typeof w.duration !== 'number' || w.duration < 1 || w.duration > 360) return false;
  }

  // Validate values scorecard map
  for (const k of Object.keys(state.values)) {
    const v = state.values[k];
    if (!v || typeof v !== 'object') return false;
    if (typeof v.name !== 'string' || v.name.length > 100) return false;
    if (typeof v.score !== 'number' || v.score < 0 || v.score > 1000) return false;
  }

  // Validate superpowers map
  for (const k of Object.keys(state.superpowers)) {
    const p = state.superpowers[k];
    if (!p || typeof p !== 'object') return false;
    if (typeof p.name !== 'string' || p.name.length > 100) return false;
    if (typeof p.description !== 'string' || p.description.length > 300) return false;
    if (typeof p.duration !== 'number' || p.duration < 1 || p.duration > 120) return false;
  }

  // ISO 8601 timestamp regex helper
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  // Validate tasks
  const allowedTaskKeys = [
    'id', 'text', 'quadrant', 'status', 'type', 'createdAt', 
    'completedAt', 'updatedAt', 'q1TargetTime', 'deadline', 
    'details', 'subtasks', 'timeConsumed', 'weaponCategory', 
    'valueCategory', 'superpowerCategory'
  ];

  for (const task of state.tasks) {
    if (!task || typeof task !== 'object') return false;
    
    // Ensure no unexpected properties are hidden in tasks
    for (const key of Object.keys(task)) {
      if (!allowedTaskKeys.includes(key)) return false;
    }

    if (typeof task.id !== 'string' || !task.id) return false;
    if (typeof task.text !== 'string' || task.text.length > 500) return false;
    if (!['inbox', 'q1', 'q2', 'q3', 'q4'].includes(task.quadrant)) return false;
    if (!['active', 'completed', 'archived'].includes(task.status)) return false;
    if (!['general', 'weapon', 'value', 'superpower'].includes(task.type)) return false;
    
    // Date schema compliance checks
    if (task.createdAt && (typeof task.createdAt !== 'string' || !isoRegex.test(task.createdAt))) return false;
    if (task.updatedAt && (typeof task.updatedAt !== 'string' || !isoRegex.test(task.updatedAt))) return false;
    if (task.completedAt && (typeof task.completedAt !== 'string' || !isoRegex.test(task.completedAt))) return false;
    if (task.deadline && (typeof task.deadline !== 'string' || !isoRegex.test(task.deadline))) return false;
    if (task.q1TargetTime && (typeof task.q1TargetTime !== 'string' || !isoRegex.test(task.q1TargetTime))) return false;

    // Optional details
    if (task.details !== undefined && (task.details !== null && typeof task.details !== 'string')) return false;
    if (task.timeConsumed !== undefined && (typeof task.timeConsumed !== 'number' || task.timeConsumed < 0)) return false;

    // Category linkage constraints
    if (task.type === 'weapon' && task.weaponCategory && !state.weapons[task.weaponCategory]) return false;
    if (task.type === 'value' && task.valueCategory && !state.values[task.valueCategory]) return false;
    if (task.type === 'superpower' && task.superpowerCategory && !state.superpowers[task.superpowerCategory]) return false;

    // Optional subtasks array
    if (task.subtasks !== undefined) {
      if (!Array.isArray(task.subtasks)) return false;
      if (task.subtasks.length > 100) return false;
      
      const allowedSubtaskKeys = ['id', 'text', 'completed'];
      for (const sub of task.subtasks) {
        if (!sub || typeof sub !== 'object') return false;
        
        for (const subKey of Object.keys(sub)) {
          if (!allowedSubtaskKeys.includes(subKey)) return false;
        }

        if (typeof sub.id !== 'string' || !sub.id) return false;
        if (typeof sub.text !== 'string' || sub.text.length > 200) return false;
        if (typeof sub.completed !== 'boolean') return false;
      }
    }
  }

  // Validate recharge state
  if (!state.rechargeState || typeof state.rechargeState !== 'object') return false;
  if (typeof state.rechargeState.active !== 'boolean') return false;

  return true;
}

module.exports = {
  getDefaultUserState,
  readDb,
  writeDb,
  getUserState,
  saveUserState,
  validateStateSchema
};
