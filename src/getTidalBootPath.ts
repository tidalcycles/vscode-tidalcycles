import { workspace } from 'vscode';
import * as config from './config';
import { writeLine } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import { getGhciBasePath } from './getGhciBasePath';
import * as child_process from 'child_process';

export const getTidalBootPath = () => {
    console.log('start')
    const configuredBootTidalPath = config.bootTidalPath();

    // first, check for a configured boot path
    if (configuredBootTidalPath) {
        writeLine(
            `Custom Tidal boot path is configured: ${configuredBootTidalPath}`
        );

        return configuredBootTidalPath;
    }

    writeLine('Custom Tidal boot path is not configured');

    // next, check for a BootTidal.hs file in the local dir
    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
        const localBootFilePath = path.join(
            workspace.workspaceFolders[0].uri.fsPath,
            'BootTidal.hs'
        );
        try {
            console.log('here')
            fs.statSync(localBootFilePath);
            writeLine(`Local Tidal boot file was found: ${localBootFilePath}`);
            return localBootFilePath;
        } catch (err) {
            writeLine(`Local Tidal boot file was not found.`);
        }
    }

    // finally, locate the Tidal boot file in the Tidal ghc package
    const ghciBasePath = getGhciBasePath();
    const command = `${path.join(
        ghciBasePath,
        'ghc-pkg'
    )} field tidal data-dir`;
    const dataDir = child_process.execSync(command).toString('utf8').replace('data-dir: ', '').trim();

    const packagePath = path.join(dataDir, 'BootTidal.hs');

    writeLine(`Using default Tidal boot file from package path: "${packagePath}"`);
    return packagePath;
};
