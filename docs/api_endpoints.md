# TimeMaster: API Endpoints

This document maps out the backend REST APIs hosted by the Express server. All requests and responses communicate using JSON payloads.

---

## 🔒 Security Policies & Rules

### 1. CORS Origin Restriction Policy
Cross-Origin Resource Sharing is locked down to reject arbitrary origins. The server only returns active CORS access-control headers for requests originating from:
* `localhost` loopbacks (e.g. `http://localhost:3000`)
* Local IP networks (`http://10.*` or `http://192.168.*` subnets, enabling dynamic mobile phone synchronization)
* Trusted Space domains (`*.hf.space`)

### 2. Login/Register Rate Limiter
The login and registration POST endpoints are gated by a rate limiter.
* **Limit:** Maximum 20 authentication requests per minute per IP address.
* **Response:** Returns `429 Too Many Requests` status once the threshold is exceeded.

---

## 🔒 Authentication & Registration Endpoints

### 1. Register User Account
Creates a new isolated user state bucket in the database.

* **URL:** `/api/register`
* **Method:** `POST`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "username": "myUsername",
    "password": "mySecurePassword"
  }
  ```
* **Success Response (200 OK):**
  * Generates a secure session token.
  ```json
  {
    "status": "success",
    "token": "4a2b9c8d7e6f5a4b3c2d1e0f"
  }
  ```
* **Error Responses:**
  * **400 Bad Request:** Missing fields or username already exists.
  * **429 Too Many Requests:** Threshold rate exceeded.

---

### 2. Login User
Verifies credentials and returns a secure, random session token.

* **URL:** `/api/login`
* **Method:** `POST`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "username": "myUsername",
    "password": "mySecurePassword"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "token": "d7c8b9a0e1f2a3b4c5d6e7f8"
  }
  ```
* **Error Response (401 Unauthorized):**
  ```json
  {
    "status": "error",
    "message": "Invalid username or password"
  }
  ```

---

### 3. Logout User
Revokes and deletes the active session token from the persistence layer.

* **URL:** `/api/logout`
* **Method:** `POST`
* **Headers:**
  * `Authorization: Bearer <sessionToken>`
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Logged out successfully"
  }
  ```

---

## ⏱️ User Workspace State Sync

All state endpoints require active session validation via the HTTP standard `Authorization` Bearer token header.

### 1. Fetch User State
Retrieves the user's task configurations, value score progress, stamina energy battery, active weapon timers, and recharge states.

* **URL:** `/api/state`
* **Method:** `GET`
* **Headers:**
  * `Authorization: Bearer <sessionToken>`
* **Success Response (200 OK):**
  * Returns the user's isolated `state` object (see [database_schema.md](file:///h:/The%20Time%20Matrix/docs/database_schema.md)).

---

### 2. Save User State
Updates the database file with the client's current workspace layout, verifying concurrency version markers.

* **URL:** `/api/state`
* **Method:** `POST`
* **Headers:**
  * `Authorization: Bearer <sessionToken>`
* **Request Body:** The client's complete `state` JSON object (including `version`).
* **Success Response (200 OK):**
  * Returns the new incremented version.
  ```json
  {
    "status": "success",
    "message": "State saved successfully",
    "version": 3
  }
  ```
* **Error Response (409 Conflict):**
  * The local state version does not match the server's current version (indicating another device saved modifications).
  ```json
  {
    "status": "conflict",
    "message": "Workspace conflict: local version out-of-date.",
    "serverState": { ... }
  }
  ```
* **Error Response (400 Bad Request):**
  * The uploaded payload does not match schema requirements or validation bounds.
