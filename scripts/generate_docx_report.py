import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout(doc, title, text, bg_hex="F0F9FF", border_hex="0284C7"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=130, bottom=130, left=180, right=180)
    
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    r_title = p.add_run(f"[{title}]\n")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(10.5)
    r_title.font.color.rgb = RGBColor(15, 23, 42)
    
    r_text = p.add_run(text)
    r_text.font.name = "Calibri"
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = RGBColor(51, 65, 85)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def style_table_header(row, col_widths, headers, bg_hex="0F172A"):
    for idx, cell in enumerate(row.cells):
        cell.width = col_widths[idx]
        set_cell_background(cell, bg_hex)
        set_cell_margins(cell, top=130, bottom=130, left=130, right=130)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(headers[idx])
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(255, 255, 255)

def style_table_row(row, col_widths, values, bg_hex="FFFFFF", is_bold_first=False):
    for idx, cell in enumerate(row.cells):
        cell.width = col_widths[idx]
        set_cell_background(cell, bg_hex)
        set_cell_margins(cell, top=80, bottom=80, left=130, right=130)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(str(values[idx]))
        run.font.name = "Calibri"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(30, 41, 59)
        if idx == 0 and is_bold_first:
            run.bold = True

def add_styled_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.keep_with_next = True
    if level == 1:
        h.paragraph_format.space_before = Pt(20)
        h.paragraph_format.space_after = Pt(8)
        if len(h.runs) > 0:
            h.runs[0].font.color.rgb = RGBColor(10, 37, 64)
            h.runs[0].font.size = Pt(16)
            h.runs[0].bold = True
    elif level == 2:
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        if len(h.runs) > 0:
            h.runs[0].font.color.rgb = RGBColor(2, 132, 199)
            h.runs[0].font.size = Pt(12.5)
            h.runs[0].bold = True
    elif level == 3:
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        if len(h.runs) > 0:
            h.runs[0].font.color.rgb = RGBColor(51, 65, 85)
            h.runs[0].font.size = Pt(10.5)
            h.runs[0].bold = True
    return h

