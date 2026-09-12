/**
 * Risk-Based Authentication (RBA) Policy Engine
 * Maps Trust Score and Risk Level to access action requirements.
 */

function determineRBAAction(overallTrust, riskLevel) {
  if (riskLevel === 'CRITICAL RISK' || overallTrust < 35) {
    return {
      action: 'RESTRICT',
      description: 'Critical risk level detected. Restricting sensitive operations and requiring admin intervention.'
    };
  } else if (riskLevel === 'HIGH RISK' || overallTrust < 55) {
    return {
      action: 'STEP_UP_MFA',
      description: 'High risk level detected. Mandatory Step-Up MFA authentication required for continued access.'
    };
  } else if (riskLevel === 'MEDIUM RISK' || overallTrust < 75) {
    return {
      action: 'CHALLENGE',
      description: 'Medium risk level detected. Issuing secondary security verification challenge.'
    };
  } else {
    return {
      action: 'NORMAL',
      description: 'High trust baseline confirmed. Granting standard authorized access.'
    };
  }
}

module.exports = {
  determineRBAAction
};
