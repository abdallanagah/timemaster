# TimeMaster: System Architecture

TimeMaster is a high-contrast glassmorphic productivity dashboard designed to facilitate proactive task execution, energy tracking, and cognitive state recovery. It is architected as an offline-resilient, multi-tenant web application.

---

## 🛠️ Technology Stack

### 1. Frontend (Client-side)
* **Languages:** HTML5 (semantic structure), CSS3 (premium glassmorphic styling, animations, themes), JavaScript (ES6+ modular controllers).
* **Libraries:**
  * **Lucide Icons:** Used for modern, clean vector iconography.
  * **QRCode.js:** Dynamically generates local synchronization QR codes for mobile integrations.

### 2. Backend (Server-side)
* **Runtime:** Node.js
* **Framework:** Express.js (lightweight router and static asset server)
* **Modules:**
  * `cors`: Enables secure cross-origin resource sharing.
  * `crypto`: Standard Node library used to generate secure session tokens and password verifications.
  * `fs` / `path` / `os`: File system operations, network interface diagnostics, and cross-platform path mapping.

### 3. Database & Cache
* **Local Backend Database:** File-based JSON database (`db.json`) for simple, lightweight multi-tenant data storage.
* **Client-side Storage (Offline-First):**
  * `localStorage`: Persists user accounts and isolated state databases for offline resilience.
  * `sessionStorage`: Temporary session token store to verify active login state.

---

## 📂 File & Structural Organization

```markdown
├── Dockerfile                   # container definition for deployment
├── package.json                 # Node dependencies and boot scripts
├── server.js                    # Express app entry point
├── db.json                      # Persistent database file storing credentials and states
├── config/                      # Environment variables and system configurations
├── modules/                     # Reusable business logic (auth, db engine, ip utilities)
├── routes/                      # Route handlers mapping requests to controllers
├── tests/                       # Automated scripts to verify reliability
└── public/                      # Static client assets served to browsers
    ├── index.html               # Main dashboard DOM layout
    ├── style.css                # Glassmorphic themes and layout rules
    └── app.js                   # Client router, timer managers, and API syncer
```

---

## 🚀 Deployment & Resiliency Model

### 1. Multi-Tenant Sync Isolation
* **Online Mode:** The frontend makes HTTP requests to the local Node.js server. The server verifies session tokens and reads/writes state data from/to the isolated user sections inside `db.json`.
* **Offline/Static Mode:** If the server is unreachable (such as on free Hugging Face hosting), the client falls back to client-side LocalStorage. Accounts and task states are stored locally in the user's browser, partitioned by username.

### 2. Cache Invalidation
* Version query parameters (`?v=1.2.6`) are appended to `style.css` and `app.js` links inside `index.html` to automatically bust aggressive browser cache profiles on code re-deployments.
