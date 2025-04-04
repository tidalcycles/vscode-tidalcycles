import { commands, ExtensionContext } from 'vscode';
import { quit } from './repl';
import { evalCommand, evalMultiCommand, hushCommand } from './evalCommands';
import { TidalLanguageHelpProvider } from './codehelp';
import { Config } from './config';
import { toggleMute1 } from './toggleMutesCommands';

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

  const toggleMute1CommandRegistered = commands.registerCommand(
    'tidal.toggleMute1',
    toggleMute1
  );

  context.subscriptions.push(
    evalCommandRegistered,
    evalMultiCommandRegistered,
    hushCommandRegistered,
    toggleMute1CommandRegistered,
    ...hoverAndMarkdownProvider.createCommands()
  );
};

export function deactivate() {
  quit();
}
