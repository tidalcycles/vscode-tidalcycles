import { ILogger } from './logging';
import { IGhci } from './ghci';
import * as vscode from 'vscode';
import { homedir } from 'os';

/**
 * Provides an interface to send instructions to the current Tidal instance.
 */
export interface ITidal {
    sendTidalExpression(
        expression: string,
        echoCommandToLogger?: boolean
    ): Promise<void>;
}

export class Tidal implements ITidal {
    tidalBooted: boolean = false;
    lineEnding = vscode.workspace
        .getConfiguration('files', null)
        .get('eol', '\n');

    constructor(
        private logger: ILogger,
        private ghci: IGhci,
        private bootTidalPath: string | null,
        private useBootFileInCurrentDirectory: boolean
    ) {}

    private async bootTidal(): Promise<boolean> {
        if (this.tidalBooted) {
            return true;
        }

        // Use a custom boot file if the user has specified it. If it cannot be loaded, perform the
        // default Tidal boot sequence.
        const bootTidalPath = this.bootTidalPath;
        const useBootFileInCurrentDirectory = this.useBootFileInCurrentDirectory;

        let uri: vscode.Uri | null = null;

        if (useBootFileInCurrentDirectory) {
            const folders = vscode.workspace.workspaceFolders;

            if (folders !== undefined && folders.length > 0) {
                uri = vscode.Uri.parse(
                    `file://${folders[0].uri.path}/BootTidal.hs`
                );
            } else {
                this.logger.warning(
                    'You must open a folder or workspace in order to use the Tidal \
                useBootFileInCurrentDirectory setting.'
                );
            }
        } else if (bootTidalPath) {
            // expand '~' to home directory if present as first character
            const bootTidalPathExpanded = bootTidalPath.startsWith('~')
                ? homedir() + bootTidalPath.substring(1)
                : bootTidalPath;
            uri = vscode.Uri.file(`${bootTidalPathExpanded}`);
        }

        let bootCommands: string[] = [];

        if (uri !== null) {
            let maybeBootCommands = await this.getBootCommandsFromFile(uri);
            if (maybeBootCommands !== null) {
                bootCommands = maybeBootCommands;
            }
        } else {
            const msg = 'You must configure a path to a Tidal bootup file with the tidalcycles.bootTidalPath setting.';
            this.logger.error(msg);
            throw msg;
        }

        for (const command of bootCommands) {
            await this.ghci.writeLn(command);
        }

        this.tidalBooted = true;
        return true;
    }

    public async sendTidalExpression(
        expression: string,
        echoCommandToLogger: boolean = false
    ) {
        if (!(await this.bootTidal())) {
            this.logger.error('Could not boot Tidal');
            return;
        }

        await this.ghci.writeLn(':{');
        const splits = expression.split(/[\r\n]+/);
        for (let i = 0; i < splits.length; i++) {
            const line = splits[i];
            if (echoCommandToLogger) {
                this.logger.log(line);
            }
            await this.ghci.writeLn(line);
        }
        await this.ghci.writeLn(':}');
    }

    private async getBootCommandsFromFile(
        uri: vscode.Uri
    ): Promise<string[] | null> {
        this.logger.log(`Using Tidal boot file on disk at ${uri.fsPath}`);

        let doc: vscode.TextDocument;
        try {
            doc = await vscode.workspace.openTextDocument(uri);
            return doc.getText().split(/[\r\n]+/);
        } catch (e) {
            this.logger.error(`Failed to load boot commands from ${uri.fsPath}`);
            return null;
        }
    }

}
