const dns = require('dns');
const net = require('net');

class NetworkAuditorService {
  constructor() {
    this.intervalId = null;
    this.latestAudit = {
      dnsLatencyMs: 0,
      dnsStatus: 'HEALTHY',
      resolvedIp: null,
      listeningPorts: [5000],
      networkTrustScore: 90,
      lastAuditTime: new Date()
    };
  }

  async checkDnsLatency(host = 'cloudflare.com') {
    const start = performance.now();
    return new Promise((resolve) => {
      dns.lookup(host, (err, address) => {
        const latency = Math.round(performance.now() - start);
        if (err) {
          resolve({ healthy: false, latency: 999, address: null, error: err.message });
        } else {
          resolve({ healthy: true, latency, address, error: null });
        }
      });
    });
  }

  async auditPort(port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(200);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true); // port is active
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, '127.0.0.1');
    });
  }

  async runAudit() {
    const dnsResult = await this.checkDnsLatency('cloudflare.com');

    // Common standard ports to audit locally
    const commonPorts = [80, 443, 3000, 3306, 5000, 5432, 8080, 27017];
    const openPorts = [];

    for (const p of commonPorts) {
      const isOpen = await this.auditPort(p);
      if (isOpen) openPorts.push(p);
    }

    // Compute Network Trust Score (0 - 100)
    let score = 95;
    if (!dnsResult.healthy) {
      score -= 35;
    } else if (dnsResult.latency > 250) {
      score -= 15;
    }

    // Flag unexpected rogue listening ports (more than 5 local listening services)
    if (openPorts.length > 5) {
      score -= 15;
    }

    this.latestAudit = {
      dnsLatencyMs: dnsResult.latency,
      dnsStatus: dnsResult.healthy ? (dnsResult.latency > 200 ? 'DEGRADED' : 'HEALTHY') : 'OFFLINE',
      resolvedIp: dnsResult.address,
      listeningPorts: openPorts,
      networkTrustScore: Math.max(0, Math.min(100, score)),
      lastAuditTime: new Date()
    };

    return this.latestAudit;
  }

  start(intervalMs = 15000) {
    this.runAudit();
    this.intervalId = setInterval(() => this.runAudit(), intervalMs);
    console.log('[NetworkAuditor] Network and DNS auditor service active.');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getAudit() {
    return this.latestAudit;
  }
}

module.exports = new NetworkAuditorService();
