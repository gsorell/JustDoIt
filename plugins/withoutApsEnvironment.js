const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Cadence uses only local (on-device) notifications, never remote push. But
 * expo-notifications adds the `aps-environment` (remote push) entitlement to the
 * iOS app by default, which then forces the provisioning profile to include the
 * Push Notifications capability. This plugin removes that entitlement so the app
 * matches a push-free profile — keeping signing simple and avoiding an APNs key
 * we'd never use. Local notification scheduling is unaffected.
 */
module.exports = function withoutApsEnvironment(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
