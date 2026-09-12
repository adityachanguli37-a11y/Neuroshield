# NeuroShield REST API Reference

All endpoints return standard JSON responses, with the exception of the CSV export endpoint which streams raw CSV content.

### Authentication & Session Management
Clients authenticate via either:
1. **HTTP Authorization Header**: `Authorization: Bearer <jwt_token>` (recommended for API & Electron desktop)
2. **HttpOnly Session Cookie**: Named via `SESSION_COOKIE_NAME` (default: `neuroshield_session`)

---

## 1. Authentication & RBAC

### `POST /api/auth/login`
Authenticates user credentials and establishes a session.
* **Access**: Public
* **Request Body**:
  ```json
  {
    "email": "admin@neuroshield.local",
    "password": "Password123!"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Authentication successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "60d0fe4f5311236168a109ca",
      "name": "Marcus Vance",
      "email": "admin@neuroshield.local",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
  ```

### `GET /api/auth/me`
Returns the profile of the currently authenticated user.
* **Access**: Authenticated

### `POST /api/auth/logout`
Terminates the session and clears session cookies.
* **Access**: Authenticated

### `GET /api/users`
Retrieves all enterprise user accounts with their active trust and risk scores.
* **Access**: `ADMIN`, `SECURITY_ANALYST`, `AUDITOR`

---

## 2. Layer 1: Behavioral Identity Engine

### `POST /api/behavior/telemetry`
Submits raw biometric kinematics for real-time ML anomaly evaluation.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "telemetry": {
      "typingSpeed": 68,
      "typingInterval": 115,
      "mouseVelocity": 420,
      "mouseAccel": 75,
      "clickDelay": 160,
      "scrollVelocity": 280,
      "sessionHour": 14
    }
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Behavioral telemetry processed",
    "evaluation": {
      "anomalyScore": 0.12,
      "classification": "GENUINE",
      "confidence": 0.92,
      "kmeansDistance": 0.85,
      "svmDistance": 0.92,
      "rfAnomalyScore": 0.0,
      "explanation": "Biometric vectors match user baseline profile."
    }
  }
  ```

### `POST /api/behavior/profile`
Calibrates and locks in the user's personal behavioral baseline in MongoDB Atlas.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "userId": "60d0fe4f5311236168a109ca",
    "baselineFeatures": {
      "typingSpeed": 65,
      "typingInterval": 120,
      "mouseVelocity": 450,
      "mouseAccel": 80,
      "clickDelay": 180,
      "scrollVelocity": 300,
      "sessionHour": 14
    }
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Personal biometric baseline profile calibrated successfully",
    "profile": {
      "userId": "60d0fe4f5311236168a109ca",
      "baselineFeatures": { ... },
      "modelConfidence": 0.92,
      "sampleCount": 2
    }
  }
  ```

### `GET /api/behavior/profile`
Retrieves the active user's baseline profile.
* **Access**: Authenticated

---

## 3. Layer 2: Adaptive Trust Engine

### `POST /api/trust/evaluate`
Computes the 5-factor weighted trust score and determines RBA fuzzy policy.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "behaviorScore": 88,
    "deviceScore": 90,
    "locationScore": 85,
    "networkScore": 95,
    "timeScore": 80
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "trustScore": {
      "overallTrust": 88.35,
      "trustLevel": "HIGH TRUST",
      "rbaAction": "NORMAL",
      "factors": { "behavior": 88, "device": 90, "location": 85, "network": 95, "time": 80 }
    }
  }
  ```

---

## 4. Layer 3: Human Risk Prediction Engine

### `GET /api/human-risk/current/:userId`
Returns the tri-model risk evaluation for a target user.
* **Access**: Authenticated
* **Response (200 OK)**:
  ```json
  {
    "humanRisk": {
      "userId": "60d0fe4f5311236168a109ca",
      "riskScore": 18,
      "category": "LOW",
      "evaluations": {
        "decisionTreeScore": 15,
        "logisticRegressionScore": 19,
        "bayesianScore": 20
      }
    }
  }
  ```

---

## 5. Layer 4: Predictive Threat Simulation Engine

### `POST /api/threats/predict`
Calculates Markov chain transition probabilities for current state.
* **Access**: Authenticated

### `POST /api/simulations/run`
Executes Monte Carlo stochastic random-walk simulation across threat states.
* **Access**: `ADMIN`, `SECURITY_ANALYST`
* **Request Body**:
  ```json
  {
    "iterations": 5000,
    "startState": "NORMAL"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "simulationId": "SIM-1726159200",
    "results": {
      "iterations": 5000,
      "compromiseProbability": 0.048,
      "confidenceInterval": [0.042, 0.054],
      "averageSteps": 4.2,
      "bottlenecks": ["LATERAL_MOVEMENT", "PRIVILEGE_ESCALATION"]
    }
  }
  ```

---

## 6. Layer 5: Intelligent Deception Engine

### `POST /api/deception/trigger`
Simulates or records an unauthorized interaction with a deployed decoy asset.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "assetId": "DEC-HONEYPOT-01",
    "interactionType": "UNAUTHORIZED_FILE_ACCESS"
  }
  ```

---

## 7. Defensive Endpoint Auditing (NIST SP 800-128)

### `GET /api/auditing/system`
Returns host CPU usage, RAM utilization, and system uptime.
* **Access**: Authenticated

### `GET /api/auditing/fim`
Audits the Canary Vault (`%APPDATA%\NeuroShield\CanaryVault\`) and returns file SHA-256 hashes.
* **Access**: Authenticated

### `POST /api/auditing/fim/trip`
Simulates canary tripwire file tampering to trigger real-time FIM alerts.
* **Access**: Authenticated

### `GET /api/auditing/network`
Scans local ports (22, 80, 443, 3389, 5000, 27017) and queries DNS latency.
* **Access**: Authenticated

### `GET /api/auditing/all`
Executes all three defense audit scans simultaneously.
* **Access**: Authenticated

---

## 8. Executive Reports & Export

### `GET /api/reports/summary`
Returns top-level executive KPI audit summary metrics.
* **Access**: Authenticated

### `GET /api/reports/export/csv`
Streams 200+ historical audit events in CSV format.
* **Access**: `ADMIN`, `SECURITY_ANALYST`, `AUDITOR`
* **Headers Required**: `Authorization: Bearer <token>`
* **Response**: `Content-Type: text/csv` (File download: `neuroshield-security-report.csv`)

### `GET /api/reports/export/json`
Generates a complete NIST SP 800-207 Zero-Trust Architecture JSON audit snapshot.
* **Access**: `ADMIN`, `SECURITY_ANALYST`, `AUDITOR`
* **Headers Required**: `Authorization: Bearer <token>`
* **Response**: `Content-Type: application/json` (File download: `neuroshield-zta-audit.json`)

---

## 9. System Health & Diagnostics

### `GET /api/health`
Monitors backend service health and connectivity.
* **Access**: Public
* **Response (200 OK)**:
  ```json
  {
    "status": "ONLINE",
    "services": {
      "express": "online",
      "database": "connected",
      "databaseMode": "atlas",
      "realtime": "connected",
      "systemAuditor": "active",
      "fim": "active",
      "networkAuditor": "active"
    }
  }
  ```
