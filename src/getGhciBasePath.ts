import * as os from 'os';
import * as path from 'path';
import * as config from './config';
import { info } from './logger';

export const getGhciBasePath = () => {
  const configuredPath = config.ghciPath();

  if (configuredPath && configuredPath.trim().length > 0) {
    info(`custom GHCI base path configured at ${configuredPath}`);
    const resolvedPath = configuredPath.replace('~', os.homedir());
    return resolvedPath.endsWith('ghci')
      ? resolvedPath.substring(0, resolvedPath.length - 4)
      : resolvedPath;
  }

  return path.join(os.homedir(), '.ghcup', 'bin');
};
