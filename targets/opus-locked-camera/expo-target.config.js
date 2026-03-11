/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "app-intent",
  name: "opus_locked_camera",
  displayName: "Opus Locked Camera",
  bundleIdentifier: ".lockedcamera",
  deploymentTarget: "18.0",
  frameworks: ["LockedCameraCapture", "SwiftUI", "AppIntents", "AVFoundation"],
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements?.["com.apple.security.application-groups"] ?? [
        "group.com.drgladysz.opus",
      ],
  },
});
