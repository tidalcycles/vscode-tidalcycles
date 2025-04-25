// package.release.config.js
/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      'semantic-release-vsce',
      {
        packageVsix: true,
        publish: false,
        publishPackagePath: '*.vsix',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: '*.vsix',
      },
    ],
  ],
};
