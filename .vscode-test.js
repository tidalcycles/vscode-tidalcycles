const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    label: 'unitTests',
    files: 'out/integration-tests/**/*.test.js',
  }
  // you can specify additional test configurations, too
]);