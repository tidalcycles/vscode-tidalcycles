import { ChildProcess, spawn } from 'child_process';
import { ILogger } from './logging';
import * as vscode from 'vscode';
import * as split2 from 'split2';
import { EOL } from 'os';
import { Stream } from 'stream';
import * as fs from 'fs';
import { homedir } from 'os';
import * as commandExists from 'command-exists-promise';

const ghciCommandName = 'ghci';

/**
 * Provides an interface for sending commands to a GHCi session.
 */
export interface IGhci {
    writeLn(command: string): void;
}

export class Ghci implements IGhci {
    private ghciProcess: ChildProcess | null = null;
    public readonly stdout: Stream = new Stream();
    public readonly stderr: Stream = new Stream();

    constructor(
        private logger: ILogger,
        private useStack: boolean,
        private ghciPath: string,
        private showGhciOutput: boolean
    ) {}

    private async getGhciProcess(): Promise<ChildProcess> {
        if (this.ghciProcess !== null) {
            return this.ghciProcess;
        }

        if (this.useStack) {
            var stackOptions = [
                '--silent',
                'ghci',
                '--ghci-options',
                '-XOverloadedStrings'
            ];
            if (!this.showGhciOutput) {
                stackOptions.push('--ghci-options', '-v0');
            }
            this.ghciProcess = spawn('stack', stackOptions, {
                cwd: vscode.workspace.rootPath
            });
        } else {
            var ghciOptions = ['-XOverloadedStrings'];
            if (!this.showGhciOutput) {
                ghciOptions.push('-v0');
            }
            const resolvedGhciPath = await this.resolveGhciPath(this.ghciPath);
            this.ghciProcess = spawn(resolvedGhciPath, ghciOptions, {
                cwd: vscode.workspace.rootPath
            });
        }

        this.ghciProcess.stderr.pipe(split2()).on('data', (data: any) => {
            this.stderr.emit('data', data);
        });
        this.ghciProcess.stdout.on('data', (data: any) => {
            this.stdout.emit('data', data);
        });
        return this.ghciProcess;
    }

    private async write(command: string) {
        try {
            const ghciProcess = await this.getGhciProcess();
            ghciProcess.stdin.write(command);
        } catch (e) {
            this.logger.error(`${e}`);
            return;
        }
    }

    public async writeLn(command: string) {
        await this.write(`${command}${EOL}`);
    }

    private async resolveGhciPath(userPath: string) {
        /*
        1. Try to use user's configured path
            - expand ~ to home directory if present
        2. If that doesn't exist, check for user's configured path on PATH
        3. If it doesn't exist, look for ghci on PATH
        4. If it doesn't exist, look for ghci in other known locations:
            - $HOME/.ghcup/bin/ghci
        5. If that doesn't exist, throw error.
        */

        const triedPaths = [];

        // 1. try to use user's configured path, if it exists
        if (userPath && userPath !== ghciCommandName) {
            const fullGhciPath = userPath.startsWith('~')
                ? `${homedir()}${userPath}`
                : userPath;

            if (fs.existsSync(fullGhciPath)) {
                return fullGhciPath;
            }
        }

        // 2. look for user's configured value on PATH
        if (await commandExists(userPath)) {
            return userPath;
        }

        this.showWarning(`Configured GHCI path was not found: ${userPath}`);
        triedPaths.push(userPath);

        // 3. look for GHCI on PATH
        if (
            userPath !== ghciCommandName &&
            (await commandExists(ghciCommandName))
        ) {
            return ghciCommandName;
        }

        triedPaths.push(ghciCommandName);

        // 4. try a well-known path: /usr/local/bin/ghcixxx
        const wellKnownPath1 = `/usr/local/bin/ghci`;
        if (fs.existsSync(wellKnownPath1)) {
            return wellKnownPath1;
        }

        triedPaths.push(wellKnownPath1);

        // 5. try another well-known path: $HOME/.ghcup/bin/ghci
        const wellKnownPath2 = `${homedir()}.ghcup/bin/ghci`;
        if (fs.existsSync(wellKnownPath2)) {
            return wellKnownPath2;
        }

        triedPaths.push(wellKnownPath2);

        const pathsString = triedPaths.join(', ');

        throw vscode.FileSystemError.FileNotFound(
            `GHCI path could not be found. Attempted paths: ${pathsString}`
        );
    }

    private showWarning(message: string) {
        vscode.window.showWarningMessage(message);
    }
}
