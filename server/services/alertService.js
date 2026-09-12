const Alert = require('../models/Alert');
const realtimeService = require('./realtimeService');
const { randomUUID } = require('crypto');

class AlertService {
  async createAlert(alertData) {
    const alertId = `ALT-${randomUUID()}`;

    const alert = new Alert({
      alertId,
      title: alertData.title,
      description: alertData.description,
      severity: alertData.severity || 'MEDIUM',
      sourceLayer: alertData.sourceLayer,
      userId: alertData.userId || null,
      status: 'NEW',
      isDemo: alertData.isDemo || false
    });

    const savedAlert = await alert.save();
    realtimeService.broadcast('alert:new', savedAlert);
    return savedAlert;
  }

  async acknowledgeAlert(alertId, userId) {
    const alert = await Alert.findOne({ alertId });
    if (!alert) throw new Error('Alert not found');

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = userId;
    const updated = await alert.save();
    realtimeService.broadcast('alert:update', updated);
    return updated;
  }

  async resolveAlert(alertId, userId) {
    const alert = await Alert.findOne({ alertId });
    if (!alert) throw new Error('Alert not found');

    alert.status = 'RESOLVED';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    const updated = await alert.save();
    realtimeService.broadcast('alert:update', updated);
    return updated;
  }
}

module.exports = new AlertService();
