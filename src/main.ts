import { commands, ExtensionContext } from 'vscode';
import { quit } from './getRepl';
import { evalCommand, evalMultiCommand, hushCommand } from './evalCommands';
import { TidalLanguageHelpProvider } from './codehelp';
import { Config } from './config';

export const activate = (context: ExtensionContext) => {
    const config = new Config();

    const hoverAndMarkdownProvider = new TidalLanguageHelpProvider(
        context.extensionPath,
        config
    );

    const evalCommandRegistered = commands.registerCommand(
        'tidal.eval',
        evalCommand
    );

    const evalMultiCommandRegistered = commands.registerCommand(
        'tidal.evalMulti',
        evalMultiCommand
    );

    const hushCommandRegistered = commands.registerCommand(
        'tidal.hush',
        hushCommand
    );

    context.subscriptions.push(
        evalCommandRegistered,
        evalMultiCommandRegistered,
        hushCommandRegistered,
        ...hoverAndMarkdownProvider.createCommands()
    );
};

export function deactivate() {
    quit();
}
