# TimeMaster: API Endpoints

This document maps out the backend REST APIs hosted by the Express server. All requests and responses communicate using JSON payloads.

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
  * Generates a secure session token using the Node `crypto` random bytes API.
  ```json
  {
    "status": "success",
    "token": "4a2b9c8d7e6f5a4b3c2d1e0f"
  }
  ```
* **Error Responses:**
  * **400 Bad Request:** Missing fields or username already exists.
    ```json
    {
      "status": "error",
      "message": "Username already exists"
    }
    ```
  * **500 Internal Server Error:** Disk failure.

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
* **Error Response (401 Unauthorized):**
  * Rejected session token.
  ```json
  {
    "status": "error",
    "message": "Unauthorized session token"
  }
  ```

---

### 2. Save User State
Updates the database file with the client's current workspace layout.

* **URL:** `/api/state`
* **Method:** `POST`
* **Headers:**
  * `Authorization: Bearer <sessionToken>`
* **Request Body:** The client's complete `state` JSON object.
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "State saved successfully"
  }
  ```
* **Error Response (401/500):**
  ```json
  {
    "status": "error",
    "message": "Failed to write data"
  }
  ```
