// See https://code.visualstudio.com/api/working-with-extensions/testing-extension#migrating-from-vscode
import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        console.log(`Using extension development path: ${extensionDevelopmentPath}`);

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './index.js');
        console.log(`Using extension tests path: ${extensionTestsPath}`);

        // Download VS Code, unzip it and run the integration test
        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
