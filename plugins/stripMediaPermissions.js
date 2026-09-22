const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

const BLOCKED_MEDIA_PERMISSIONS = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.ACCESS_MEDIA_LOCATION",
];

module.exports = function stripMediaPermissions(config) {
  config = AndroidConfig.Permissions.withBlockedPermissions(
    config,
    BLOCKED_MEDIA_PERMISSIONS
  );

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (application.$?.["android:requestLegacyExternalStorage"]) {
      delete application.$["android:requestLegacyExternalStorage"];
    }

    return config;
  });
};
