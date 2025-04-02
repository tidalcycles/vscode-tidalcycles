import { commands, ExtensionContext } from 'vscode';
import { evalMultiCommand } from './evalMultiCommand';
import { quit } from './getRepl';

export const activate = (context: ExtensionContext) => {
    // let evalCommandRegistered = commands.registerCommand(
    //   'tcpure.eval',
    //   evalCommand
    // );

    let evalMultiCommandRegistered = commands.registerCommand(
        'tidal.evalMulti',
        evalMultiCommand
    );

    // context.subscriptions.push(evalCommandRegistered);
    context.subscriptions.push(evalMultiCommandRegistered);
};

export function deactivate() {
    quit();
}
