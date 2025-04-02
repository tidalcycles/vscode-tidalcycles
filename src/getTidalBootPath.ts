import { workspace } from 'vscode';
import * as config from './config';
import { writeLine } from './output';
import * as fs from 'fs';
import * as path from 'path';
import { getGhciBasePath } from './getGhciPath';
import * as child_process from 'child_process';

// const bootPath =
//     '/Users/kindohm/.cabal/share/x86_64-osx-ghc-9.4.8/tidal-1.9.5/BootTidal.hs';

export const getTidalBootPath = () => {
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
            fs.statSync(localBootFilePath);
            writeLine(`Local Tidal boot file was found: ${localBootFilePath}`);
            return localBootFilePath;
        } catch (err) {
            writeLine(`Local Tidal boot file was not found.`);
        }
    }

    //field tidal data-dir

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
