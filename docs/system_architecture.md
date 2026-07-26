# TimeMaster: System Architecture & Code Design Guidelines

This document outlines the software architecture, file organization, coding standards, and modular engineering guidelines for the **TimeMaster** web application.

---

## 🛠️ Technology Stack & Frameworks

### 1. Backend Runtime & Libraries
* **Platform:** Node.js (version >= 16.x)
* **Web Framework:** Express.js (v4.19.x) - Handles static asset routing and REST endpoint mappings.
* **Security:** Native Node `crypto` module - Performs token generation and secure session mapping.
* **CORS:** `cors` middleware - Restricts or permits cross-origin requests.

### 2. Frontend Interface
* **Standard:** HTML5 (semantic layout) and Vanilla CSS3 (high-contrast glassmorphic design system).
* **Vector Icons:** Lucide Icons library - Loaded dynamically via CDN.
* **Integration Utilities:** QRCode.js library - Renders dynamic local IP synchronization QR targets.

---

## 📂 Modular File & Folder Organization

```markdown
├── Dockerfile                   # Deployment container blueprint
├── package.json                 # Execution scripts and dependencies list
├── server.js                    # Bootstrap entry point (Imports only)
├── db.json                      # Persistent database file storing credentials and states
├── docs/                        # Specifications, database blueprints, and product guides
│   ├── system_architecture.md
│   ├── database_schema.md
│   └── product_requirements.md
├── config/                      # Isolated environment properties and file paths
│   └── server.config.js
├── modules/                     # Reusable business logic layers
│   ├── db.js                  # Database read/writes and state initialization
│   ├── auth.js                # Password verification and session mappings
│   └── ip.js                  # Native IP query lookup interfaces
├── routes/                      # Route controllers mapping REST resources
│   └── api.routes.js
├── tests/                       # Automated scripts verifying code functionality
│   └── server.test.js
└── public/                      # Static client-side web assets
    ├── index.html               # Main dashboard DOM layout
    ├── style.css                # Visual themes and layout styles
    └── app.js                   # Client-side state manager and timer loops
```

---

## 📐 Modular Design & Code Style Rules

### 1. Separation of Concerns (SoC)
* **Zero Business Logic in Routes:** Files in `/routes/` must only extract input variables from requests, forward them to the correct `/modules/` service, and return matching HTTP status codes.
* **Zero HTTP Context in Modules:** Files inside `/modules/` must be pure JavaScript functions. They must never references request (`req`) or response (`res`) Express instances, facilitating clean unit testing.
* **No Database Operations in Entry Point:** The root `server.js` file must not contain raw database reads or writes; these must execute strictly inside `modules/db.js`.

### 2. File Length Threshold Constraints
* **Entry Point (`server.js`):** Maximum **50 lines** of code. It must only boot middlewares, register route paths, and trigger the port listener.
* **Controllers & Logic Modules (`/modules/`, `/routes/`):** Maximum **200 lines** per file. Large modules must be decomposed into sub-files.
* **Client Javascript Controller (`public/app.js`):** Maximum **2500 lines**. Focuses on front-end rendering, state sync, and timer ticks.

### 3. Coding Style Conventions
* **Variables & Functions:** camelCase names (e.g. `getSessionUser`, `registerUser`).
* **Constants & Configuration:** UPPER_SNAKE_CASE (e.g. `DB_PATH`, `PORT`).
* **Asynchronous Calls:** Use `async/await` syntax instead of promise chains (`.then`). Implement `try/catch` wrapper blocks on all I/O, file read/write, or network calls to prevent unhandled exceptions.
* **UI Manipulation:** Use native browser DOM manipulation APIs. Avoid heavy external frontend frameworks unless requested, keeping dependencies lightweight.
