import { ILogger } from './logging';
import { IGhci } from './ghci';
import * as vscode from 'vscode';

/**
 * Provides an interface to send instructions to the current Tidal instance.
 */
export interface ITidal {
    sendTidalExpression(expression: string): Promise<void>;
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
            uri = vscode.Uri.file(`${bootTidalPath}`);
        }

        let bootCommands: string[] = this.bootCommands;

        if (uri !== null) {
            let maybeBootCommands = await this.getBootCommandsFromFile(uri);
            if (maybeBootCommands !== null) {
                bootCommands = maybeBootCommands;
            }
        }

        for (const command of bootCommands) {
            this.ghci.writeLn(command);
        }

        this.tidalBooted = true;
        return true;
    }

    public async sendTidalExpression(expression: string) {
        if (!(await this.bootTidal())) {
            this.logger.error('Could not boot Tidal');
            return;
        }

        this.ghci.writeLn(':{');
        const splits = expression.split(/[\r\n]+/);
        for (let i = 0; i < splits.length; i++) {
            this.ghci.writeLn(splits[i]);
        }
        this.ghci.writeLn(':}');
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

    bootCommands: string[] = [
        ':set -XOverloadedStrings',
        ':set prompt ""',
        ':set prompt-cont ""',
        'import Sound.Tidal.Context',
        '-- total latency = oLatency + cFrameTimespan',
        'tidal <- startTidal (superdirtTarget {oLatency = 0.1, oAddress = "127.0.0.1", oPort = 57120}) (defaultConfig {cFrameTimespan = 1/20})',
        ':{',
        'let p = streamReplace tidal',
        '    hush = streamHush tidal',
        '    list = streamList tidal',
        '    mute = streamMute tidal',
        '    unmute = streamUnmute tidal',
        '    solo = streamSolo tidal',
        '    unsolo = streamUnsolo tidal',
        '    once = streamOnce tidal',
        '    asap = once',
        '    nudgeAll = streamNudgeAll tidal',
        '    all = streamAll tidal',
        '    resetCycles = streamResetCycles tidal',
        '    setcps = asap . cps',
        '    xfade i = transition tidal True (Sound.Tidal.Transition.xfadeIn 4) i',
        '    xfadeIn i t = transition tidal True (Sound.Tidal.Transition.xfadeIn t) i',
        '    histpan i t = transition tidal True (Sound.Tidal.Transition.histpan t) i',
        '    wait i t = transition tidal True (Sound.Tidal.Transition.wait t) i',
        '    waitT i f t = transition tidal True (Sound.Tidal.Transition.waitT f t) i',
        '    jump i = transition tidal True (Sound.Tidal.Transition.jump) i',
        '    jumpIn i t = transition tidal True (Sound.Tidal.Transition.jumpIn t) i',
        '    jumpIn\' i t = transition tidal True (Sound.Tidal.Transition.jumpIn\' t) i',
        '    jumpMod i t = transition tidal True (Sound.Tidal.Transition.jumpMod t) i',
        '    mortal i lifespan release = transition tidal True (Sound.Tidal.Transition.mortal lifespan release) i',
        '    interpolate i = transition tidal True (Sound.Tidal.Transition.interpolate) i',
        '    interpolateIn i t = transition tidal True (Sound.Tidal.Transition.interpolateIn t) i',
        '    clutch i = transition tidal True (Sound.Tidal.Transition.clutch) i',
        '    clutchIn i t = transition tidal True (Sound.Tidal.Transition.clutchIn t) i',
        '    anticipate i = transition tidal True (Sound.Tidal.Transition.anticipate) i',
        '    anticipateIn i t = transition tidal True (Sound.Tidal.Transition.anticipateIn t) i',
        '    forId i t = transition tidal False (Sound.Tidal.Transition.mortalOverlay t) i',
        '    d1 = p 1 . (|< orbit 0)',
        '    d2 = p 2 . (|< orbit 1)',
        '    d3 = p 3 . (|< orbit 2)', 
        '    d4 = p 4 . (|< orbit 3)',
        '    d5 = p 5 . (|< orbit 4)',
        '    d6 = p 6 . (|< orbit 5)',
        '    d7 = p 7 . (|< orbit 6)',
        '    d8 = p 8 . (|< orbit 7)',
        '    d9 = p 9 . (|< orbit 8)',
        '    d10 = p 10 . (|< orbit 9)',
        '    d11 = p 11 . (|< orbit 10)',
        '    d12 = p 12 . (|< orbit 11)',
        '    d13 = p 13',
        '    d14 = p 14',
        '    d15 = p 15',
        '    d16 = p 16',
        ':}',
        ':{',
        'let setI = streamSetI tidal',
        '    setF = streamSetF tidal',
        '    setS = streamSetS tidal',
        '    setR = streamSetI tidal',
        '    setB = streamSetB tidal',
        ':}',
        ':set prompt "tidal> "'
    ];
}
