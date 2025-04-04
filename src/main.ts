import { commands, ExtensionContext } from 'vscode';
import { quit } from './repl';
import { evalCommand, evalMultiCommand, hushCommand } from './evalCommands';
import { TidalLanguageHelpProvider } from './codehelp';
import { Config } from './config';
import * as toggleMutes from './toggleMutesCommands';

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
    toggleMutes.toggleMute1
  );

  const toggleMute2CommandRegistered = commands.registerCommand(
    'tidal.toggleMute2',
    toggleMutes.toggleMute2
  );

  const toggleMute3CommandRegistered = commands.registerCommand(
    'tidal.toggleMute3',
    toggleMutes.toggleMute3
  );

  const toggleMute4CommandRegistered = commands.registerCommand(
    'tidal.toggleMute4',
    toggleMutes.toggleMute4
  );

  const toggleMute5CommandRegistered = commands.registerCommand(
    'tidal.toggleMute5',
    toggleMutes.toggleMute5
  );

  const toggleMute6CommandRegistered = commands.registerCommand(
    'tidal.toggleMute6',
    toggleMutes.toggleMute6
  );

  const toggleMute7CommandRegistered = commands.registerCommand(
    'tidal.toggleMute7',
    toggleMutes.toggleMute7
  );

  const toggleMute8CommandRegistered = commands.registerCommand(
    'tidal.toggleMute8',
    toggleMutes.toggleMute8
  );

  const toggleMute9CommandRegistered = commands.registerCommand(
    'tidal.toggleMute9',
    toggleMutes.toggleMute9
  );

  const toggleMute10CommandRegistered = commands.registerCommand(
    'tidal.toggleMute10',
    toggleMutes.toggleMute10
  );

  const toggleMute11CommandRegistered = commands.registerCommand(
    'tidal.toggleMute11',
    toggleMutes.toggleMute11
  );

  const toggleMute12CommandRegistered = commands.registerCommand(
    'tidal.toggleMute12',
    toggleMutes.toggleMute12
  );

  const toggleMute13CommandRegistered = commands.registerCommand(
    'tidal.toggleMute13',
    toggleMutes.toggleMute13
  );

  const toggleMute14CommandRegistered = commands.registerCommand(
    'tidal.toggleMute14',
    toggleMutes.toggleMute14
  );

  const toggleMute15CommandRegistered = commands.registerCommand(
    'tidal.toggleMute15',
    toggleMutes.toggleMute15
  );

  const toggleMute16CommandRegistered = commands.registerCommand(
    'tidal.toggleMute16',
    toggleMutes.toggleMute16
  );

  context.subscriptions.push(
    evalCommandRegistered,
    evalMultiCommandRegistered,
    hushCommandRegistered,
    toggleMute1CommandRegistered,
    toggleMute2CommandRegistered,
    toggleMute3CommandRegistered,
    toggleMute4CommandRegistered,
    toggleMute5CommandRegistered,
    toggleMute6CommandRegistered,
    toggleMute7CommandRegistered,
    toggleMute8CommandRegistered,
    toggleMute9CommandRegistered,
    toggleMute10CommandRegistered,
    toggleMute11CommandRegistered,
    toggleMute12CommandRegistered,
    toggleMute13CommandRegistered,
    toggleMute14CommandRegistered,
    toggleMute15CommandRegistered,
    toggleMute16CommandRegistered,
    ...hoverAndMarkdownProvider.createCommands()
  );
};

export function deactivate() {
  quit();
}
