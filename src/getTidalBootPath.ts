import { workspace } from 'vscode';
import * as config from './config';
import { info } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import { getGhciBasePath } from './getGhciBasePath';
import * as child_process from 'child_process';

const bootTidalFileName = 'BootTidal.hs';

export const getTidalBootPath = () => {
  const configuredBootTidalPath = config.bootTidalPath();

  // first, check for a configured boot path
  if (configuredBootTidalPath) {
    info(`Custom Tidal boot path is configured at: ${configuredBootTidalPath}`);

    return configuredBootTidalPath;
  }

  info('Custom Tidal boot path is not configured\n');

  // next, check for a BootTidal.hs file in the local dir
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const localBootFilePath = path.join(
      workspace.workspaceFolders[0].uri.fsPath,
      bootTidalFileName
    );
    try {
      fs.statSync(localBootFilePath);
      info(`Local Tidal boot file was found: ${localBootFilePath}`);
      return localBootFilePath;
    } catch {
      info(`Local Tidal boot file was not found.`);
    }
  }

  // finally, locate the Tidal boot file in the Tidal ghc package
  const ghciBasePath = getGhciBasePath();
  const command = `${path.join(ghciBasePath, 'ghc-pkg')} field tidal data-dir`;
  const dataDir = child_process
    .execSync(command)
    .toString('utf8')
    .replace('data-dir: ', '')
    .trim();

  const packagePath = path.join(dataDir, bootTidalFileName);

  info(`Using default Tidal boot file from package path: "${packagePath}"`);
  return packagePath;
};
