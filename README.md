# NEUROSHIELD — Continuous Adaptive Defense System

**Predict. Adapt. Defend.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-34%2B-blue.svg)](https://www.electronjs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-forestgreen.svg)](https://www.mongodb.com/)
[![Zero Trust](https://img.shields.io/badge/Standard-NIST%20SP%20800--207-cyan.svg)](https://csrc.nist.gov/publications/detail/sp/800-207/final)
[![Tests](https://img.shields.io/badge/Tests-22%20Passed-brightgreen.svg)]()

NeuroShield is an enterprise-grade Windows desktop cybersecurity platform and SOC command console implementing **Five Interconnected Zero-Trust Security Layers** and **Three Defensive Endpoint Auditing Subsystems** derived from peer-reviewed AI cybersecurity research.

---

## Key Capabilities & Core Security Layers

### 1. Five Interconnected Zero-Trust Defense Layers
1. **Layer 1: Behavioral Identity Engine**:
   - Continuous biometric telemetry collection: Inter-Keystroke Interval (IKI), key hold times, mouse kinematic velocity, and acceleration vectors.
   - Multi-model evaluation: **K-Means Clustering** (Euclidean centroid distance), **One-Class SVM** with Radial Basis Function (RBF) kernel, and a **5-tree Random Forest Ensemble**.
   - Live calibration: Locks in personalized baseline biometric profiles into MongoDB Atlas via `POST /api/behavior/profile`.
   - Native OS cursor speed capture (`screen.getCursorScreenPoint`) querying global pointer velocity across all desktop displays.
   - Built-in **⚡ Auto-Type Demo Simulator** for frictionless judge demonstrations.
2. **Layer 2: Adaptive Trust Engine**:
   - Context-weighted continuous trust score ($0 - 100$):
     $$\text{Trust} = (\text{Behavior} \times 0.40) + (\text{Device} \times 0.20) + (\text{Location} \times 0.15) + (\text{Network} \times 0.15) + (\text{Time} \times 0.10)$$
   - Mamdani-style **Fuzzy Logic Inference Engine** with triangular membership functions.
   - Dynamic **Risk-Based Authentication (RBA)** policy enforcement (`NORMAL`, `CHALLENGE`, `STEP_UP_MFA`, `RESTRICT`).
   - Workstation Emergency Lockdown modal triggered via `Ctrl+Shift+L` or severe threat anomalies.
3. **Layer 3: Human Risk Prediction Engine**:
   - Tri-model ensemble quantifying human compromise susceptibility:
     - **Decision Tree Evaluator**: Multi-branch rule evaluator weighing honeypot trips, trust degradation, and abnormal session hours.
     - **Logistic Regression**: Computes log-odds of insider threat or credential compromise.
     - **Bayesian Posterior Update**: Continual prior-to-posterior likelihood adaptation based on incoming incident evidence.
4. **Layer 4: Predictive Threat Simulation Engine**:
   - **7-State Stochastic Markov Chain**: Models attacker progression (`NORMAL` $\rightarrow$ `SUSPICIOUS` $\rightarrow$ `INITIAL_COMPROMISE` $\rightarrow$ `COMPROMISED` $\rightarrow$ `LATERAL_MOVEMENT` $\rightarrow$ `PRIVILEGE_ESCALATION` $\rightarrow$ `CRITICAL_COMPROMISE`).
   - **Monte Carlo Stochastic Simulator**: Executes 100 to 100,000 random-walk iterations to calculate exact compromise probability, 95% confidence intervals, and critical bottleneck path nodes.
5. **Layer 5: Intelligent Deception Engine**:
   - Deploys active decoy assets: **Honeypot Endpoints**, **Canary Honeytokens**, and **Decoy Credentials**.
   - Zero-delay alert dispatch: Any unauthorized interaction triggers instant zero-trust containment protocols, telemetry alerts, and feedback loop score recalculations.

---

### 2. Defensive Endpoint Auditing Subsystems (NIST SP 800-128 / CIS Controls)
1. **System-Level Event Auditing** (`systemAuditorService.js`):
   - Real-time CPU core load, RAM allocation, and system uptime telemetry.
   - Resource anomaly heuristics detecting unauthorized cryptominers, fork-bombs, or CPU starvation.
2. **File Integrity Monitoring (FIM)** (`fimService.js`):
   - Dedicated Canary Vault directory created in `%APPDATA%\NeuroShield\CanaryVault\`.
   - Pre-seeded tripwire files (`secrets.env`, `backup_codes.txt`) hashed with baseline SHA-256 checksums.
   - Real-time file system watcher detecting unauthorized `modify`, `rename`, or `delete` actions with immediate WebSocket alarms (`fim:alert`).
   - Interactive **"Trip Canary Trap (Simulate Intrusion)"** button for one-click live demonstration.
3. **Network & DNS Exposure Auditing** (`networkAuditorService.js`):
   - Local port defense surface scanner auditing ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3389 (RDP), 5000 (API), and 27017 (MongoDB).
   - DNS latency and resolution validator verifying round-trip lookups across infrastructure endpoints (`cloudflare.com`, `google.com`, `localhost`).

---

### 3. Executive Security Compliance & Report Export
- **Export Security Audit (CSV)**: Authenticated export streaming 200+ historical audit events with timestamps, layer sources, and risk metrics.
- **Export Executive ZTA Audit Snapshot (JSON)**: NIST SP 800-207 Zero-Trust Architecture snapshot aggregating active threat simulations, trust health, active alerts, and model telemetry.
- **Native Windows Save Dialog**: Integrates with Electron IPC (`neuroshield:save-file`) to prompt native OS file save dialogs directly to the user's Downloads directory.
- **Publication-Grade Word Documentation**: Includes Python script [scripts/generate_docx_report.py](scripts/generate_docx_report.py) generating a formatted 14-chapter Word report (`NeuroShield_Software_Working_Report.docx`).

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Application** | Electron 34+, Electron Builder, Node.js IPC Bridge, Context Isolation |
| **Backend API** | Node.js, Express.js REST API, Helmet, CORS |
| **Database** | MongoDB Atlas via Mongoose ORM (`mongodb-memory-server` for isolated tests) |
| **Realtime Messaging** | Socket.IO WebSockets & MongoDB Change Streams |
| **Frontend UI** | Vanilla HTML5, CSS3 Glassmorphism, JavaScript ES6+ (Dark Cyber SOC Theme) |
| **Packaging & Installer** | NSIS Windows Installer (`.exe`), Unpacked Portable Binary |
| **Testing** | Jest, Supertest (22 Automated Unit & Integration Tests) |

---

## Pre-Seeded Enterprise Demo Personas

For evaluator and judge demonstrations, NeuroShield automatically seeds **8 realistic enterprise personas** into MongoDB Atlas:

| Persona | Email | Password | Role | Threat / Behavioral Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Marcus Vance** | `admin@neuroshield.local` | `Password123!` | `ADMIN` | Chief SOC Admin: Unrestricted dashboard and system settings access. |
| **Elena Rostova** | `ciso@neuroshield.local` | `Password123!` | `ADMIN` | Executive CISO: Compliance reports and executive ZTA audit access. |
| **David Chen** | `analyst@neuroshield.local` | `Password123!` | `SECURITY_ANALYST` | SOC Analyst: Alert triaging, attack graph analysis, and Monte Carlo sims. |
| **Sarah Jenkins** | `devops@neuroshield.local` | `Password123!` | `EMPLOYEE` | Lead DevOps Engineer: Privileged infrastructure and port telemetry monitoring. |
| **Robert Taylor** | `finance@neuroshield.local` | `Password123!` | `EMPLOYEE` | Chief Financial Officer: High-value payroll asset protection and decoy tripwires. |
| **Viktor Vance** | `insider@neuroshield.local` | `Password123!` | `EMPLOYEE` | **Simulated Malicious Insider**: Degraded trust ($42/100$), critical risk score ($88/100$). |
| **Rachel Adams** | `auditor@neuroshield.local` | `Password123!` | `AUDITOR` | External Compliance Auditor: Read-only access to audit logs and CSV/JSON exports. |
| **Jane Doe** | `employee@neuroshield.local` | `Password123!` | `EMPLOYEE` | Standard Employee: Clean baseline profile (60 WPM, 120ms IKI) for live calibration. |

> **⚡ Fast Demo**: On the Login screen ([client/login.html](client/login.html)), click any of the **1-Click Demo Persona buttons** to sign in instantly without typing credentials.

---

## Installation & Setup

### Prerequisites
- Windows 10 or 11 (64-bit)
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [Git](https://git-scm.com/)

### 1. Clone & Install Dependencies
```powershell
git clone <repository-url>
cd NeuroShield
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/neuroshield?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_COOKIE_NAME=neuroshield_session
PORT=5000
NODE_ENV=development
```

### 3. Run Automated Tests
Execute the comprehensive test suite covering all ML algorithms, engines, and API endpoints:
```powershell
npm test
```
*Result: 5 passed, 5 total (22 tests passed cleanly).*

### 4. Launch Desktop Application (Electron)
```powershell
npm run electron
```
*Note: NeuroShield automatically starts the local Express server on port 5000, connects to MongoDB Atlas, attaches WebSocket change streams, and verifies backend readiness before displaying the desktop window.*

### 5. Access via Web Browser (Optional)
The Express backend simultaneously serves the entire SOC dashboard over HTTP:
- Navigate to: **`http://127.0.0.1:5000/`**
- Automatically redirects to the web login interface.

---

## Building the Windows Installer (`.exe`)

To package NeuroShield into a standalone Windows NSIS installer:
```powershell
npm run dist
```

Outputs generated in `dist/`:
- **Installer**: `dist/NeuroShield Setup 1.0.0.exe` (~84 MB standalone installer)
- **Portable Unpacked Directory**: `dist/win-unpacked/NeuroShield.exe`

---

## REST API Overview

All API endpoints require JWT authentication (via `Authorization: Bearer <token>` or session cookie) unless noted otherwise:

| Endpoint | Method | Role Access | Description |
| :--- | :---: | :--- | :--- |
| `/api/health` | `GET` | Public | Backend readiness, database state, and socket health. |
| `/api/auth/login` | `POST` | Public | Authenticates credentials and returns user profile & JWT. |
| `/api/auth/me` | `GET` | Authenticated | Retrieves current authenticated session user. |
| `/api/users` | `GET` | `ADMIN`, `ANALYST`, `AUDITOR` | RBAC user directory with trust and risk metrics. |
| `/api/behavior/telemetry` | `POST` | Authenticated | Evaluates live keystroke/mouse dynamics against ML models. |
| `/api/behavior/profile` | `POST` | Authenticated | Calibrates and locks in user's personal biometric baseline. |
| `/api/behavior/profile` | `GET` | Authenticated | Retrieves active user's baseline features. |
| `/api/trust/evaluate` | `POST` | Authenticated | Computes multi-factor trust score and fuzzy logic action. |
| `/api/human-risk/current/:id` | `GET` | Authenticated | Retrieves tri-model human risk profile for user. |
| `/api/threats/predict` | `POST` | Authenticated | Evaluates 7-state Markov chain transition probability. |
| `/api/simulations/run` | `POST` | `ADMIN`, `ANALYST` | Executes Monte Carlo stochastic random-walk simulation. |
| `/api/deception/trigger` | `POST` | Authenticated | Simulates tripwire breach on a decoy honeypot asset. |
| `/api/auditing/all` | `GET` | Authenticated | Executes full System, FIM, and Network defense audit. |
| `/api/auditing/fim/trip` | `POST` | Authenticated | Simulates canary file tampering for live intrusion demo. |
| `/api/reports/summary` | `GET` | Authenticated | Aggregated executive audit KPI summary metrics. |
| `/api/reports/export/csv` | `GET` | `ADMIN`, `ANALYST`, `AUDITOR` | Streams downloadable CSV security event audit log. |
| `/api/reports/export/json` | `GET` | `ADMIN`, `ANALYST`, `AUDITOR` | Generates complete NIST SP 800-207 ZTA audit snapshot. |

---

## Research & Documentation Links

- [Research Traceability Matrix](docs/research-traceability.md): Complete mapping of academic paper algorithms to codebase files.
- [Algorithms Specification](docs/algorithms.md): Mathematical formulas, loss functions, and probability matrices.
- [REST API Reference](docs/api.md): Detailed API contract and request/response specifications.
- **Formal Word Report**: [NeuroShield_Software_Working_Report.docx](NeuroShield_Software_Working_Report.docx) (Generated 14-chapter executive document).

---

## License & Security Compliance

Developed under enterprise defensive security standards in compliance with **NIST SP 800-207** (Zero Trust Architecture) and **NIST SP 800-128** (Security-Focused Configuration Management).