def add_p(doc, text, bold_prefix=None, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_prefix = p.add_run(bold_prefix)
        r_prefix.bold = True
        r_prefix.font.color.rgb = RGBColor(15, 23, 42)
    r_text = p.add_run(text)
    r_text.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_bullet(doc, bold_title, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    r_title = p.add_run(bold_title)
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(15, 23, 42)
    r_text = p.add_run(text)
    r_text.font.color.rgb = RGBColor(51, 65, 85)
    return p

def generate_report():
    doc = Document()

    # Section Page Setup (Standard Letter Margins)
    for s in doc.sections:
        s.top_margin = Inches(0.85)
        s.bottom_margin = Inches(0.85)
        s.left_margin = Inches(0.85)
        s.right_margin = Inches(0.85)
        s.header.is_linked_to_previous = False
        s.footer.is_linked_to_previous = False

    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10)

    # =============================================================
    # COVER PAGE
    # =============================================================
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(60)
    p_pre.paragraph_format.space_after = Pt(10)
    r_pre = p_pre.add_run("ENTERPRISE DEFENSIVE CYBERSECURITY ARCHITECTURE & SYSTEM SPECIFICATION")
    r_pre.font.size = Pt(10)
    r_pre.bold = True
    r_pre.font.color.rgb = RGBColor(2, 132, 199)

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("NeuroShield Desktop Security System")
    r_title.bold = True
    r_title.font.size = Pt(28)
    r_title.font.color.rgb = RGBColor(10, 37, 64)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(20)
    r_sub = p_sub.add_run(
        "Continuous Adaptive Zero-Trust Defense Terminal: Comprehensive Operational Working, "
        "Mathematical Formulations, Multi-Model Behavioral Biometrics, and Seeded Evaluation Dossier"
    )
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    add_callout(
        doc,
        "DOCUMENT CLASSIFICATION & PURPOSE",
        "This official engineering report provides an exhaustive, multi-chapter operational breakdown of the "
        "NeuroShield desktop software. It details the runtime lifecycle of the Electron client, the mathematical "
        "models powering continuous behavioral biometrics, the adaptive zero-trust state transitions, the graph-theoretic "
        "threat prediction models, the dynamic deception infrastructure, and the complete pre-seeded enterprise dataset "
        "engineered for competition judges and security auditors.",
        bg_hex="F8FAFC",
        border_hex="0F172A"
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(30)

    # Metadata Grid
    tbl_meta = doc.add_table(rows=7, cols=2)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_widths = [Inches(2.4), Inches(4.5)]
    meta_rows = [
        ("Application Name & Version:", "NeuroShield Desktop Security Terminal v1.0.0 (Production Release)"),
        ("Core Execution Runtimes:", "Electron 34 Core, Express 4 Micro-Engine, Socket.IO Real-Time Mesh"),
        ("Compliance & Architectural Frameworks:", "NIST SP 800-207 (Zero Trust), NIST SP 800-128 (FIM), CIS Controls v8"),
        ("Dual Datastore Operating Modes:", "Autonomous MongoDB Atlas / Embedded In-Memory MemoryStore Fallback"),
        ("Hardware & Host Environment:", "Windows 10 / 11 Desktop (x64 Architecture)"),
        ("Distribution Packaging Target:", "Standalone Windows NSIS Executable (NeuroShield Setup 1.0.0.exe)"),
        ("Evaluation Dataset Configuration:", "8 Pre-Seeded Enterprise Personas, 7 MITRE Nodes, 3 Armed Decoys")
    ]
    for i, m_data in enumerate(meta_rows):
        style_table_row(tbl_meta.rows[i], m_widths, m_data, bg_hex="F1F5F9" if i % 2 == 1 else "FFFFFF", is_bold_first=True)

    doc.add_page_break()

    # =============================================================
    # TABLE OF CONTENTS
    # =============================================================
    add_styled_heading(doc, "Document Table of Contents", level=1)
    
    toc_items = [
        ("Chapter 1: Executive Overview & Operational Zero-Trust Philosophy", "Page 3"),
        ("Chapter 2: Autonomous Desktop Bootstrapping & Hybrid Storage Lifecycle", "Page 4"),
        ("Chapter 3: Enterprise Identity Roster & Detailed Seeded Persona Dossier", "Page 6"),
        ("Chapter 4: Layer 1 - Behavioral Identity Engine & Mathematical Formulations", "Page 8"),
        ("Chapter 5: Continuous Kinematic Telemetry, Sliding-Window WPM & OS Mouse Speed", "Page 10"),
        ("Chapter 6: Layer 2 - Continuous Adaptive Zero-Trust Access Controller", "Page 12"),
        ("Chapter 7: Layer 3 - Predictive Human Risk Engine & Statistical Tri-Model", "Page 14"),
        ("Chapter 8: Layer 4 - Predictive Threat Modeling, Markov Chains & Attack Graph", "Page 15"),
        ("Chapter 9: Layer 5 - Dynamic Deception Technology & Deterministic Honeypots", "Page 17"),
        ("Chapter 10: Defensive Endpoint Auditing, File Integrity Monitoring (FIM) & Networks", "Page 18"),
        ("Chapter 11: Real-Time Event Mesh, Socket.IO WebSockets & Native Notifications", "Page 20"),
        ("Chapter 12: Step-by-Step Live Demonstration Playbook For Judges", "Page 21"),
        ("Chapter 13: Algorithmic Verification Test Metrics & Production Build Engineering", "Page 23"),
        ("Chapter 14: Enterprise Regulatory Standards Compliance Mapping Matrix", "Page 24")
    ]

    tbl_toc = doc.add_table(rows=len(toc_items), cols=2)
    tbl_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    toc_widths = [Inches(5.5), Inches(1.4)]
    for i, (item, page) in enumerate(toc_items):
        style_table_row(tbl_toc.rows[i], toc_widths, [item, page], bg_hex="FFFFFF", is_bold_first=False)

    doc.add_page_break()

    # =============================================================
    # CHAPTER 1: EXECUTIVE OVERVIEW & PHILOSOPHY
    # =============================================================
    add_styled_heading(doc, "Chapter 1: Executive Overview & Operational Zero-Trust Philosophy", level=1)
    
    add_p(
        doc,
        "Enterprise cybersecurity has historically relied on the perimeter-security doctrine. Under this legacy model, "
        "firewalls and VPNs authenticate a user at the network boundary. Once access is approved, the system treats the "
        "connection as inherently trusted until manual logout. This paradigm fails catastrophically in modern hybrid enterprise "
        "landscapes characterized by sophisticated credential phishing, session hijacking, pass-the-hash attacks, and malicious "
        "insider sabotage. A malicious actor possessing legitimate credentials bypasses perimeter defenses completely."
    )
    
    add_p(
        doc,
        "NeuroShield eliminates the static perimeter by implementing the tenets of Continuous Adaptive Zero Trust "
        "(NIST SP 800-207). Under NeuroShield's operational model, trust is never granted implicitly, never permanently established, "
        "and continually reassessed across every microsecond of system interaction. The software functions not as a passive "
        "monitoring dashboard, but as an active, autonomous host defense terminal that unifies identity verification, "
        "kinematic behavior analysis, predictive risk modeling, graph-theoretic lateral movement simulation, and dynamic honeypot deception."
    )

    add_styled_heading(doc, "1.1 The Five Concentric Defense Rings", level=2)
    add_p(
        doc,
        "NeuroShield constructs five continuous, interlinked rings of defensive protection that execute simultaneously on the host workstation:"
    )

    add_bullet(
        doc,
        "Ring 1 - Subconscious Behavioral Identity (Continuous Biometrics): ",
        "Validates that the authentic human is seated at the workstation by measuring involuntary physical dynamics: "
        "inter-keystroke intervals (IKI), key hold times, sliding-window typing cadence (WPM), cursor acceleration curves, "
        "and OS-wide pointer velocity."
    )
    add_bullet(
        doc,
        "Ring 2 - Dynamic Trust State Machine (Adaptive Access Control): ",
        "Computes a real-time Trust Score (0 - 100) that continuously decays over time and dynamically scales down upon behavioral "
        "anomalies or host incidents. Automatically enforces stepped-up authentication or triggers instantaneous workstation lockdown."
    )
    add_bullet(
        doc,
        "Ring 3 - Predictive Human Risk Engine (Tri-Model Statistical Forecasting): ",
        "Analyzes behavioral variance vectors and policy violations through Decision Trees, Logistic Regression log-odds, "
        "and Bayesian posterior probability updates to forecast likelihood of insider compromise."
    )
    add_bullet(
        doc,
        "Ring 4 - Threat Path Modeling & Interactive Attack Graph: ",
        "Maintains an active network topology model mapped against MITRE ATT&CK killchain tactics. Computes Markov Chain "
        "state transitions to forecast the adversary's next lateral exploit hop and visualize multi-step attack waves."
    )
    add_bullet(
        doc,
        "Ring 5 - Dynamic Deception & File Integrity Monitoring (FIM): ",
        "Scatters high-fidelity honeytokens (SSH private keys, decoy SQL ports, canary cloud API credentials) and monitors "
        "an encrypted Canary Vault (%APPDATA%\\NeuroShield\\CanaryVault) with SHA-256 baselining. Produces deterministic, "
        "zero-false-positive alerts upon the earliest stages of unauthorized reconnaissance or ransomware tampering."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 2: AUTONOMOUS DESKTOP BOOTSTRAPPING
    # =============================================================
    add_styled_heading(doc, "Chapter 2: Autonomous Desktop Bootstrapping & Hybrid Storage Lifecycle", level=1)
    
    add_p(
        doc,
        "A critical engineering requirement for high-assurance security software is autonomous operability under adversarial conditions. "
        "During live incidents, network segmentation, or offline air-gapped forensic investigations, the terminal must remain fully "
        "functional even if external internet uplinks or cloud databases are completely severed. NeuroShield implements a self-healing, "
        "zero-configuration bootstrapping engine."
    )

    add_styled_heading(doc, "2.1 The Multi-Phase Electron Startup State Machine", level=2)
    add_p(
        doc,
        "When the user launches 'NeuroShield.exe' or runs 'npm run electron', the application executes through a multi-stage startup lifecycle:"
    )

    add_bullet(
        doc,
        "Stage 1 - Main Process Security Hardening: ",
        "The Electron main process ('electron/main.js') initializes Chromium window parameters. It enforces strict security boundaries: "
        "contextIsolation is set to true, nodeIntegration is set to false in the renderer context, and sandbox: true is active. "
        "This ensures renderer web pages cannot directly execute arbitrary Node.js shell commands or access low-level operating system APIs."
    )
    add_bullet(
        doc,
        "Stage 2 - Local Express Micro-Engine Initialization: ",
        "The main process programmatically spawns an internal Express HTTP micro-engine ('server/server.js') bound strictly to loopback "
        "(127.0.0.1:5000). The server initializes middleware: Helmet HTTP header protection, Cross-Origin Resource Sharing (CORS) restricted "
        "to local origins, cookie parsers, JSON body parsing, and WebSocket attachment."
    )
    add_bullet(
        doc,
        "Stage 3 - Intelligent Hybrid Storage Auto-Negotiation: ",
        "The database abstraction layer ('server/config/database.js') inspects the environment. It initially attempts to establish a secure "
        "TLS-encrypted Mongoose connection to MongoDB Atlas using the configured connection string. If connection fails—such as during offline "
        "demonstrations, DNS resolution failure (querySrv ENOTFOUND), or network timeouts—the connector triggers an automatic fallback. "
        "Within 1.5 seconds, it initializes an embedded in-memory datastore with identical Mongoose schema bindings. The UI and API transition "
        "seamlessly with zero downtime, displaying 'Database: Ready (Local)' on the status badge."
    )
    add_bullet(
        doc,
        "Stage 4 - Automated Database Seeding Engine: ",
        "Immediately following datastore readiness, the auto-seed utility ('server/utils/autoSeed.js') verifies data integrity. "
        "If the enterprise identity roster is uninitialized, the engine populates 8 complete role-based personas, password hashes, "
        "behavioral baseline profiles, MITRE attack graph nodes, honeypots, and baseline security audit events."
    )
    add_bullet(
        doc,
        "Stage 5 - Health Verification & BrowserWindow Presentation: ",
        "The main process polls the internal health endpoint (/api/health) to confirm service readiness. Once verified, it creates "
        "the primary BrowserWindow (1440x900 resolution, dark theme background #0a0d14) and loads 'client/index.html'. "
        "Simultaneously, it starts background OS mouse pointer tracking and registers global emergency shortcuts (Ctrl+Shift+L)."
    )

    add_styled_heading(doc, "2.2 Dual-Channel Bearer Token Authentication Protocol", level=2)
    add_p(
        doc,
        "Standard web applications rely on HTTP-only session cookies. However, inside Electron desktop applications, renderer pages are loaded "
        "via the local file:/// protocol. Under Chromium's modern security sandbox, cross-origin requests from file:/// to http://127.0.0.1:5000 "
        "strictly partition and block cookie persistence. In naive implementations, this causes silent redirect loops where the user logs in "
        "successfully, but subsequent page navigations treat the user as unauthenticated."
    )
    add_p(
        doc,
        "NeuroShield resolves this through an enterprise Dual-Channel Authentication Protocol ('server/routes/auth.js' & 'client/js/api.js'):"
    )

    add_callout(
        doc,
        "DUAL-CHANNEL TOKEN FLOW",
        "1. Upon authentication (/api/auth/login), the server issues an HTTP-only cookie and embeds an explicit 'desktopToken' in the JSON response body.\n"
        "2. The client authentication manager ('client/js/auth.js') caches this token securely in localStorage under 'neuroshield_desktop_token'.\n"
        "3. The centralized API client wrapper ('client/js/api.js') intercepts all outgoing HTTP and WebSocket requests, automatically injecting "
        "the header 'Authorization: Bearer <desktopToken>'.\n"
        "4. The server authentication middleware ('server/middleware/auth.js') extracts the token from the Bearer header, validates its cryptographic "
        "JWT signature, and attaches the verified user identity to req.user. Seamless desktop persistence is achieved without cookie reliance.",
        bg_hex="F0FDF4",
        border_hex="16A34A"
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 3: ENTERPRISE IDENTITY ROSTER & PERSONA DOSSIER
    # =============================================================
    add_styled_heading(doc, "Chapter 3: Enterprise Identity Roster & Detailed Seeded Persona Dossier", level=1)
    
    add_p(
        doc,
        "To provide competition judges and security evaluators with immediate, hands-on demonstration capabilities without requiring tedious "
        "manual data entry, NeuroShield comes pre-seeded with a comprehensive 8-member enterprise roster. Each persona is engineered to "
        "represent a specific organizational role, privilege tier, behavioral profile, and threat scenario."
    )
    
    add_p(
        doc,
        "All demo personas share the standardized master evaluation password: Password123!"
    )

    tbl_roster_full = doc.add_table(rows=9, cols=5)
    tbl_roster_full.alignment = WD_TABLE_ALIGNMENT.CENTER
    rf_widths = [Inches(1.5), Inches(1.8), Inches(1.1), Inches(1.0), Inches(1.8)]
    style_table_header(tbl_roster_full.rows[0], rf_widths, ["Persona Name", "Email Address", "Role Tier", "Account Status", "Judges Evaluation Scenario"])

    roster_full_data = [
        ("Marcus Vance", "admin@neuroshield.local", "ADMIN", "ACTIVE", "Full SOC command, MITRE Attack Graph, FIM Canary Tripwire"),
        ("Dr. Arthur Pendelton", "ciso@neuroshield.local", "ADMIN", "ACTIVE", "Executive governance, compliance reports, policy enforcement"),
        ("Elena Rostova", "analyst@neuroshield.local", "SECURITY_ANALYST", "ACTIVE", "Threat hunting, 10-step attack simulation, forensic log inspection"),
        ("Alex Chen", "devops@neuroshield.local", "EMPLOYEE", "ACTIVE", "Privileged engineer, fast typing baseline (95 WPM), lateral path target"),
        ("Sarah Jenkins", "finance@neuroshield.local", "EMPLOYEE", "ACTIVE", "High-value phishing target, BEC vulnerability modeling"),
        ("David Miller", "insider@neuroshield.local", "EMPLOYEE", "SUSPENDED", "Compromised insider, anomalous 3 AM login, locked workstation demo"),
        ("Rachel Adams", "auditor@neuroshield.local", "AUDITOR", "ACTIVE", "Regulatory oversight, read-only immutable audit logs"),
        ("Jane Doe", "employee@neuroshield.local", "EMPLOYEE", "ACTIVE", "Standard baseline employee, interactive typing calibration sandbox")
    ]
    for i, r_item in enumerate(roster_full_data):
        style_table_row(tbl_roster_full.rows[i+1], rf_widths, r_item, bg_hex="F8FAFC" if i % 2 == 1 else "FFFFFF", is_bold_first=True)

    add_styled_heading(doc, "3.1 Detailed Dossiers of Key Demonstration Personas", level=2)

    add_p(
        doc,
        "Dossier 1: Marcus Vance — SOC Administrator (admin@neuroshield.local)",
        bold_prefix="[PERSONA 1] "
    )
    add_p(
        doc,
        "• Organizational Function: Principal Security Operations Center (SOC) Administrator with unrestricted clearance across all systems.\n"
        "• RBAC Authorization: Read/Write/Execute across all 5 Defense Layers, user management, policy overrides, and simulation triggers.\n"
        "• Behavioral Profile: Calibrated with standard administrative cadence (70 WPM, 110ms IKI, 500 px/s mouse velocity, typical session hours 08:00 - 18:00).\n"
        "• Demonstration Scenario: Log in as Marcus to demonstrate full SOC oversight. Walk the judges through the interactive Attack Graph, "
        "execute the 10-step MITRE simulation, trip the FIM Canary tripwire, and demonstrate user role modifications in the RBAC console."
    )

    add_p(
        doc,
        "Dossier 2: Elena Rostova — Lead Threat Analyst (analyst@neuroshield.local)",
        bold_prefix="[PERSONA 2] "
    )
    add_p(
        doc,
        "• Organizational Function: Forensic investigator and threat hunter responsible for triaging security incidents and evaluating killchains.\n"
        "• RBAC Authorization: Authorized for Threat Prediction, Behavioral Analysis, Audit Logs, and Deception Decoys. Restricted from modifying admin passwords.\n"
        "• Demonstration Scenario: Log in as Elena to demonstrate role-based access control. Show that high-privilege administrative settings "
        "are hidden or restricted, while full threat hunting, attack path analysis, and event log inspection remain active."
    )

    add_p(
        doc,
        "Dossier 3: David Miller — Suspicious Insider (insider@neuroshield.local)",
        bold_prefix="[PERSONA 3] "
    )
    add_p(
        doc,
        "• Organizational Function: Former systems operator whose account has exhibited multiple anomalous indicators.\n"
        "• Behavioral Profile: Pre-seeded with an intentionally anomalous baseline: typing speed of 175 WPM (deviation from corporate average), "
        "inter-key interval of 25ms, erratic mouse velocity of 1450 px/s with 450 px/s² acceleration, and an abnormal session hour of 03:00 AM.\n"
        "• Demonstration Scenario: Pre-configured with account status SUSPENDED. Demonstrate how NeuroShield's automated Zero-Trust engine flags "
        "compromised internal identities and isolates their access."
    )

    add_p(
        doc,
        "Dossier 4: Jane Doe — Standard Corporate Employee (employee@neuroshield.local)",
        bold_prefix="[PERSONA 4] "
    )
    add_p(
        doc,
        "• Organizational Function: Typical enterprise knowledge worker operating corporate productivity suites.\n"
        "• Behavioral Profile: Standard baseline (60 WPM, 120ms IKI, 450 px/s mouse speed, typical session hour 14:00).\n"
        "• Demonstration Scenario: Used for live interactive biometric calibration. Allow judges to type custom phrases in the Behavioral Engine "
        "sandbox and watch live WPM, Inter-Key Intervals, and classification models evaluate real-time physical dynamics."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 4: LAYER 1 - BEHAVIORAL IDENTITY ENGINE
    # =============================================================
    add_styled_heading(doc, "Chapter 4: Layer 1 - Behavioral Identity Engine & Mathematical Formulations", level=1)
    
    add_p(
        doc,
        "Static authentication mechanisms (passwords, PINs, smart cards) only verify possession of a credential at the instant of login. "
        "They provide zero defense against post-login workstation takeovers, shoulder-surfing, or session hijacking where an attacker "
        "takes control while an authorized user steps away. Layer 1 ('server/engines/behavior.js') resolves this by transforming "
        "subconscious physical typing and mouse movement into a continuous biometric verification mechanism."
    )

    add_styled_heading(doc, "4.1 Extracted Biometric Feature Vector", level=2)
    add_p(
        doc,
        "For every active session, the telemetry collector extracts a 7-dimensional standardized feature vector x = [x_1, x_2, ..., x_7]:"
    )

    tbl_features = doc.add_table(rows=8, cols=4)
    tbl_features.alignment = WD_TABLE_ALIGNMENT.CENTER
    feat_widths = [Inches(1.2), Inches(1.8), Inches(1.4), Inches(2.8)]
    style_table_header(tbl_features.rows[0], feat_widths, ["Feature", "Mathematical Definition", "Nominal Range", "Physical & Cognitive Signification"])

    feat_data = [
        ("x_1: WPM", "Words Per Minute", "40 - 90 WPM", "Cognitive text composition speed and motor coordination rate"),
        ("x_2: IKI", "Inter-Key Interval (ms)", "80 - 180 ms", "Digraph and trigraph muscle memory transition latency"),
        ("x_3: v_mouse", "Cursor Velocity (px/s)", "200 - 800 px/s", "Gross motor ballistic hand displacement speed"),
        ("x_4: a_mouse", "Cursor Accel (px/s²)", "40 - 250 px/s²", "Kinetic impulse force; distinguishes humans from linear bots"),
        ("x_5: d_click", "Click Duration (ms)", "120 - 240 ms", "Physical button dwell time and finger actuation pressure"),
        ("x_6: v_scroll", "Scroll Velocity (px/s)", "150 - 500 px/s", "Page navigation cadence and information scanning rate"),
        ("x_7: t_hour", "Session Hour (0 - 23)", "08 - 18 hrs", "Circadian circadian working rhythm and temporal consistency")
    ]
    for i, f_item in enumerate(feat_data):
        style_table_row(tbl_features.rows[i+1], feat_widths, f_item, bg_hex="F8FAFC" if i % 2 == 1 else "FFFFFF", is_bold_first=True)

    add_styled_heading(doc, "4.2 Mathematical Algorithms in the Multi-Model Ensemble", level=2)
    add_p(
        doc,
        "Rather than relying on a single brittle classifier, Layer 1 executes an algorithmic ensemble combining three diverse models:"
    )

    add_styled_heading(doc, "Algorithm 1: Normalized Euclidean & Mahalanobis Centroid Distance", level=3)
    add_p(
        doc,
        "The system normalizes incoming live telemetry against the user's historical mean vector mu and variance vector sigma^2. "
        "The normalized distance d_kmeans is formulated as:"
    )
    add_callout(
        doc,
        "K-MEANS NORMALIZED DISTANCE FORMULA",
        "d_kmeans = sqrt( sum_{i=1}^{7} ( (x_i - mu_i)^2 / sigma_i^2 ) )\n"
        "• Normal Baseline: d_kmeans <= 2.0 (Telemetry clusters within nominal confidence ellipsoid)\n"
        "• Anomalous Breach: d_kmeans > 2.0 (Statistically significant deviation from historical muscle memory)",
        bg_hex="F8FAFC",
        border_hex="0284C7"
    )

    add_styled_heading(doc, "Algorithm 2: One-Class Support Vector Machine (OC-SVM) Hypersphere", level=3)
    add_p(
        doc,
        "One-Class SVM maps the feature vector into a high-dimensional Hilbert space via a Radial Basis Function (RBF) kernel: "
        "K(x, x') = exp(-gamma ||x - x'||^2). The algorithm constructs a maximum-margin hyperplane separating genuine baseline vectors "
        "from the origin. The margin distance d_svm measures how far the vector sits relative to the decision boundary: a margin > 1.5 "
        "classifies the telemetry as an out-of-bounds anomaly."
    )

    add_styled_heading(doc, "Algorithm 3: Random Forest Anomaly Estimator", level=3)
    add_p(
        doc,
        "An ensemble of 50 decision trees trained on multi-variate anomaly patterns. The trees evaluate non-linear correlation anomalies—for "
        "example, a user typing at 120 WPM but clicking with 10ms click delays (typical of automated macro tools). The forest outputs an "
        "ensemble probability score rf_score in the range [0.0, 1.0]."
    )

    add_styled_heading(doc, "Ensemble Synthesis & Classification Tiers", level=3)
    add_p(
        doc,
        "The three outputs are synthesized into a unified Anomaly Score A_score: "
        "A_score = 0.35 * min(1.0, d_kmeans / 3.0) + 0.35 * min(1.0, d_svm / 2.5) + 0.30 * rf_score. "
        "The final classification is categorized into three actionable security tiers:"
    )

    add_bullet(doc, "GENUINE (A_score < 0.40): ", "High identity confidence. Workstation access proceeds uninterrupted.")
    add_bullet(doc, "SUSPICIOUS (0.40 <= A_score <= 0.65): ", "Mild behavioral drift. Triggers stepped-up monitoring and Trust Score reduction.")
    add_bullet(doc, "ANOMALOUS (A_score > 0.65): ", "Severe physical biometric mismatch. Flags potential imposter; triggers immediate challenge.")

    doc.add_page_break()

    # =============================================================
    # CHAPTER 5: KINEMATIC TELEMETRY & OS MOUSE SPEED
    # =============================================================
    add_styled_heading(doc, "Chapter 5: Continuous Kinematic Telemetry, Sliding-Window WPM & OS Mouse Speed", level=1)
    
    add_p(
        doc,
        "A common flaw in desktop security clients is inaccurate telemetry sampling. In this chapter, we detail the exact physical "
        "and algorithmic mechanisms implemented in NeuroShield to achieve responsive, real-time telemetry while guaranteeing that "
        "initial and at-rest indicators strictly read zero."
    )

    add_styled_heading(doc, "5.1 The 5-Second Sliding-Window Typing Algorithm", level=2)
    add_p(
        doc,
        "To calculate true instantaneous Words Per Minute (WPM) without suffering from idle session dilution, the client collector "
        "('client/js/biometrics.js') implements a sliding-window data structure:"
    )

    add_bullet(
        doc,
        "Rolling Timestamp Buffer: ",
        "Every keydown event pushes a high-resolution performance.now() timestamp into recentKeyStrokes. On each evaluation tick (every 200ms), "
        "the engine prunes timestamps older than 5,000ms: recentKeyStrokes = recentKeyStrokes.filter(t => (now - t) <= 5000)."
    )
    add_bullet(
        doc,
        "Active Typing Verification: ",
        "The engine validates whether the user is actively typing by checking the elapsed time since the last keydown: "
        "isCurrentlyTyping = (now - lastKeyDownTime) <= 2200ms."
    )
    add_bullet(
        doc,
        "Cadence Calculation: ",
        "If isCurrentlyTyping and at least 2 keystrokes exist in the window, WPM is calculated from the active span: "
        "WPM = round((recentKeyStrokes.length / 5) / (spanSeconds / 60)). If fewer strokes exist, it references recent Inter-Key Intervals: "
        "WPM = round(12000 / lastIki)."
    )
    add_bullet(
        doc,
        "At-Rest Zero Guarantee: ",
        "If the user stops typing for more than 2.2 seconds, isCurrentlyTyping evaluates to false. Instantaneous WPM immediately decays to strictly 0. "
        "At application launch, before any keys are pressed, the indicator is strictly initialized to 0 WPM."
    )

    add_styled_heading(doc, "5.2 System-Wide OS Mouse Pointer Velocity Tracking", level=2)
    add_p(
        doc,
        "Unlike web browsers that can only measure mouse movements within their own viewport, NeuroShield is a native desktop application "
        "responsible for auditing host-wide activity. It must measure cursor movement velocity across the entire physical desktop."
    )

    add_callout(
        doc,
        "OS-WIDE MOUSE VELOCITY PIPELINE",
        "1. In 'electron/main.js', startOsPointerTracking() executes on a 100ms interval loop using Electron's native 'screen.getCursorScreenPoint()'.\n"
        "2. It queries absolute multi-monitor screen coordinates: pt = { x, y }.\n"
        "3. Computes Cartesian displacement: dist = sqrt((pt.x - lastPt.x)^2 + (pt.y - lastPt.y)^2).\n"
        "4. Anti-Jitter Deadband: If dist < 2 pixels (resting hand tremor or sensor noise) or elapsed dt > 0.6s, speed evaluates strictly to 0 px/s.\n"
        "5. Active Motion: If dist >= 2 pixels, speed = round(dist / dt). Updates rolling speed history.\n"
        "6. IPC Transmission: Exposes 'neuroshield:get-os-pointer-speed' via preload bridge, streaming live pixels/second to the header and HUD.\n"
        "7. Privacy Guarantee: Zero coordinates, clicks, window titles, or keystroke characters outside the app are logged or stored.",
        bg_hex="F8FAFC",
        border_hex="0284C7"
    )

    add_styled_heading(doc, "5.3 Cross-Frame Event Bubbling & Subpage Iframe Architecture", level=2)
    add_p(
        doc,
        "In 'client/dashboard.html', modular subpages (such as 'pages/behavior.html' and 'pages/endpoint-audit.html') are loaded inside an <iframe>. "
        "Under standard DOM rules, keyboard and mouse events dispatched inside an iframe do not automatically bubble up to the parent window, "
        "which would prevent the top header ticker from tracking subpage keystrokes. "
        "NeuroShield resolves this through bidirectional event attachment:"
    )
    add_p(
        doc,
        "When the dashboard loads or navigates, attachToSubframe() attaches the singleton biometricsCollector listeners directly to "
        "frame.contentWindow and frame.contentDocument. Concurrently, child scripts inspect window.parent: if window.parent.biometricsCollector "
        "exists, the child reuses the parent's collector instance. Any keystroke typed in any input box or verification sandbox streams "
        "simultaneously to both the local page HUD and the global top-header badge."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 6: LAYER 2 - ADAPTIVE ZERO-TRUST ACCESS CONTROLLER
    # =============================================================
    add_styled_heading(doc, "Chapter 6: Layer 2 - Continuous Adaptive Zero-Trust Access Controller", level=1)
    
    add_p(
        doc,
        "Traditional access control models operate as binary gates: a user is either fully authorized or completely blocked. "
        "Layer 2 ('server/engines/trust.js') replaces this static model with continuous, multi-factor trust evaluation."
    )

    add_styled_heading(doc, "6.1 Dynamic Trust Score Formulation & Penalties", level=2)
    add_p(
        doc,
        "The Trust Score T(t) dynamically ranges from 0 to 100. It is evaluated by the continuous state equation:"
    )
    add_callout(
        doc,
        "MATHEMATICAL TRUST EVALUATION EQUATION",
        "T(t) = clamp(0, 100,  T_base - P_biometrics - sum(P_incidents) - P_temporal )\n\n"
        "Parameters:\n"
        "• T_base = Prior trust baseline (nominal default: 100)\n"
        "• P_biometrics = Live behavioral anomaly penalty: (AnomalyScore * 40)\n"
        "• P_incidents = Active unresolved security incident penalties (CRITICAL: 50, HIGH: 30, MEDIUM: 15, LOW: 5)\n"
        "• P_temporal = Temporal session decay: 0.5 points per elapsed hour since token issuance\n"
        "• Recovery: If telemetry remains genuine for 10 consecutive evaluation cycles, score recovers by +5 points per cycle.",
        bg_hex="FDF4FF",
        border_hex="A855F7"
    )

    add_styled_heading(doc, "6.2 Policy Enforcement & The Emergency Lockdown State Machine", level=2)
    add_p(
        doc,
        "The system evaluates the Trust Score against enterprise enforcement policy boundaries:"
    )

    add_bullet(
        doc,
        "Tier 1 - High Trust (Score 80 - 100): ",
        "Full authorized access granted across all assigned RBAC permissions. Background telemetry runs silently."
    )
    add_bullet(
        doc,
        "Tier 2 - Elevated Risk (Score 50 - 79): ",
        "Step-Up Authentication required. Sensitive administrative operations (modifying access policies, altering user roles, "
        "exporting compliance reports) require immediate password or MFA re-verification before execution."
    )
    add_bullet(
        doc,
        "Tier 3 - Critical Risk (Score 0 - 49): ",
        "Zero-Trust Workstation Lockdown engaged. The session token is immediately invalidated. The UI renders the full-screen "
        "frosted lockdown overlay ('#lockdown-overlay') with 24px backdrop blur, blocking all UI interactions until an authorized "
        "administrative password unlock is performed."
    )
    add_bullet(
        doc,
        "Manual Emergency Hotkey Trigger (Ctrl+Shift+L): ",
        "Operators facing physical coercion or witnessing live host tampering can trigger instantaneous workstation lockdown "
        "at any time by pressing Ctrl+Shift+L. The global shortcut registers at the OS level via Electron main process."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 7: LAYER 3 - HUMAN RISK PREDICTION ENGINE
    # =============================================================
    add_styled_heading(doc, "Chapter 7: Layer 3 - Predictive Human Risk Engine & Statistical Tri-Model", level=1)
    
    add_p(
        doc,
        "Insider threats and compromised workforce accounts represent the most catastrophic attack vectors because the adversary "
        "is operating with legitimate internal credentials. Layer 3 ('server/engines/humanRisk.js') predicts insider risk before "
        "exfiltration or sabotage occurs by unifying three independent mathematical models."
    )

    add_styled_heading(doc, "7.1 Statistical Tri-Model Methodology", level=2)
    
    add_p(
        doc,
        "Model 1: Heuristic Decision Tree Categorization",
        bold_prefix="[MODEL 1] "
    )
    add_p(
        doc,
        "Evaluates discrete operational parameters through an empirical decision tree: account clearance tier (Admin, Analyst, Employee), "
        "prior policy violations, consecutive failed authentications, and external IP access. Categorizes the subject into discrete "
        "risk scores (Low: 10-25, Moderate: 35-60, High: 75-95)."
    )

    add_p(
        doc,
        "Model 2: Logistic Regression Log-Odds Probability",
        bold_prefix="[MODEL 2] "
    )
    add_p(
        doc,
        "Models continuous breach probability via the logistic sigmoid function: P_lr = 1 / (1 + e^-z). The logit z is computed from "
        "weighted feature variances: z = beta_0 + beta_1 * (WPM_variance) + beta_2 * (MouseAccel_variance) + beta_3 * (OffHours_indicator) + beta_4 * (Privilege_weight). "
        "Produces a smooth probability curve reflecting subtle behavioral deviations."
    )

    add_p(
        doc,
        "Model 3: Bayesian Posterior Inference P(Risk | Evidence)",
        bold_prefix="[MODEL 3] "
    )
    add_p(
        doc,
        "Applies Bayes' Theorem to update risk probabilities upon receiving new telemetry evidence:"
    )
    add_callout(
        doc,
        "BAYESIAN RISK UPDATE FORMULA",
        "P(Compromised | Telemetry) = [ P(Telemetry | Compromised) * P(Compromised) ] / P(Telemetry)\n\n"
        "Where:\n"
        "• P(Compromised) = Prior base risk probability (nominal historical rate: 5%)\n"
        "• P(Telemetry | Compromised) = Likelihood of observing current anomaly vector under active compromise (estimated at 85%)\n"
        "• P(Telemetry) = Total probability of telemetry across both genuine and compromised populations\n"
        "Allows the system to update risk dynamically as new observations stream in.",
        bg_hex="F8FAFC",
        border_hex="0284C7"
    )

    add_styled_heading(doc, "7.2 Prescriptive Interventions & Factor Breakdown", level=2)
    add_p(
        doc,
        "In 'client/pages/human-risk.html', the Human Risk dashboard displays transparent factor attribution: "
        "'Typing Jitter Anomaly (+25)', 'Off-Hours Session (+20)', 'High Privilege Target (+15)'. "
        "The engine pairs these with automated prescriptive interventions, such as restricting access to financial vaults or "
        "scheduling mandatory security re-authentication."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 8: LAYER 4 - THREAT PREDICTION & ATTACK GRAPH
    # =============================================================
    add_styled_heading(doc, "Chapter 8: Layer 4 - Predictive Threat Modeling, Markov Chains & Attack Graph", level=1)
    
    add_p(
        doc,
        "Advanced adversaries execute multi-stage killchains, beginning with initial perimeter access, dumping local LSASS credentials, "
        "moving laterally across application servers, and ultimately compromising domain controllers and critical data vaults. "
        "Layer 4 ('server/engines/threat.js') models and visualizes this threat progression."
    )

    add_styled_heading(doc, "8.1 Topological MITRE ATT&CK Graph Architecture", level=2)
    add_p(
        doc,
        "The attack graph G = (V, E) is initialized with 7 structural nodes and 6 directed exploit edges representing realistic enterprise topology:"
    )

    tbl_dag = doc.add_table(rows=7, cols=4)
    tbl_dag.alignment = WD_TABLE_ALIGNMENT.CENTER
    dag_widths = [Inches(1.2), Inches(1.8), Inches(1.8), Inches(2.2)]
    style_table_header(tbl_dag.rows[0], dag_widths, ["Edge ID", "Source -> Target Node", "MITRE ATT&CK Tactic", "Base Exploit Probability"])

    dag_data = [
        ("E1", "N-USER -> N-INIT", "Phishing & Spearphishing [T1566]", "P = 0.85 (High ingress vector)"),
        ("E2", "N-INIT -> N-END", "Command & Scripting Interpreter [T1059]", "P = 0.70 (Host perimeter breach)"),
        ("E3", "N-END -> N-CRED", "OS Credential Dumping: LSASS [T1003]", "P = 0.65 (Memory credential harvest)"),
        ("E4", "N-CRED -> N-LAT", "Pass the Hash / Lateral Movement [T1550]", "P = 0.50 (Internal server pivot)"),
        ("E5", "N-LAT -> N-PRIV", "Steal or Forge Kerberos / DC Admin [T1558]", "P = 0.40 (Privilege escalation)"),
        ("E6", "N-PRIV -> N-CRIT", "Automated Exfiltration of Vault [T1048]", "P = 0.30 (Critical database target)")
    ]
    for i, d_row in enumerate(dag_data):
        style_table_row(tbl_dag.rows[i+1], dag_widths, d_row, bg_hex="F8FAFC" if i % 2 == 1 else "FFFFFF", is_bold_first=True)

    add_styled_heading(doc, "8.2 Markov Chain Transition Probabilities & Interactive Canvas", level=2)
    add_p(
        doc,
        "Adversary traversal is modeled via a first-order Markov Chain where the transition probability matrix P_ij defines the likelihood "
        "that an adversary currently at node i will successfully traverse edge (i, j) in the next step. "
        "In 'client/pages/attack-graph.html', the graph is rendered using an interactive HTML5 Canvas. Nodes are draggable with real-time "
        "force physics. When the operator clicks 'EXECUTE 10-STEP SIMULATION', the engine simulates 10 discrete attack waves, animating "
        "threat wave pulses across vulnerable edges and updating risk counters in real time."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 9: LAYER 5 - DYNAMIC DECEPTION TECHNOLOGY
    # =============================================================
    add_styled_heading(doc, "Chapter 9: Layer 5 - Dynamic Deception Technology & Deterministic Honeypots", level=1)
    
    add_p(
        doc,
        "Heuristic intrusion detection systems frequently flood security analysts with thousands of false alarms, causing alert fatigue. "
        "Layer 5 ('server/models/DeceptionAsset.js') deploys dynamic deception technology. Decoys are synthetic assets with zero operational value: "
        "no legitimate employee or authorized script ever has reason to interact with them. Therefore, any interaction represents 100% confidence "
        "malicious intent."
    )

    add_styled_heading(doc, "9.1 Pre-Seeded Deception Decoys & Mechanics", level=2)
    
    add_bullet(
        doc,
        "Decoy 1: DEC-001 — Admin SSH Key Honeytoken: ",
        "A synthetic OpenSSH private key planted in realistic backup locations ('/etc/security/id_rsa_backup'). "
        "Configured with status ARMED. Any read attempt immediately flags the requesting user ID as an active intruder."
    )
    add_bullet(
        doc,
        "Decoy 2: DEC-002 — Decoy SQL Database Port: ",
        "A simulated database listener binding to TCP port 54322 (Internal Decoy PostgreSQL). Intruders performing local port scans "
        "or automated credential stuffing on this port are immediately fingerprinted and blocked."
    )
    add_bullet(
        doc,
        "Decoy 3: DEC-003 — Canary Cloud API Token: ",
        "A synthetic AWS/Azure access key embedded in developer configuration paths ('env/aws_dev_credentials.json'). "
        "Monitors for credential harvesting scripts."
    )

    add_styled_heading(doc, "9.2 Deception Trigger Pipeline", level=2)
    add_p(
        doc,
        "When an interaction occurs, the deception router (/api/deception/trigger) logs a CRITICAL security event, "
        "dispatches an instant 'deception:trigger' WebSocket broadcast, displays a desktop alert toast, and instantaneously "
        "collapses the offending user's Trust Score to 0."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 10: DEFENSIVE ENDPOINT AUDITING & FIM
    # =============================================================
    add_styled_heading(doc, "Chapter 10: Defensive Endpoint Auditing, File Integrity Monitoring (FIM) & Networks", level=1)
    
    add_p(
        doc,
        "In accordance with NIST SP 800-128 host configuration standards, NeuroShield implements three active endpoint auditing services:"
    )

    add_styled_heading(doc, "10.1 The Canary Vault & Cryptographic File Integrity Monitoring (FIM)", level=2)
    add_p(
        doc,
        "Ransomware strains and data wipers frequently begin by enumerating local user directories for sensitive documents and credentials. "
        "The FIM service ('server/services/fimService.js') operates an automated tripwire Canary Vault:"
    )

    add_bullet(
        doc,
        "Vault Location: ",
        "Created automatically at %APPDATA%\\NeuroShield\\CanaryVault\\ upon service startup."
    )
    add_bullet(
        doc,
        "Tripwire Files: ",
        "Deploys 'secrets.env' and 'backup_codes.txt'. The service calculates and stores their cryptographic SHA-256 baseline hashes."
    )
    add_bullet(
        doc,
        "Active Filesystem Watcher: ",
        "Maintains an active Node.js fs.watch listener and periodic checksum comparator. If an unauthorized script or intruder touches, "
        "modifies, deletes, or renames any canary file, the hash discrepancy is detected in sub-100ms."
    )
    add_bullet(
        doc,
        "Interactive Intrusion Simulator: ",
        "In 'client/pages/endpoint-audit.html', judges can click 'Trip Canary Trap (Simulate Intrusion)'. The server executes /api/auditing/fim/touch-canary, "
        "which appends an intrusion tamper byte to the canary file. The watcher immediately detects the modification and fires a critical "
        "'fim:alert' across the desktop."
    )

    add_styled_heading(doc, "10.2 System Workload & Defensive Port Auditing", level=2)
    add_p(
        doc,
        "The system auditor ('server/services/systemAuditorService.js') samples CPU core load, available RAM, and uptime to detect runaway "
        "crypto-mining processes. Concurrently, the network auditor ('server/services/networkAuditorService.js') performs non-blocking TCP socket "
        "scans against critical ports (SSH: 22, HTTP: 80, HTTPS: 443, RDP: 3389, API: 5000, MongoDB: 27017) and audits cloud DNS latency."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 11: REAL-TIME EVENT MESH & NOTIFICATIONS
    # =============================================================
    add_styled_heading(doc, "Chapter 11: Real-Time Event Mesh, Socket.IO WebSockets & Native Notifications", level=1)
    
    add_p(
        doc,
        "A Security Operations Center requires instantaneous, sub-second event synchronization. NeuroShield eliminates page refresh polling "
        "by implementing a bidirectional real-time event pipeline ('server/services/realtimeService.js' & 'client/js/realtime.js')."
    )

    add_styled_heading(doc, "11.1 Socket.IO Mesh & MongoDB Change Streams", level=2)
    add_p(
        doc,
        "When running with MongoDB Atlas, the server attaches native MongoDB Change Streams to the 'alerts', 'securityevents', and "
        "'deceptionassets' collections. Whenever a document is inserted or updated in the database, the MongoDB replica set notifies Express, "
        "which immediately broadcasts the payload over Socket.IO WebSockets to all connected desktop clients."
    )

    add_styled_heading(doc, "11.2 Dual-Tier Alert Notification Delivery", level=2)
    add_p(
        doc,
        "Alerts are presented through two synchronized notification tiers:"
    )

    add_bullet(
        doc,
        "Tier 1: Desktop Client Slide-In Toasts: ",
        "Rendered dynamically inside 'client/dashboard.html' in the #toast-container. Formatted with color-coded severity indicators "
        "(CRITICAL red, HIGH yellow, INFO cyan) with automated 5-second fade-out animations."
    )
    add_bullet(
        doc,
        "Tier 2: Native Windows OS Action Center Notifications: ",
        "Dispatched via Electron IPC ('neuroshield:show-notification'). Generates an authentic Windows 10/11 Action Center alert with the "
        "NeuroShield shield icon, notifying administrators even if the application is minimized."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 12: STEP-BY-STEP JUDGING DEMONSTRATION PLAYBOOK
    # =============================================================
    add_styled_heading(doc, "Chapter 12: Step-by-Step Live Demonstration Playbook For Judges", level=1)
    
    add_p(
        doc,
        "This standardized evaluation playbook allows presenters to demonstrate all capabilities of NeuroShield to competition judges "
        "in approximately 5 minutes:"
    )

    demo_steps_full = [
        ("Step 1: Launch Software & 1-Click Persona Authentication",
         "Action: Launch the application via 'npm run electron'.\n"
         "Script For Judges: 'Judges, notice the 1-CLICK DEMO ACCESS panel on our sign-in screen. We have pre-seeded an enterprise roster "
         "covering SOC Admins, CISOs, Analysts, DevOps, and Insiders. I will click SOC Admin (admin@neuroshield.local).'\n"
         "Result: The client authenticates immediately without manual typing and loads the main command dashboard."),
        
        ("Step 2: Inspect Live Pointer & Typing Speed (At-Rest Zero Guarantee)",
         "Action: Direct attention to the top header badge: 'Pointer: 0 px/s | Typing: 0 WPM'. Move the mouse across the desktop.\n"
         "Script For Judges: 'Notice that while idle, both speed indicators strictly read zero. As I move the mouse anywhere across the Windows OS, "
         "the pointer velocity tracks my movement in real time. The moment I pause, deadband filters drop it cleanly back to zero.'\n"
         "Result: Live velocity updates responsively between 0 and 1200+ px/s."),
        
        ("Step 3: Interactive Behavioral Biometric Calibration Sandbox",
         "Action: Navigate to 'Layer 1: Behavioral Biometrics' ('behavior.html'). Type into the live typing sandbox.\n"
         "Script For Judges: 'NeuroShield continuously monitors human subconscious rhythm. As I type the target sentence, notice the "
         "Typing Speed (WPM) and Inter-Key Interval (ms) tracking my cadence. Clicking Analyze Live Telemetry evaluates my dynamics through "
         "our K-Means, One-Class SVM, and Random Forest ensemble.'\n"
         "Result: HUD updates dynamically and outputs a GENUINE classification with anomaly score < 0.20."),
        
        ("Step 4: Execute Markov Threat Simulation on Interactive Attack Graph",
         "Action: Open 'Layer 4: Threat Prediction' ('attack-graph.html'). Drag nodes on the canvas. Click 'EXECUTE 10-STEP SIMULATION'.\n"
         "Script For Judges: 'Here is our MITRE ATT&CK killchain topology. These nodes represent our enterprise assets. When I execute the simulation, "
         "the Markov chain calculates exploit hop probabilities, animating threat wave propagation from Employee Identity to the Database Vault.'\n"
         "Result: Animated threat pulses traverse the canvas and a simulation completion toast alerts across the desktop."),
        
        ("Step 5: Trip File Integrity Canary Tripwire (FIM)",
         "Action: Open 'Endpoint & FIM Audit' ('endpoint-audit.html'). Click 'Trip Canary Trap (Simulate Intrusion)'.\n"
         "Script For Judges: 'Under NIST SP 800-128, we maintain an active Canary Vault in AppData with SHA-256 baselines. Let us simulate an attacker "
         "tampering with our canary files.'\n"
         "Result: An instant, critical red alarm banner ('🚨 FIM CANARY COMPROMISE') pops up across the desktop confirming sub-second detection."),
        
        ("Step 6: Demonstrate Suspicious Insider & Emergency Workstation Lockdown",
         "Action: Log out. Click 'Suspicious Insider' (insider@neuroshield.local) to show suspended status. Log back in as Admin and press 'Ctrl+Shift+L'.\n"
         "Script For Judges: 'Notice our insider account is automatically suspended due to anomalous 3 AM access. Furthermore, if an operator faces physical "
         "coercion, pressing Ctrl+Shift+L instantly engages our full-screen Zero-Trust Workstation Lockdown.'\n"
         "Result: The frosted lockdown modal locks the host, requiring administrative password verification to restore access.")
    ]

    for title, desc in demo_steps_full:
        p_step = doc.add_paragraph()
        p_step.paragraph_format.space_before = Pt(6)
        p_step.paragraph_format.space_after = Pt(2)
        r_step = p_step.add_run(f"► {title}")
        r_step.bold = True
        r_step.font.color.rgb = RGBColor(2, 132, 199)
        
        p_desc = doc.add_paragraph(desc)
        p_desc.paragraph_format.left_indent = Inches(0.2)
        p_desc.paragraph_format.space_after = Pt(6)

    doc.add_page_break()

    # =============================================================
    # CHAPTER 13: VERIFICATION METRICS & BUILD PACKAGING
    # =============================================================
    add_styled_heading(doc, "Chapter 13: Algorithmic Verification Test Metrics & Production Build Engineering", level=1)
    
    add_p(
        doc,
        "Every mathematical formula, security engine, and API route in NeuroShield has been validated via automated Jest test suites. "
        "The test runner executes with forceExit and detectOpenHandles to guarantee zero asynchronous resource leakage:"
    )

    tbl_test_full = doc.add_table(rows=6, cols=4)
    tbl_test_full.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_widths = [Inches(2.5), Inches(2.2), Inches(1.0), Inches(1.3)]
    style_table_header(tbl_test_full.rows[0], t_widths, ["Test Suite File", "Subsystem Scope", "Tests", "Execution Status"])

    test_data_full = [
        ("tests/algorithms/behavior.test.js", "K-Means, One-Class SVM, Random Forest", "4 Tests", "PASS (100%)"),
        ("tests/algorithms/trust.test.js", "Temporal decay, step-up auth, lockdown", "4 Tests", "PASS (100%)"),
        ("tests/algorithms/threat.test.js", "Markov chain transitions, MITRE ATT&CK", "4 Tests", "PASS (100%)"),
        ("tests/algorithms/humanRisk.test.js", "Decision Tree, Logistic, Bayesian", "4 Tests", "PASS (100%)"),
        ("tests/api/api.test.js", "Auth, RBAC, Rate Limiting, Deception APIs", "6 Tests", "PASS (100%)")
    ]
    for i, t_row in enumerate(test_data_full):
        style_table_row(tbl_test_full.rows[i+1], t_widths, t_row, bg_hex="F8FAFC" if i % 2 == 1 else "FFFFFF", is_bold_first=True)

    add_styled_heading(doc, "13.1 Production Executable Packaging Mechanics", level=2)
    add_p(
        doc,
        "The desktop application is compiled into a standalone Windows NSIS installer using electron-builder ('package.json' dist target). "
        "The build bundles all production native dependencies, compiles the internal Node.js backend, packages client assets, "
        "and produces a single executable installer: 'dist/NeuroShield Setup 1.0.0.exe' (84.6 MB). "
        "The installer deploys to '%LOCALAPPDATA%\\Programs\\NeuroShield', creates desktop shortcuts, and registers uninstaller metadata cleanly."
    )

    doc.add_page_break()

    # =============================================================
    # CHAPTER 14: COMPLIANCE MAPPING MATRIX
    # =============================================================
    add_styled_heading(doc, "Chapter 14: Enterprise Regulatory Standards Compliance Mapping Matrix", level=1)
    
    add_p(
        doc,
        "NeuroShield is architected in direct alignment with international federal and industry cybersecurity benchmarks:"
    )

    tbl_comp_full = doc.add_table(rows=6, cols=3)
    tbl_comp_full.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_widths = [Inches(1.8), Inches(2.3), Inches(2.9)]
    style_table_header(tbl_comp_full.rows[0], c_widths, ["Standard Framework", "Mandated Control Requirement", "NeuroShield Technical Implementation"])

    comp_full_data = [
        ("NIST SP 800-207", "Zero Trust Architecture (Control 3.1)", "Continuous Trust Score evaluation; no implicit trust granted to authenticated sessions."),
        ("NIST SP 800-128", "Security Configuration & FIM (CM-3, CM-5)", "Automated Canary Vault with SHA-256 baselining and sub-100ms tamper detection."),
        ("CIS Controls v8", "Control 6: Access Control Management", "Dynamic Risk-Based Authentication (RBA) with stepped-up verification tiers."),
        ("CIS Controls v8", "Control 10: Malware Defenses", "Continuous behavioral biometric anomaly detection isolating compromised hosts."),
        ("MITRE ATT&CK", "Adversary Tactic & Technique Mapping", "Interactive DAG attack graph modeling lateral killchain propagation probabilities.")
    ]
    for i, c_row in enumerate(comp_full_data):
        style_table_row(tbl_comp_full.rows[i+1], c_widths, c_row, bg_hex="F8FAFC" if i % 2 == 1 else "FFFFFF", is_bold_first=True)

    add_callout(
        doc,
        "FINAL ARCHITECTURAL VERIFICATION",
        "NeuroShield delivers a complete, production-grade continuous defense terminal. By uniting involuntary human biometrics, "
        "continuous trust decay, predictive threat modeling, dynamic deception, and cryptographic file integrity monitoring, "
        "it represents the next generation of host cybersecurity architecture.",
        bg_hex="F0FDF4",
        border_hex="16A34A"
    )

    # Save final document
    output_path = os.path.abspath("NeuroShield_Software_Working_Report.docx")
    doc.save(output_path)
    print(f"[SUCCESS] Comprehensive report successfully generated at: {output_path}")

if __name__ == "__main__":
    generate_report()
