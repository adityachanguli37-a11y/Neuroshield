/**
 * NeuroShield Biometric Telemetry Collector
 * Captures real-time keystroke dynamics and mouse kinematic vectors.
 */
(function() {
  // If running inside a child frame and parent already has a collector, reuse and attach
  if (typeof window !== 'undefined' && window.parent && window.parent !== window && window.parent.biometricsCollector) {
    window.biometricsCollector = window.parent.biometricsCollector;
    window.biometricsCollector.attachToContainer(window);
    if (document) window.biometricsCollector.attachToContainer(document);
    return;
  }

  class BiometricCollector {
    constructor() {
      this.active = false;
      this.attachedContainers = new Set();
      this.reset();
    }

    reset() {
      this.keyPressHistory = []; // hold times
      this.activeKeyDowns = new Map(); // key -> downTime
      this.lastKeyDownTime = null;
      this.interKeyIntervals = [];
      this.recentKeyStrokes = []; // rolling timestamps of recent keystrokes

      this.mousePositions = []; // { x, y, t }
      this.mouseVelocities = [];
      this.mouseAccelerations = [];

      this.clickStartTime = null;
      this.clickDurations = [];

      this.scrollEvents = [];
      this.scrollVelocities = [];

      this.startTime = Date.now();
      this.totalKeystrokes = 0;
      this.activeTypingTimeMs = 0;
      this.osPointerSpeed = 0;
      this.osInstantSpeed = 0;
      this.lastMeasuredWpm = 0;
      this.lastMeasuredIki = 0;
      this.lastMeasuredMouseVelocity = 0;
    }

    async updateOsPointerSpeed() {
      if (typeof window !== 'undefined' && window.neuroshield && typeof window.neuroshield.getOsPointerSpeed === 'function') {
        try {
          const res = await window.neuroshield.getOsPointerSpeed();
          if (res) {
            this.osPointerSpeed = res.avgSpeed || 0;
            this.osInstantSpeed = res.instantSpeed || 0;
          }
        } catch (e) {}
      }
    }

    _setupHandlers() {
      if (this._handlersInitialized) return;
      this._handlersInitialized = true;

      this._onKeyDown = (e) => {
        if (e._biometricsProcessed) return;
        e._biometricsProcessed = true;

        const now = performance.now();
        this.totalKeystrokes++;
        this.recentKeyStrokes.push(now);

        // Keep rolling buffer of recent strokes (last 10 seconds)
        if (this.recentKeyStrokes.length > 50) {
          this.recentKeyStrokes.shift();
        }

        if (this.lastKeyDownTime) {
          const iki = now - this.lastKeyDownTime;
          if (iki > 20 && iki < 3000) { // filter out long pauses and bounces
            this.interKeyIntervals.push(iki);
            this.activeTypingTimeMs += iki;
            if (this.interKeyIntervals.length > 60) this.interKeyIntervals.shift();
            this.lastMeasuredIki = Math.round(iki);
          }
        }
        this.lastKeyDownTime = now;

        if (this.recentKeyStrokes.length >= 2) {
          const spanSec = (now - this.recentKeyStrokes[0]) / 1000;
          if (spanSec > 0.3) {
            const words = this.recentKeyStrokes.length / 5;
            const curWpm = Math.min(220, Math.round((words / spanSec) * 60));
            if (curWpm > 0) this.lastMeasuredWpm = curWpm;
          }
        }

        const keyId = e.code || e.key || 'Key';
        if (!this.activeKeyDowns.has(keyId)) {
          this.activeKeyDowns.set(keyId, now);
        }
      };

      this._onKeyUp = (e) => {
        if (e._biometricsKeyUpProcessed) return;
        e._biometricsKeyUpProcessed = true;

        const now = performance.now();
        const keyId = e.code || e.key || 'Key';
        const downTime = this.activeKeyDowns.get(keyId);
        if (downTime) {
          const hold = now - downTime;
          if (hold > 10 && hold < 2000) {
            this.keyPressHistory.push(hold);
            if (this.keyPressHistory.length > 60) this.keyPressHistory.shift();
          }
          this.activeKeyDowns.delete(keyId);
        }
      };

      this._onMouseMove = (e) => {
        if (e._biometricsMoveProcessed) return;
        e._biometricsMoveProcessed = true;

        const now = performance.now();
        this.lastMouseMoveTime = now;
        const pos = { x: e.clientX, y: e.clientY, t: now };
        this.mousePositions.push(pos);

        if (this.mousePositions.length > 2) {
          const prev = this.mousePositions[this.mousePositions.length - 2];
          const dt = (now - prev.t) / 1000; // seconds
          if (dt > 0.005 && dt < 0.5) {
            const dist = Math.sqrt((pos.x - prev.x) ** 2 + (pos.y - prev.y) ** 2);
            const vel = Math.round(dist / dt);
            this.mouseVelocities.push(vel);
            if (vel > 0) this.lastMeasuredMouseVelocity = vel;

            if (this.mouseVelocities.length > 1) {
              const prevVel = this.mouseVelocities[this.mouseVelocities.length - 2];
              const accel = Math.round(Math.abs(vel - prevVel) / dt);
              this.mouseAccelerations.push(accel);
            }
          }
        }

        // Keep rolling buffer
        if (this.mousePositions.length > 60) this.mousePositions.shift();
        if (this.mouseVelocities.length > 60) this.mouseVelocities.shift();
        if (this.mouseAccelerations.length > 60) this.mouseAccelerations.shift();
      };

      this._onMouseDown = () => {
        this.clickStartTime = performance.now();
      };

      this._onMouseUp = () => {
        if (this.clickStartTime) {
          const dur = performance.now() - this.clickStartTime;
          if (dur < 2000) {
            this.clickDurations.push(dur);
            if (this.clickDurations.length > 40) this.clickDurations.shift();
          }
          this.clickStartTime = null;
        }
      };

      this._onWheel = (e) => {
        const vel = Math.abs(e.deltaY);
        this.scrollVelocities.push(vel * 5);
        if (this.scrollVelocities.length > 30) this.scrollVelocities.shift();
      };
    }

    attachToContainer(container) {
      if (!container || this.attachedContainers.has(container)) return;
      this._setupHandlers();
      try {
        const opts = { passive: true };
        container.addEventListener('keydown', this._onKeyDown, opts);
        container.addEventListener('keyup', this._onKeyUp, opts);
        container.addEventListener('mousemove', this._onMouseMove, opts);
        container.addEventListener('mousedown', this._onMouseDown, opts);
        container.addEventListener('mouseup', this._onMouseUp, opts);
        container.addEventListener('wheel', this._onWheel, opts);
        this.attachedContainers.add(container);
      } catch (e) {}
    }

    start(container = (typeof window !== 'undefined' ? window : null)) {
      this.active = true;
      if (container) {
        this.attachToContainer(container);
      }
      if (typeof document !== 'undefined') {
        this.attachToContainer(document);
      }
    }

    stop() {
      this.active = false;
      const opts = { passive: true };
      for (const container of this.attachedContainers) {
        try {
          container.removeEventListener('keydown', this._onKeyDown, opts);
          container.removeEventListener('keyup', this._onKeyUp, opts);
          container.removeEventListener('mousemove', this._onMouseMove, opts);
          container.removeEventListener('mousedown', this._onMouseDown, opts);
          container.removeEventListener('mouseup', this._onMouseUp, opts);
          container.removeEventListener('wheel', this._onWheel, opts);
        } catch (e) {}
      }
      this.attachedContainers.clear();
    }

    getLiveTelemetry() {
      const avg = (arr, def = 0) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : def;
      const now = performance.now();

      // Prune recent keystrokes older than 5 seconds
      this.recentKeyStrokes = this.recentKeyStrokes.filter(t => (now - t) <= 5000);

      // Instantaneous WPM calculation from rolling keystrokes
      let instantWpm = 0;
      const isCurrentlyTyping = this.lastKeyDownTime && (now - this.lastKeyDownTime) <= 2200;

      if (isCurrentlyTyping && this.recentKeyStrokes.length >= 2) {
        const spanSec = (now - this.recentKeyStrokes[0]) / 1000;
        if (spanSec > 0.4) {
          const words = this.recentKeyStrokes.length / 5;
          instantWpm = Math.min(220, Math.round((words / spanSec) * 60));
        } else if (this.interKeyIntervals.length > 0) {
          const lastIki = this.interKeyIntervals[this.interKeyIntervals.length - 1];
          if (lastIki > 40 && lastIki < 2000) {
            instantWpm = Math.min(220, Math.round(12000 / lastIki));
          }
        }
      }

      // Session average WPM
      let sessionWpm = 0;
      if (this.activeTypingTimeMs > 1000) {
        const activeMinutes = this.activeTypingTimeMs / 60000;
        sessionWpm = Math.min(200, Math.round((this.totalKeystrokes / 5) / activeMinutes));
      }

      // Mouse velocity is strictly 0 when at rest (no mouse movement in last 300ms)
      const isMouseMoving = this.lastMouseMoveTime && (now - this.lastMouseMoveTime) <= 300;
      const appMouseVelocity = isMouseMoving ? avg(this.mouseVelocities, 0) : 0;
      const effectiveMouseSpeed = (this.osInstantSpeed && this.osInstantSpeed > 0)
        ? this.osInstantSpeed
        : (isMouseMoving ? appMouseVelocity : 0);

      // Typing speed is strictly 0 when at rest (no keystrokes in last 2200ms)
      const evaluatedTypingSpeed = isCurrentlyTyping ? instantWpm : 0;
      const typingInterval = isCurrentlyTyping ? (avg(this.interKeyIntervals, 0) || 120) : 0;
      const mouseAccel = isMouseMoving ? avg(this.mouseAccelerations, 0) : 0;
      const clickDelay = avg(this.clickDurations, 0);
      const scrollVelocity = avg(this.scrollVelocities, 0);
      const sessionHour = new Date().getHours();

      return {
        typingSpeed: evaluatedTypingSpeed,
        instantWpm: instantWpm,
        sessionWpm: sessionWpm,
        lastMeasuredWpm: this.lastMeasuredWpm || sessionWpm || (this.interKeyIntervals.length ? Math.min(220, Math.round(12000 / avg(this.interKeyIntervals, 115))) : 0),
        typingInterval: typingInterval,
        lastMeasuredIki: this.lastMeasuredIki || avg(this.interKeyIntervals, 0),
        mouseVelocity: effectiveMouseSpeed,
        appMouseVelocity: appMouseVelocity,
        lastMeasuredMouseVelocity: this.lastMeasuredMouseVelocity || avg(this.mouseVelocities, 0),
        osPointerSpeed: this.osPointerSpeed || 0,
        osInstantSpeed: this.osInstantSpeed || 0,
        mouseAccel,
        clickDelay,
        scrollVelocity,
        sessionHour,
        sampleMetrics: {
          keystrokesCount: this.totalKeystrokes,
          recentKeystrokesCount: this.recentKeyStrokes.length,
          mouseSampleCount: this.mouseVelocities.length,
          clickCount: this.clickDurations.length
        }
      };
    }
  }

  const collector = new BiometricCollector();
  if (typeof window !== 'undefined') {
    window.biometricsCollector = collector;
    collector.start(window);
  }
})();
