/**
 * Intelligent Deception Engine
 * Defensive deception asset monitoring and interaction analysis.
 */

function processDeceptionTrigger(asset, interactionDetails = {}) {
  const {
    userId = null,
    ipAddress = '127.0.0.1',
    userAgent = 'Unknown',
    payloadAttempted = 'Unauthorized asset access'
  } = interactionDetails;

  let eventType = 'DECOY_INTERACTION';
  let severity = 'HIGH';

  if (asset.type === 'HONEYTOKEN') {
    eventType = 'HONEYTOKEN_ACCESS';
    severity = 'CRITICAL';
  } else if (asset.type === 'HONEYPOT') {
    eventType = 'HONEYPOT_CONNECTION';
    severity = 'CRITICAL';
  } else if (asset.type === 'DECOY') {
    eventType = 'DECOY_INTERACTION';
    severity = 'HIGH';
  }

  const description = `DEFENSIVE DECEPTION TRIGGER: ${asset.type} [${asset.name}] triggered at location (${asset.location}). Severity: ${severity}.`;

  return {
    assetId: asset.assetId,
    userId,
    eventType,
    severity,
    metadata: {
      assetName: asset.name,
      assetType: asset.type,
      location: asset.location,
      ipAddress,
      userAgent,
      payloadAttempted
    },
    description,
    timestamp: new Date()
  };
}

module.exports = {
  processDeceptionTrigger
};
