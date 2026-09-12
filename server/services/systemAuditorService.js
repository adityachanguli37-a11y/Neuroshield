const os = require('os');
const securityEventService = require('./securityEventService');

class SystemAuditorService {
  constructor() {
    this.intervalId = null;
    this.isAuditing = false;
    this.lastCpuSample = null;
    this.latestMetrics = {
      cpuUsagePercent: 0,
      memoryTotalBytes: 0,
      memoryFreeBytes: 0,
      memoryUsagePercent: 0,
      uptimeSeconds: 0,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
      hostname: os.hostname(),
      status: 'HEALTHY'
    };
  }

  _getCpuTimes() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }
    return { idle, total };
  }

  sampleMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

    const currentTimes = this._getCpuTimes();
    let cpuPercent = 15; // default reasonable estimate

    if (this.lastCpuSample) {
      const idleDiff = currentTimes.idle - this.lastCpuSample.idle;
      const totalDiff = currentTimes.total - this.lastCpuSample.total;
      if (totalDiff > 0) {
        cpuPercent = Math.min(100, Math.max(0, Math.round(100 - (idleDiff / totalDiff) * 100)));
      }
    }
    this.lastCpuSample = currentTimes;

    const status = (cpuPercent > 85 || memUsage > 90) ? 'HIGH_LOAD' : 'HEALTHY';

    this.latestMetrics = {
      cpuUsagePercent: cpuPercent,
      memoryTotalBytes: totalMem,
      memoryFreeBytes: freeMem,
      memoryUsagePercent: memUsage,
      uptimeSeconds: Math.round(os.uptime()),
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
      hostname: os.hostname(),
      status,
      timestamp: new Date()
    };

    // Flag anomalies if continuous excessive resource spike
    if (cpuPercent > 92) {
      securityEventService.processEvent({
        eventType: 'SYSTEM_RESOURCE_ANOMALY',
        severity: 'MEDIUM',
        sourceLayer: 'ADAPTIVE_TRUST',
        description: `High CPU utilization anomaly detected: ${cpuPercent}%. Host resource strain may indicate rogue process execution.`,
        metadata: { cpuPercent, memUsage }
      }).catch(() => {});
    }

    return this.latestMetrics;
  }

  start(intervalMs = 5000) {
    if (this.isAuditing) return;
    this.isAuditing = true;
    this.sampleMetrics();
    this.intervalId = setInterval(() => this.sampleMetrics(), intervalMs);
    console.log('[SystemAuditor] System-level event auditor started.');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isAuditing = false;
  }

  getMetrics() {
    return this.latestMetrics;
  }
}

module.exports = new SystemAuditorService();
