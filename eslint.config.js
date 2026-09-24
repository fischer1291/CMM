// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // The backend (submodule) has its own tooling
    ignores: ['dist/*', 'CMM-backend-new/*', 'ios/*', 'android/*'],
  },
]);
