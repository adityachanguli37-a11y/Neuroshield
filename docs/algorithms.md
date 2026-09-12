# NeuroShield Algorithms & Mathematical Specification

This document details the mathematical models, probability distributions, loss formulations, and heuristic functions driving the **NeuroShield Continuous Adaptive Defense System**.

---

## 1. Layer 1: Behavioral Identity Engine

### A. Biometric Feature Extraction & Rolling Sliding Window
Raw telemetry captures continuous keystroke and cursor kinematics:
- **Inter-Keystroke Interval (IKI)**: Elapsed time between consecutive `keydown` events:
  $$\text{IKI}_k = t_{k} - t_{k-1}$$
- **Key Hold Time ($H$)**: Duration between `keydown` and `keyup`:
  $$H_k = t_{\text{up}, k} - t_{\text{down}, k}$$
- **Instantaneous Typing Speed (WPM)**: Evaluated over an active sliding window $W_t$ ($5$ seconds):
  $$\text{WPM} = \frac{|K_{W_t}| / 5}{\Delta t_{\text{min}}}$$
  *Idle Decay Guarantee*: If elapsed idle time exceeds $2200\text{ ms}$, $\text{WPM} \rightarrow 0$.
- **OS Cursor Velocity ($V$)**:
  $$V = \frac{\sqrt{(x_t - x_{t-\Delta t})^2 + (y_t - y_{t-\Delta t})^2}}{\Delta t}$$
  *At-Rest Threshold*: If displacement $< 2\text{ px}$, $V \rightarrow 0\text{ px/s}$.

### B. Feature Vector Normalization ($z$-Score)
Raw vectors $x \in \mathbb{R}^d$ are normalized against personal baseline profiles $(\mu_i, \sigma_i)$:
$$z_i = \frac{x_i - \mu_i}{\sigma_i}$$

### C. K-Means Centroid Distance Anomaly Metric
Computes Euclidean distance to normalized centroid origin $c = \mathbf{0}$:
$$d(z, c) = \sqrt{\sum_{i=1}^d z_i^2}$$
Sigmoidal normalization yields the K-Means anomaly score $A_k \in [0, 1]$:
$$A_k = \frac{1}{1 + e^{-(d - 2.0)}}$$

### D. One-Class Support Vector Machine (RBF Kernel)
Evaluates non-linear boundary compliance using Radial Basis Function kernel ($\gamma = 0.5$):
$$K(z, 0) = \exp\left(-\gamma \|z\|^2\right)$$
Anomaly distance score $A_s$:
$$A_s = 1 - K(z, 0)$$

### E. Random Forest Ensemble Classifier
Consists of $5$ orthogonal decision trees evaluating sub-space splits across $(\text{speed}, \text{interval}, \text{velocity}, \text{accel}, \text{delay})$. Final ensemble anomaly score:
$$A_{\text{ensemble}} = (A_k \times 0.35) + (A_s \times 0.35) + (A_{\text{rf}} \times 0.30)$$
- **`GENUINE`**: $A_{\text{ensemble}} < 0.40$
- **`SUSPICIOUS`**: $0.40 \le A_{\text{ensemble}} < 0.65$
- **`ANOMALOUS`**: $A_{\text{ensemble}} \ge 0.65$

---

## 2. Layer 2: Adaptive Trust Engine

### A. Context-Weighted Multi-Factor Trust Matrix
Continuous trust evaluation aggregates five distinct contextual security factors:
$$\text{Trust} = (S_{\text{Behavior}} \times 0.40) + (S_{\text{Device}} \times 0.20) + (S_{\text{Location}} \times 0.15) + (S_{\text{Network}} \times 0.15) + (S_{\text{Time}} \times 0.10)$$

