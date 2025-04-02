import * as os from 'os';
import * as path from 'path';
import { ghciPath } from './config';
import { writeLine } from './logger';

export const getGhciBasePath = () => {
    const configuredPath = ghciPath();

    if (configuredPath && configuredPath.trim().length > 0) {
        writeLine(`custom GHCI base path configured at ${configuredPath}`);
        const resolvedPath = configuredPath.replace('~', os.homedir());
        return resolvedPath.endsWith('ghci')
            ? resolvedPath.substring(0, resolvedPath.length - 4)
            : resolvedPath;
    }

    return path.join(os.homedir(), '.ghcup', 'bin');
};
