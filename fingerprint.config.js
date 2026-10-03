// What counts as a native change for OTA updates (scripts/fingerprint.js,
// @expo/fingerprint): the committed ios/ project, native modules and the Expo
// config. Left out: the versions and runtimeVersion themselves (the stored
// fingerprint tracks runtimeVersion apart), package.json scripts and
// .gitignore, which never change the native app, the stored fingerprint
// file, which would otherwise hash itself, and eas.json: it configures the
// build service and the EXPO_PUBLIC_* env of the bundle (scripts/eas-env.js),
// not the native app, and a new env variable must not demand a Store build.
/** @type {import('@expo/fingerprint').Config} */
const config = {
  sourceSkips: ['ExpoConfigVersions', 'ExpoConfigRuntimeVersionIfString', 'PackageJsonScriptsAll', 'GitIgnore'],
  ignorePaths: ['ios/fingerprint.json', 'eas.json'],
};

module.exports = config;