### B. Mamdani Fuzzy Logic Inference & RBA Rules
Membership functions (Triangular & Trapezoidal):
- **Low**: $\mu_{\text{Low}}(x) = \max\left(0, \min\left(1, \frac{40 - x}{40}\right)\right)$
- **Medium**: $\mu_{\text{Med}}(x) = \max\left(0, \min\left(\frac{x - 30}{30}, \frac{75 - x}{15}\right)\right)$
- **High**: $\mu_{\text{High}}(x) = \max\left(0, \min\left(\frac{x - 65}{35}, 1\right)\right)$

**Fuzzy Decision Matrix**:
1. If $\text{Behavior}$ is `Low` AND $\text{Network}$ is `Low` $\rightarrow$ Action = `RESTRICT`
2. If $\text{Trust} < 50$ $\rightarrow$ Action = `STEP_UP_MFA`
3. If $50 \le \text{Trust} < 75$ $\rightarrow$ Action = `CHALLENGE`
4. If $\text{Trust} \ge 75$ $\rightarrow$ Action = `NORMAL`

---

## 3. Layer 3: Human Risk Prediction Engine

### A. Decision Tree Rule Evaluator
Traverses conditional risk branches weighing:
- Failed consecutive authentications ($\Delta > 3 \rightarrow +30$)
- Deception decoy triggers ($N_{\text{decoy}} > 0 \rightarrow +45$)
- Trust score degradation ($T < 40 \rightarrow +25$)

### B. Logistic Regression (Logit) Formulation
Computes log-odds of compromise probability $P(\text{Risk})$:
$$z = \beta_0 + \sum_{i=1}^m \beta_i x_i$$
$$P(\text{Risk}) = \frac{1}{1 + e^{-z}}$$

### C. Bayesian Posterior Update
Refines risk state dynamically as new threat incidents occur:
$$P(\text{Risk} \mid E) = \frac{P(E \mid \text{Risk}) \cdot P(\text{Risk})}{P(E)}$$
Where $P(E) = P(E \mid \text{Risk})P(\text{Risk}) + P(E \mid \neg\text{Risk})P(\neg\text{Risk})$.

---

## 4. Layer 4: Predictive Threat Simulation Engine

### A. 7-State Stochastic Markov Chain
States $S = \{S_0, S_1, S_2, S_3, S_4, S_5, S_6\}$:
- $S_0$: Normal
- $S_1$: Suspicious
- $S_2$: Initial Compromise
- $S_3$: Compromised
- $S_4$: Lateral Movement
- $S_5$: Privilege Escalation
- $S_6$: Critical Compromise

Transition probability matrix $P \in \mathbb{R}^{7 \times 7}$ enforces row-stochastic constraints:
$$\sum_{j=0}^6 P_{ij} = 1.0, \quad \forall i \in \{0, \dots, 6\}$$

### B. Monte Carlo Random-Walk Simulation
Executes $N \in [100, 100000]$ stochastic path simulations:
$$\hat{P}_{\text{compromise}} = \frac{1}{N} \sum_{k=1}^N \mathbb{I}(\text{Path}_k \text{ reaches } S_6)$$
95% Confidence Interval computed via normal approximation:
$$\text{CI}_{95\%} = \hat{P} \pm 1.96 \sqrt{\frac{\hat{P}(1 - \hat{P})}{N}}$$

---

## 5. Defensive Auditing Heuristics

### A. System Resource Anomaly Score
Evaluates host CPU load and memory pressure:
$$A_{\text{sys}} = \max\left(0, \min\left(1, \frac{\text{CPU}\% - 50}{50} \times 0.6 + \frac{\text{RAM}\% - 60}{40} \times 0.4\right)\right)$$

### B. SHA-256 File Integrity Verification
Computes cryptographic baseline digest for each tripwire file $f$:
$$H(f) = \text{SHA-256}(\text{Content}(f))$$
Tripwire Alert Trigger:
$$\Delta H = (H_t(f) \neq H_0(f)) \implies \text{EMERGENCY\_TRIPWIRE\_ALARM}$$
