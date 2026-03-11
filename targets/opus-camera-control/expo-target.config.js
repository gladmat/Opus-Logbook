/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "opus_camera_control",
  displayName: "Opus Capture",
  bundleIdentifier: ".capturecontrol",
  deploymentTarget: "18.0",
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements?.["com.apple.security.application-groups"] ?? [
        "group.com.drgladysz.opus",
      ],
  },
  colors: {
    $accent: "#B65A3C",
    $widgetBackground: {
      light: "#F4EDE3",
      dark: "#1E1814",
    },
  },
});
