const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    label: 'unitTests',
    files: 'out/test/**/*.test.js',
  }
  // you can specify additional test configurations, too
]);